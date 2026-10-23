import { officialCatalog } from "../../../lib/official-catalog";
import { checkOfficialCatalog } from "../../../lib/official-source-check";
// ISR shares one bounded check per published version/window, rather than letting
// visitors generate arbitrary requests against government servers. Native export
// receives a clearly marked bundled response and never a fictitious online check.
export const dynamic = "force-static";
export const revalidate = 900;
export async function GET() {
  if (process.env.BRIDGEBACK_NATIVE === "1")
    return Response.json({
      schemaVersion: 1,
      catalogVersion: officialCatalog.version,
      mode: "bundled",
      checkedAt: null,
      checks: [],
    });
  return Response.json(await checkOfficialCatalog());
}
