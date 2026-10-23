"use client";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  FileCheck2,
  Files,
  GitBranch,
  Printer,
  Route,
  ShieldCheck,
} from "lucide-react";
import { documentTypes } from "../lib/programs";
import {
  findRescueRoute,
  type PlannerInput,
  type PlanAnalysis,
} from "../lib/planner";
import { Explain } from "./Explain";

export type DocumentsProps = {
  input: PlannerInput;
  analysis: PlanAnalysis;
  onDocument: (id: string, available: boolean) => void;
  onUnavailable: (id: string, value: boolean) => void;
  onExport: () => void;
};

export function Documents({
  input,
  analysis,
  onDocument,
  onUnavailable,
  onExport,
}: DocumentsProps) {
  const [view, setView] = useState<"inventory" | "programs">("inventory");
  const rescue = useMemo(() => findRescueRoute(input), [input]);
  const shared = analysis.documents.filter(
    (document) => document.programIds.length > 1,
  );
  const programName = (id: string) =>
    analysis.programs.find((program) => program.id === id)?.name ?? id;
  const documentName = (id: string) =>
    documentTypes.find((document) => document.id === id)?.name ?? id;
  return (
    <div className="documents-workspace">
      <section className="pathfinder-intro">
        <div>
          <div className="eyebrow">
            <Files size={15} /> DOCUMENT READINESS
          </div>
          <h1>Prepare once. Open more routes.</h1>
          <p>Know where a document can help—and exactly where it cannot.</p>
        </div>
        <div className="document-toolbar">
          <button className="button secondary" onClick={onExport}>
            <FileCheck2 size={16} />
            Export preparation packet
          </button>
          <button className="button secondary" onClick={() => window.print()}>
            <Printer size={16} />
            Print
          </button>
        </div>
      </section>
      <div className="document-privacy">
        <ShieldCheck size={20} />
        <p>
          Availability only. Keep the actual documents somewhere safe. No
          uploads, Social Security numbers, or sensitive document contents.
        </p>
      </div>
      {!analysis.programs.length ? (
        <section className="card empty">
          <Files size={30} />
          <h2>Add a plan to see what you can reuse.</h2>
          <p>
            Discover has clearly labeled fictional plans for practicing document
            preparation.
          </p>
        </section>
      ) : (
        <>
          <section className="reuse-overview">
            <div>
              <span className="eyebrow">DOCUMENT REUSE OPTIMIZATION</span>
              <h2>
                {shared.length
                  ? `${shared.length} document ${shared.length === 1 ? "type can" : "types can"} contribute to more than one plan.`
                  : "Each document has a specific purpose."}
              </h2>
              <p>
                Matches come from each program’s explicit acceptance list.
                Sharing a document type does not imply shared eligibility.
              </p>
            </div>
            <div className="reuse-chips">
              {shared.map((document) => (
                <span key={document.id}>
                  <Files size={15} />
                  <strong>{document.name}</strong>
                  <span>{document.programIds.length} plans</span>
                </span>
              ))}
            </div>
          </section>
          <section className="card rescue-panel" aria-labelledby="rescue-title">
            <div className="pf-section-header">
              <div>
                <span className="eyebrow">ROUTE RESCUE</span>
                <h2 id="rescue-title">When a document is out of reach.</h2>
              </div>
              <Route size={25} aria-hidden="true" />
            </div>
            <p>
              Mark a document you cannot obtain below. Route Rescue finds the
              smallest remaining set of accepted documents for your selected
              plans.
            </p>
            <div className="rescue-result">
              <span
                className={`pf-status ${rescue.feasible ? "available" : "blocked"}`}
              >
                {rescue.feasible
                  ? "Accepted route found"
                  : "Provider clarification needed"}
              </span>
              <p>{rescue.explanation.summary}</p>
              {rescue.documentIds.length > 0 && (
                <ol>
                  {rescue.documentIds.map((id) => (
                    <li key={id}>
                      <span>{documentName(id)}</span>
                      <button
                        className="text-button"
                        onClick={() => onDocument(id, true)}
                      >
                        I have this <Check size={14} />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              {rescue.impossibleRequirements.length > 0 && (
                <div className="rescue-impossible">
                  <strong>No accepted route remains for:</strong>
                  <ul>
                    {rescue.impossibleRequirements.map((id) => (
                      <li key={id}>
                        {analysis.nodes.find((node) => node.id === id)?.name ??
                          id}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Ask the provider about accepted alternatives. BridgeBack
                    will not invent a substitute.
                  </p>
                </div>
              )}
              <Explain
                explanation={rescue.explanation}
                label="How was this route chosen?"
              />
            </div>
          </section>
          <section className="document-inventory">
            <div className="pf-section-header">
              <div>
                <span className="eyebrow">ONE SHARED INVENTORY</span>
                <h2>Your document workspace</h2>
              </div>
              <div className="segmented">
                <button
                  aria-pressed={view === "inventory"}
                  onClick={() => setView("inventory")}
                >
                  All documents
                </button>
                <button
                  aria-pressed={view === "programs"}
                  onClick={() => setView("programs")}
                >
                  By application
                </button>
              </div>
            </div>
            {view === "inventory" ? (
              <div className="document-card-grid">
                {analysis.documents.map((document) => {
                  const available = !!input.documents[document.id];
                  const unavailable = input.unavailable.includes(document.id);
                  const definition = documentTypes.find(
                    (item) => item.id === document.id,
                  );
                  return (
                    <article
                      className={`card document-ready-card ${available ? "is-available" : ""}`}
                      key={document.id}
                    >
                      <div className="document-card-top">
                        <span className="document-symbol">
                          <FileCheck2 size={22} />
                        </span>
                        <span
                          className={`pf-status ${available ? "complete" : unavailable ? "blocked" : "available"}`}
                        >
                          {available
                            ? "Available"
                            : unavailable
                              ? "Out of reach"
                              : document.needed
                                ? "Needed for a route"
                                : "Optional alternative"}
                        </span>
                      </div>
                      <h3>{document.name}</h3>
                      <p>{definition?.description}</p>
                      <label className="document-control">
                        <input
                          type="checkbox"
                          checked={available}
                          onChange={(event) =>
                            onDocument(document.id, event.target.checked)
                          }
                          aria-label={`I have ${document.name}`}
                        />
                        <span>I have this available</span>
                      </label>
                      <label className="document-control unavailable-control">
                        <input
                          type="checkbox"
                          checked={unavailable}
                          onChange={(event) =>
                            onUnavailable(document.id, event.target.checked)
                          }
                          aria-label={`I cannot obtain ${document.name}`}
                        />
                        <span>I cannot obtain this right now</span>
                      </label>
                      <details
                        className="document-acceptance"
                        open={document.programIds.length > 1}
                      >
                        <summary>
                          <GitBranch size={15} />
                          Acceptance across {
                            analysis.programs.length
                          } selected{" "}
                          {analysis.programs.length === 1 ? "plan" : "plans"}
                        </summary>
                        <div>
                          {document.acceptance.map((acceptance, index) => (
                            <div
                              className={`acceptance-row ${acceptance.accepted ? "accepted" : "rejected"}`}
                              key={`${acceptance.programId}-${acceptance.requirementName}-${index}`}
                            >
                              <span>
                                {acceptance.accepted ? (
                                  <Check size={14} />
                                ) : (
                                  <span aria-hidden="true">—</span>
                                )}
                              </span>
                              <div>
                                <strong>
                                  {programName(acceptance.programId)}
                                </strong>
                                <p>
                                  {acceptance.accepted
                                    ? `Accepted for ${acceptance.requirementName.toLowerCase()}`
                                    : `Not accepted for ${acceptance.requirementName.toLowerCase()}`}
                                </p>
                                <small>
                                  {acceptance.source.kind === "fictional"
                                    ? "Fictional acceptance rule"
                                    : acceptance.source.label}
                                </small>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                      {document.programIds.length > 1 && (
                        <div className="reuse-footnote">
                          <Files size={14} />
                          One availability update recalculates{" "}
                          {document.programIds.length} plans.
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="documents-by-program">
                {analysis.programs.map((program) => (
                  <section
                    className="card program-document-group"
                    key={program.id}
                  >
                    <div className="pf-section-header">
                      <div>
                        <span className="eyebrow">FICTIONAL APPLICATION</span>
                        <h3>{program.name}</h3>
                      </div>
                      <span className="pf-status">
                        {program.readiness}% prepared
                      </span>
                    </div>
                    <p>
                      Only document routes explicitly accepted by this plan
                      appear here. Alternative routes are not additional
                      requirements.
                    </p>
                    {analysis.documents
                      .filter((document) =>
                        document.acceptance.some(
                          (acceptance) =>
                            acceptance.programId === program.id &&
                            acceptance.accepted,
                        ),
                      )
                      .map((document) => (
                        <label
                          className="program-document-row"
                          key={document.id}
                        >
                          <input
                            type="checkbox"
                            checked={!!input.documents[document.id]}
                            onChange={(event) =>
                              onDocument(document.id, event.target.checked)
                            }
                            aria-label={`${program.name}: I have ${document.name}`}
                          />
                          <span>
                            <strong>{document.name}</strong>
                            <small>
                              {document.acceptance
                                .filter(
                                  (acceptance) =>
                                    acceptance.programId === program.id &&
                                    acceptance.accepted,
                                )
                                .map((acceptance) => acceptance.requirementName)
                                .join(" · ")}
                              {document.programIds.length > 1
                                ? ` · reusable in ${document.programIds.length} plans`
                                : ""}
                            </small>
                          </span>
                          <ArrowRight size={15} />
                        </label>
                      ))}
                  </section>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
