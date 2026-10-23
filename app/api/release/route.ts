import { officialCatalog } from "../../../lib/official-catalog";
export const dynamic = "force-static";
// Public build provenance only. Never serialize the environment or user state.
export function GET() {
  const candidate = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
  return Response.json({
    schemaVersion: 1,
    revision: candidate && /^[a-f0-9]{40}$/.test(candidate) ? candidate : null,
    workspaceVersion: 4,
    catalogVersion: officialCatalog.version,
    target: process.env.BRIDGEBACK_NATIVE === "1" ? "native-bundle" : "web",
    features: ["guided-contact-workflows"],
  });
}
