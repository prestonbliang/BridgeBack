"use client";
import { useEffect, useRef, useState } from "react";
import { initialWorkspace, type Workspace } from "../lib/workspace";
import {
  openWorkspace,
  saveWorkspace,
  deleteWorkspace,
  WorkspaceConflictError,
  type WorkspaceSession,
} from "../lib/store";

export function useWorkspace() {
  const [workspace, replaceWorkspace] = useState<Workspace>(() =>
    initialWorkspace(),
  );
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [canSave, setCanSave] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Opening local workspace");
  const generation = useRef(0);
  const session = useRef<WorkspaceSession | null>(null);
  const saved = useRef<Workspace | null>(null);
  const dirty = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);

  function setWorkspace(value: Workspace) {
    generation.current++;
    dirty.current = true;
    replaceWorkspace(value);
  }

  useEffect(() => {
    let alive = true;
    async function refresh(initial = false) {
      const request = generation.current;
      try {
        const opened = await openWorkspace();
        if (!alive || request !== generation.current || dirty.current) return;
        const value = opened.workspace ?? initialWorkspace();
        session.current = opened.session;
        saved.current = value;
        replaceWorkspace(value);
        setCanSave(true);
        setSaveStatus(
          initial ? "Saved on this device" : "Synced with another tab",
        );
      } catch {
        if (alive) {
          setStorageError(
            "Saved information could not be read. It has been preserved. You can use this session without saving, or explicitly reset local data in Settings.",
          );
          setCanSave(false);
          setSaveStatus("Session only");
        }
      } finally {
        if (alive && initial) setReady(true);
      }
    }
    // Messages contain no household data. The transaction revision is authoritative
    // even when broadcasts are unavailable, delayed or missed by a tab.
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("bridgeback-workspace");
      channel.current.onmessage = () => {
        if (!dirty.current) void refresh();
      };
    }
    const visible = () => {
      if (document.visibilityState === "visible" && !dirty.current)
        void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    void refresh(true);
    return () => {
      alive = false;
      channel.current?.close();
      channel.current = null;
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  useEffect(() => {
    if (!ready || !canSave || workspace === saved.current || !session.current)
      return;
    const request = generation.current;
    setSaveStatus("Saving locally…");
    saveWorkspace(workspace, session.current)
      .then(() => {
        channel.current?.postMessage("changed");
        if (request === generation.current) {
          saved.current = workspace;
          dirty.current = false;
          setSaveStatus("Saved on this device");
        }
      })
      .catch(async (error: unknown) => {
        if (request !== generation.current) return;
        if (error instanceof WorkspaceConflictError) {
          try {
            const opened = await openWorkspace();
            if (request !== generation.current) return;
            const value = opened.workspace ?? initialWorkspace();
            session.current = opened.session;
            saved.current = value;
            dirty.current = false;
            replaceWorkspace(value);
            setStorageError(error.message);
            setSaveStatus("Synced with another tab");
          } catch {
            setStorageError(
              "Another tab changed your data, and its latest version could not be read. Export this session before reloading. No conflicting change was saved.",
            );
            setCanSave(false);
            setSaveStatus("Session only");
          }
          return;
        }
        setStorageError(
          "Local saving failed. Export your progress before leaving. Your existing saved record has not been intentionally cleared.",
        );
        setSaveStatus("Changes not saved");
      });
  }, [workspace, ready, canSave]);

  async function reset() {
    // Drain pending writes, then advance the revision so other tabs cannot restore
    // any snapshot from before this explicit deletion request.
    generation.current++;
    const deletedSession = await deleteWorkspace();
    const value = initialWorkspace();
    session.current = deletedSession;
    saved.current = value;
    dirty.current = false;
    replaceWorkspace(value);
    setStorageError("");
    setCanSave(true);
    setSaveStatus("Local data deleted");
    channel.current?.postMessage("changed");
  }
  return { workspace, setWorkspace, ready, storageError, saveStatus, reset };
}
