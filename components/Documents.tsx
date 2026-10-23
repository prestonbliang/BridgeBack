"use client";
import { useMemo, useState, type ReactNode } from "react";
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
import type { OfficialPlan } from "../lib/official-plans";
import { documentTypes } from "../lib/programs";
import {
  findRescueRoute,
  type PlannerInput,
  type PlanAnalysis,
} from "../lib/planner";
import { Explain } from "./Explain";
import { useNativeApp } from "../hooks/useNativeApp";

export type DocumentsProps = {
  input: PlannerInput & { officialPlans?: OfficialPlan[] };
  onPath?: () => void;
  officialContent?: ReactNode;
  analysis: PlanAnalysis;
  onDocument: (id: string, available: boolean) => void;
  onUnavailable: (id: string, value: boolean) => void;
  onExport: () => void;
  onSupport: (id: string) => void;
};

export function Documents({
  input,
  analysis,
  onDocument,
  onUnavailable,
  onExport,
  onSupport,
  onPath,
  officialContent,
}: DocumentsProps) {
  const native = useNativeApp();
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
            <Files size={15} /> Document checklist
          </div>
          <h1>Your documents</h1>
          <p>
            Keep track of the papers you have. The same document may help with
            more than one plan, but each plan decides what it accepts.
          </p>
        </div>
        <div className="document-toolbar">
          <button className="button secondary" onClick={onExport}>
            <FileCheck2 size={16} />
            Export preparation packet
          </button>
          {!native && (
            <button className="button secondary" onClick={() => window.print()}>
              <Printer size={16} />
              Print
            </button>
          )}
        </div>
      </section>
      {native && (
        <p className="helper-text">
          Export opens the iPhone or iPad share sheet. Choose Save to Files,
          Print where offered, or another destination. You control what leaves
          this app.
        </p>
      )}
      <div className="document-privacy">
        <ShieldCheck size={20} />
        <p>
          Just check whether you have a document. Keep actual papers and files
          somewhere safe. Do not enter Social Security numbers or document
          contents here.
        </p>
      </div>
      {officialContent}
      {input.officialPlans?.length && analysis.programs.length > 0 ? (
        <p className="notice">
          The inventory below belongs to fictional practice plans. It does not
          establish which documents a real agency accepts.
        </p>
      ) : null}
      {!analysis.programs.length ? (
        <section className="card empty">
          <Files size={30} />
          <h2>
            {input.officialPlans?.length
              ? "Ask the real provider for its document checklist."
              : "Choose a plan before gathering documents."}
          </h2>
          <p>
            Real-program follow-up plans do not borrow the practice examples’
            document rules. The reviewed County pages do not supply a complete
            accepted-document list for your case. Ask which records and
            alternatives the agency accepts; keep the actual documents with you.
          </p>
          {input.officialPlans?.length && onPath ? (
            <button className="button secondary" onClick={onPath}>
              Open real-program checklist
            </button>
          ) : null}
          <p className="fine-print">
            The fictional demo offers a separate document inventory for learning
            how alternatives work.
          </p>
        </section>
      ) : (
        <>
          <section className="reuse-overview">
            <div>
              <span className="eyebrow">
                Documents that help with several plans
              </span>
              <h2>
                {shared.length
                  ? `${shared.length} document ${shared.length === 1 ? "type can" : "types can"} contribute to more than one plan.`
                  : "Each document has a specific purpose."}
              </h2>
              <p>
                We only reuse a document where a plan lists it as accepted.
                Having the right document does not mean you qualify for that
                program.
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
          <section className="document-inventory">
            <div className="pf-section-header">
              <div>
                <span className="eyebrow">Keep this list up to date</span>
                <h2>What you have and what’s missing</h2>
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
                            ? "You have this"
                            : unavailable
                              ? "Cannot get this right now"
                              : document.needed
                                ? "Still needed"
                                : "Another option"}
                        </span>
                      </div>
                      <h3>{document.name}</h3>
                      <p>{definition?.description}</p>
                      <button
                        className="text-button"
                        aria-label={`Get help with ${document.name}`}
                        onClick={() => onSupport(`doc:${document.id}`)}
                      >
                        Help getting this document{" "}
                        <ArrowRight size={14} aria-hidden="true" />
                      </button>
                      <p className="helper-text">
                        Listed by:{" "}
                        {document.programIds.length
                          ? document.programIds.map(programName).join(", ")
                          : "none of your selected plans"}
                        .
                      </p>
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
                      {unavailable && (
                        <button
                          className="text-button"
                          onClick={() =>
                            window.document
                              .querySelector(".rescue-panel")
                              ?.scrollIntoView({
                                block: "start",
                                behavior: "instant",
                              })
                          }
                        >
                          See listed alternatives{" "}
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      )}
                      <details className="document-acceptance">
                        <summary>
                          <GitBranch size={15} />
                          Where it counts in your {
                            analysis.programs.length
                          }{" "}
                          selected{" "}
                          {analysis.programs.length === 1 ? "plan" : "plans"}
                        </summary>
                        <div>
                          <p className="helper-text">
                            This document only counts for the requirement named
                            below. For example, income proof does not also prove
                            your identity.
                          </p>
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
                                    ? `Counts toward ${acceptance.requirementName.toLowerCase()}`
                                    : `Does not cover ${acceptance.requirementName.toLowerCase()}`}
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
          <section className="card rescue-panel" aria-labelledby="rescue-title">
            <div className="pf-section-header">
              <div>
                <span className="eyebrow">Route Rescue</span>
                <h2 id="rescue-title">Can’t get a document?</h2>
              </div>
              <Route size={25} aria-hidden="true" />
            </div>
            <p>
              Can’t get one of these papers? Tick “I cannot obtain this right
              now” on that document. We’ll check whether your selected plans
              allow something else instead.
            </p>
            <div className="rescue-result">
              <span
                className={`pf-status ${rescue.feasible ? "available" : "blocked"}`}
              >
                {rescue.feasible
                  ? "An alternative is available"
                  : "Ask the provider about another option"}
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
                    There is no substitute listed in these rules. For a real
                    program, ask its provider what else you can use. We cannot
                    assume another document will count.
                  </p>
                </div>
              )}
              <Explain
                explanation={rescue.explanation}
                label="How was this route chosen?"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
