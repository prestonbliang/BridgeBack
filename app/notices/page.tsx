import type { Metadata } from "next";
import Link from "next/link";
import notices from "../../lib/dependency-notices.json";
export const metadata: Metadata = {
  title: "BridgeBack open-source acknowledgments",
};
export default function Notices() {
  return (
    <main className="public-policy">
      <Link href="/">← Return to BridgeBack</Link>
      <p className="section-label">Open-source acknowledgments</p>
      <h1>Built with open-source software.</h1>
      <p>
        These libraries and readable fonts help BridgeBack work on your device.
        Their notices are included here and remain available offline.
      </p>
      {notices.entries.map((entry) => (
        <details
          className="license-entry"
          key={`${entry.name}@${entry.version}`}
        >
          <summary>
            {entry.name} · {entry.version} · {entry.license}
          </summary>
          <pre>{entry.text}</pre>
          {entry.source && (
            <a href={entry.source} target="_blank" rel="noreferrer noopener">
              Original distribution
            </a>
          )}
        </details>
      ))}
    </main>
  );
}
