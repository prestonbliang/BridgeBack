import Dexie, { Table } from "dexie";
import { z } from "zod";
import {
  legacyWorkspaceSchema,
  migrateWorkspace,
  workspaceSchema,
  type Workspace,
} from "./workspace";

// Kept for compatibility with the original workspace and its independently tested API.
export const stateSchema = legacyWorkspaceSchema;
export type SavedState = z.infer<typeof stateSchema>;
class Store extends Dexie {
  state!: Table<SavedState | Workspace, string>;
  metadata!: Table<{ id: string; revision: number }, string>;
  constructor() {
    super("bridgeback");
    this.version(1).stores({ state: "id" });
    this.version(2).stores({ state: "id", metadata: "id" });
  }
}
export const db = new Store();
export type WorkspaceSession = { revision: number };
export class WorkspaceConflictError extends Error {
  constructor() {
    super(
      "Another tab changed this workspace. The latest saved version has been loaded; review it and repeat your last change if needed.",
    );
    this.name = "WorkspaceConflictError";
  }
}
let writeQueue: Promise<unknown> = Promise.resolve();
function queued<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.catch(() => undefined).then(operation);
  writeQueue = next.catch(() => undefined);
  return next;
}
export async function saveState(value: SavedState) {
  const snapshot = stateSchema.parse(value);
  await queued(() => db.state.put(snapshot));
}
export async function loadState() {
  await writeQueue;
  const value = await db.state.get("current");
  return value ? stateSchema.parse(value) : null;
}
export async function saveWorkspace(
  value: Workspace,
  session?: WorkspaceSession,
) {
  // Parse before enqueuing to detach the snapshot from later caller mutations.
  const snapshot = workspaceSchema.parse(value);
  await queued(async () => {
    const nextRevision = await db.transaction(
      "rw",
      db.state,
      db.metadata,
      async () => {
        const revision = (await db.metadata.get("workspace"))?.revision ?? 0;
        if (session && session.revision !== revision)
          throw new WorkspaceConflictError();
        await db.state.put(snapshot);
        await db.metadata.put({ id: "workspace", revision: revision + 1 });
        return revision + 1;
      },
    );
    if (session) session.revision = nextRevision;
  });
}
export async function openWorkspace(): Promise<{
  workspace: Workspace | null;
  session: WorkspaceSession;
}> {
  await writeQueue;
  return db.transaction("r", db.state, db.metadata, async () => {
    const value: unknown = await db.state.get("current");
    const revision = (await db.metadata.get("workspace"))?.revision ?? 0;
    // Migration is read-only until the caller explicitly saves the successfully loaded result.
    return {
      workspace: value ? migrateWorkspace(value) : null,
      session: { revision },
    };
  });
}
export async function loadWorkspace(): Promise<Workspace | null> {
  return (await openWorkspace()).workspace;
}
export async function deleteWorkspace(
  session?: WorkspaceSession,
): Promise<WorkspaceSession> {
  // Draining older writes before deletion prevents a pending save resurrecting deleted data.
  return queued(async () => {
    const nextRevision = await db.transaction(
      "rw",
      db.state,
      db.metadata,
      async () => {
        const revision = (await db.metadata.get("workspace"))?.revision ?? 0;
        if (session && session.revision !== revision)
          throw new WorkspaceConflictError();
        await db.state.clear();
        // Keep only a non-personal counter so stale tabs cannot resurrect deleted data.
        await db.metadata.put({ id: "workspace", revision: revision + 1 });
        return revision + 1;
      },
    );
    if (session) session.revision = nextRevision;
    return { revision: nextRevision };
  });
}
