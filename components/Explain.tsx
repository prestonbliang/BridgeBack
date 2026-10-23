"use client";
import { ArrowUpRight, Info, ShieldCheck } from "lucide-react";
import type { Explanation } from "../lib/planner";

/** The engine supplies every claim; this component only renders its provenance. */
export function Explain({
  explanation,
  label = "Why this?",
}: {
  explanation: Explanation;
  label?: string;
}) {
  return (
    <details className="explain-panel">
      <summary>
        <Info size={15} aria-hidden="true" />
        {label}
      </summary>
      <div className="explain-content">
        <p className="explain-summary">{explanation.summary}</p>
        {explanation.facts.length > 0 && (
          <section>
            <h4>What we checked</h4>
            <ul>
              {explanation.facts.map((fact, index) => (
                <li key={`${index}-${fact}`}>{fact}</li>
              ))}
            </ul>
          </section>
        )}
        {explanation.missing.length > 0 && (
          <section>
            <h4>What’s still missing</h4>
            <ul>
              {explanation.missing.map((fact, index) => (
                <li key={`${index}-${fact}`}>{fact}</li>
              ))}
            </ul>
          </section>
        )}
        {explanation.assumptions.length > 0 && (
          <section>
            <h4>What to keep in mind</h4>
            <ul>
              {explanation.assumptions.map((fact, index) => (
                <li key={`${index}-${fact}`}>{fact}</li>
              ))}
            </ul>
          </section>
        )}
        {explanation.changesIf.length > 0 && (
          <section>
            <h4>When this answer could change</h4>
            <ul>
              {explanation.changesIf.map((fact, index) => (
                <li key={`${index}-${fact}`}>{fact}</li>
              ))}
            </ul>
          </section>
        )}
        {explanation.sources.length > 0 && (
          <section className="explain-sources">
            <h4>
              <ShieldCheck size={14} aria-hidden="true" />
              Where these rules come from
            </h4>
            {explanation.sources.map((source, index) => (
              <div key={`${source.label}-${index}`}>
                <strong>
                  {source.kind === "fictional"
                    ? "Made-up practice rule"
                    : "Published source"}
                </strong>
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.label}
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                ) : (
                  <span>{source.label}</span>
                )}
                <small>
                  {source.verifiedAt
                    ? `Verified ${source.verifiedAt}`
                    : source.kind === "fictional"
                      ? "Practice data; not a real program requirement."
                      : "Verification date unavailable; confirm with the provider."}
                </small>
              </div>
            ))}
          </section>
        )}
      </div>
    </details>
  );
}
