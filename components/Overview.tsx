"use client";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  CircleHelp,
  FileText,
  FolderOpen,
  LockKeyhole,
  MapPin,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { PlanAnalysis, Simulation } from "../lib/planner";
import { programs } from "../lib/programs";
import { Explain } from "./Explain";
import { Progress } from "./ui";
export function Overview({
  analysis,
  example,
  resume,
  onStart,
  onDemo,
  onDiscover,
  onPath,
  onDocuments,
}: {
  analysis: PlanAnalysis;
  example: Simulation;
  resume: boolean;
  onStart: () => void;
  onDemo: () => void;
  onDiscover: () => void;
  onPath: () => void;
  onDocuments: () => void;
}) {
  const [preview, setPreview] = useState(false);
  const hasPlan = analysis.programs.length > 0;
  const next = analysis.actions[0];
  const sample = preview ? example.after : example.before;
  const nextNode = analysis.nodes.find((node) => node.id === next?.id);
  return (
    <div className="overview">
      <header className="overview-heading">
        <div>
          <span className="service-location">
            <MapPin size={15} aria-hidden="true" />
            Starting in San Diego County
          </span>
          <h1>
            {hasPlan
              ? "Here’s what you can do next."
              : "Get your housing paperwork ready."}
          </h1>
          <p>
            {hasPlan
              ? "Your checklist uses the documents you have and the steps you’ve finished. You can change either at any time."
              : "Work out what to gather, what’s missing, and which step to take first. You don’t need to fill everything in today."}
          </p>
        </div>
        <span className="private-label">
          <ShieldCheck size={17} aria-hidden="true" />
          No account needed
        </span>
      </header>
      <div className="desk-layout">
        <section className={`desk-main ${hasPlan ? "with-next-action" : ""}`}>
          <div className="folder-tab">
            <FolderOpen size={18} aria-hidden="true" />
            {hasPlan ? "Your next step" : "Getting started"}
          </div>
          {hasPlan ? (
            <div className="desk-content">
              <span className="task-type">
                {next?.id.startsWith("doc:")
                  ? "A document to gather"
                  : "A task to finish"}
              </span>
              <h2>
                {next?.name ??
                  (analysis.readiness === 100
                    ? "Your preparation steps are finished."
                    : "A missing document needs another option.")}
              </h2>
              <p>
                {nextNode?.description ??
                  (analysis.readiness === 100
                    ? "Download your checklist, then ask the provider how to apply. Nothing has been sent from BridgeBack."
                    : "Some steps still need documents marked as unavailable. Open Documents to check the listed alternatives. If none work, a real provider would need to tell you what else it accepts.")}
              </p>
              {next && (
                <p className="next-impact">
                  {next.unlockedIds.length
                    ? `Getting this ready lets you start ${next.unlockedIds.length} more ${next.unlockedIds.length === 1 ? "step" : "steps"}.`
                    : "You can work on this now. The things it needs are already ready."}
                </p>
              )}
              <button
                className="button primary"
                onClick={
                  !next && analysis.readiness < 100 ? onDocuments : onPath
                }
              >
                {next
                  ? "See this step"
                  : analysis.readiness === 100
                    ? "Review my checklist"
                    : "Check missing documents"}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              {next && (
                <Explain
                  explanation={next.explanation}
                  label="Why start with this?"
                />
              )}
              <div className="desk-reminder">
                <CircleHelp size={17} aria-hidden="true" />
                <p>
                  A check mark means prepared. It does not mean you have applied
                  or been approved.
                </p>
              </div>
            </div>
          ) : (
            <div className="desk-content">
              <h2>You can start with what you already have.</h2>
              <p>
                Choose a sample plan, tell us which papers you have, and get a
                checklist that explains what to do next.
              </p>
              <ol className="getting-started">
                <li>
                  <strong>Pick a plan</strong>
                  <span>
                    Try made-up programs first. Real service links are in Find
                    help.
                  </span>
                </li>
                <li>
                  <strong>Check off your documents</strong>
                  <span>
                    Just tell us what you have. Keep the actual files with you.
                  </span>
                </li>
                <li>
                  <strong>See your next step</strong>
                  <span>
                    If something is missing, we’ll show what else that plan
                    accepts.
                  </span>
                </li>
              </ol>
              <div className="desk-actions">
                <button className="button primary" onClick={onStart}>
                  {resume
                    ? "Continue my checklist setup"
                    : "Help me get started"}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <button className="text-button" onClick={onDemo}>
                  <Play size={16} aria-hidden="true" />
                  Try a guided example
                </button>
              </div>
              <p className="desk-footnote">
                You can skip questions. Your answers stay in this browser.
              </p>
            </div>
          )}
        </section>
        {hasPlan ? (
          <aside className="checklist-progress" aria-label="Checklist progress">
            <span className="section-label">Your checklist so far</span>
            <div className="progress-count">
              <strong>{analysis.complete}</strong>
              <span>
                of {analysis.total}
                <br />
                steps finished
              </span>
            </div>
            <Progress
              value={analysis.readiness}
              label="Preparation steps finished"
            />
            <p>
              {analysis.complete} of {analysis.total} steps finished
            </p>
            <details className="progress-explainer">
              <summary>What does this percentage mean?</summary>
              <p>
                We count the preparation steps in your selected plans. A shared
                document may finish a step in more than one plan. This number is
                not your chance of getting assistance.
              </p>
            </details>
            <div className="progress-places">
              <button onClick={onPath}>
                <span>
                  <strong>{analysis.actions.length}</strong> steps you can do
                  now
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button onClick={onDocuments}>
                <span>
                  <strong>
                    {analysis.documents.filter((d) => d.needed).length}
                  </strong>{" "}
                  document options to review
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </aside>
        ) : (
          <aside className="worked-example" aria-label="Try a sample checklist">
            <span className="section-label">Why one document can matter</span>
            <h2>Two forms. One missing pay stub.</h2>
            <p>
              This made-up applicant already has ID and proof of address. Both
              forms still need income proof.
            </p>
            <div className={`sample-paper ${preview ? "paper-ready" : ""}`}>
              <FileText size={24} aria-hidden="true" />
              <div>
                <strong>Pay stub</strong>
                <span>
                  {preview
                    ? "Marked as available in this example"
                    : "Not available yet"}
                </span>
              </div>
              {preview && <Check size={20} aria-hidden="true" />}
            </div>
            <div className="sample-connections" aria-hidden="true" />
            <div className="sample-form-list">
              {sample.programs.map((program) => (
                <div key={program.id}>
                  {sample.statuses[`${program.id}:form`] === "available" ? (
                    <Check size={17} aria-hidden="true" />
                  ) : (
                    <LockKeyhole size={16} aria-hidden="true" />
                  )}
                  <span>
                    <strong>
                      {programs.find((item) => item.id === program.id)
                        ?.shortName ?? program.name}{" "}
                      form
                    </strong>
                    <small>
                      {sample.statuses[`${program.id}:form`] === "available"
                        ? "Ready to work on"
                        : "Waiting for income proof"}
                    </small>
                  </span>
                </div>
              ))}
            </div>
            <button
              className="button secondary"
              aria-pressed={preview}
              onClick={() => setPreview(!preview)}
            >
              {preview ? (
                <RotateCcw size={16} aria-hidden="true" />
              ) : (
                <Play size={16} aria-hidden="true" />
              )}
              {preview ? "Reset the example" : "See what a pay stub changes"}
            </button>
            <p className="sample-result" role="status">
              {preview
                ? `Now ${example.newlyAvailable.length} more steps are ready to start. Checklist progress changes from ${example.before.readiness}% to ${example.after.readiness}%.`
                : "Try it here. This does not change your own checklist."}
            </p>
            <span className="sample-disclaimer">
              Example only. These programs and their rules are made up.
            </span>
          </aside>
        )}
      </div>
      {hasPlan ? (
        <section className="overview-plans">
          <div className="section-heading">
            <div>
              <h2>Your plans</h2>
              <p>Each plan keeps its own document rules.</p>
            </div>
            <button className="text-button" onClick={onDiscover}>
              Add or remove plans
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          {analysis.programs.map((program) => (
            <article key={program.id} className="plan-row">
              <div>
                <span className="sample-label">Practice plan</span>
                <h3>{program.name}</h3>
                <p>{program.screening.result} based on made-up criteria.</p>
              </div>
              <Progress
                value={program.readiness}
                label={`${program.complete} of ${program.total} steps finished`}
              />
              <button className="button secondary" onClick={onPath}>
                View checklist
              </button>
            </article>
          ))}
        </section>
      ) : (
        <section className="real-help-strip">
          <Search size={26} aria-hidden="true" />
          <div>
            <h2>Looking for an actual housing service?</h2>
            <p>
              Find links to San Diego housing organizations. Check their
              websites for current programs and application instructions.
            </p>
          </div>
          <button className="button secondary" onClick={onDiscover}>
            Find housing help
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </section>
      )}
      <div className="accuracy-note">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>
          Current checklists use fictional programs. Official service links are
          separate and have not been checked for current openings. BridgeBack
          does not submit applications or promise housing.
        </p>
      </div>
    </div>
  );
}
