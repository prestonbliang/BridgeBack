"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  LifeBuoy,
  Phone,
  Clock3,
} from "lucide-react";
import { type Workspace, type WorkspaceAction } from "../lib/workspace";
import { type PlanAnalysis } from "../lib/planner";
import { buildSupportPlan, supportTargetName } from "../lib/support";
import { supportReasons } from "../lib/support-model";
import { supportResources } from "../lib/support-resources";
import { documentTypes } from "../lib/programs";
import { PageHeading } from "./ui";
import { CounselorDirectory } from "./CounselorDirectory";
import { ResourceCard, ContactPlan, LearningTools } from "./SupportTools";
export type SupportProps = {
  state: Workspace;
  analysis: PlanAnalysis;
  initialTarget: string | null;
  initialSection?: "step" | "person";
  onAction: (action: WorkspaceAction) => void;
  onNavigate: (
    tab: "PathFinder" | "Documents" | "Settings" | "Discover",
  ) => void;
  onReopen: (id: string) => void;
};
export function Support({
  state,
  analysis,
  initialTarget,
  initialSection = "step",
  onAction,
  onNavigate,
  onReopen,
}: SupportProps) {
  const [section, setSection] = useState<"step" | "learn" | "person">(
    initialSection,
  );
  const [targetId, setTargetId] = useState(
    initialTarget ??
      state.supportRecords[0]?.targetId ??
      analysis.actions[0]?.id ??
      "general",
  );
  const [answer, setAnswer] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (initialTarget) {
      setTargetId(initialTarget);
      setSection(initialSection);
      setAnswer("");
      setConfirmed(false);
    }
  }, [initialTarget, initialSection]);
  const record = state.supportRecords.find(
    (record) => record.targetId === targetId,
  );
  const plan = record
    ? buildSupportPlan(state, targetId, record.reason, analysis)
    : null;
  const earlier = state.supportRecords.filter(
    (record) =>
      record.targetId !== "general" &&
      !analysis.nodes.some((node) => node.id === record.targetId),
  );
  const unfinished = state.supportRecords.filter(
    (record) => record.status !== "resolved",
  );
  const allReviewed =
    !!plan &&
    plan.smallSteps.every((step) => record?.checked.includes(step.id));
  const canFinish =
    !!plan?.actionable &&
    allReviewed &&
    answer === plan.question.correct &&
    confirmed;
  const switchTarget = (id: string) => {
    setTargetId(id);
    setAnswer("");
    setConfirmed(false);
    setSection("step");
  };
  return (
    <div className="support-workspace">
      <PageHeading eyebrow="Get support" title="Get help with a difficult step">
        Choose what is making a step difficult. We’ll break it down, check the
        listed options, or help you prepare to ask a real person.
      </PageHeading>
      <div className="support-section-switch" aria-label="Ways to get help">
        {[
          { id: "step", label: "Help with a step", icon: LifeBuoy },
          { id: "learn", label: "Learn the paperwork", icon: BookOpen },
          { id: "person", label: "Talk to someone", icon: Phone },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-pressed={section === id}
            onClick={() => setSection(id as typeof section)}
          >
            <Icon size={19} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {section === "learn" && <LearningTools />}
      {section === "person" && (
        <>
          <section className="support-intro">
            <h2>Bring a clear question to a real organization.</h2>
            <p>
              Use the website to confirm services, contact details, appointments
              and any fees. These are referral sources, not live openings or
              endorsements. BridgeBack never sends your profile or contacts a
              provider for you.
            </p>
            <p className="support-callout">
              If you received a tenancy notice or a response deadline, ask an
              appropriate provider or legal helper about it promptly. BridgeBack
              cannot interpret the notice, guarantee representation or extend
              the date.
            </p>
          </section>
          {!record && (
            <button
              className="button secondary"
              onClick={() => {
                const id = targetId || "general";
                setTargetId(id);
                onAction({
                  type: "support-open",
                  targetId: id,
                  reason: "contact",
                });
              }}
            >
              Make a follow-up plan for my question
            </button>
          )}
          {state.profile.location === "Other" && (
            <p className="support-callout">
              You selected an area outside San Diego. This saved search uses San
              Diego ZIP code 92101. Use the official finder to search another
              area.
            </p>
          )}
          <CounselorDirectory
            onChoose={
              record
                ? (counselor) => {
                    onAction({
                      type: "support-provider",
                      targetId,
                      providerId: counselor.id,
                    });
                    requestAnimationFrame(() =>
                      document.querySelector(".contact-plan")?.scrollIntoView({
                        block: "start",
                        behavior: "instant",
                      }),
                    );
                  }
                : undefined
            }
          />
          <h2 className="other-support-heading">Other places to ask</h2>
          <div className="support-resource-grid">
            {supportResources
              .filter((resource) => !resource.topics.includes("learning"))
              .map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
          </div>
          {record && (
            <ContactPlan
              title={supportTargetName(targetId)}
              record={record}
              onAction={onAction}
            />
          )}
        </>
      )}
      {section === "step" && (
        <div className="support-layout">
          <div className="support-main">
            <label className="support-target">
              Which step do you need help with?
              <select
                value={targetId}
                onChange={(event) => switchTarget(event.target.value)}
              >
                <option value="">Choose a step</option>
                <option value="general">
                  General housing paperwork (no practice plan needed)
                </option>
                {analysis.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
                {earlier.map((record) => (
                  <option value={record.targetId} key={record.targetId}>
                    {supportTargetName(record.targetId)} (saved help note)
                  </option>
                ))}
              </select>
            </label>
            {!targetId && (
              <section className="support-intro">
                <h2>No checklist step selected yet.</h2>
                <p>
                  You can still use the learning tools and outside support
                  links. Add a practice plan if you want to try step-by-step
                  help with its paperwork.
                </p>
                <button
                  className="button secondary"
                  onClick={() => onNavigate("Discover")}
                >
                  Find a plan
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </section>
            )}
            {targetId && (
              <>
                <section className="support-reasons">
                  <h2>What is making this difficult?</h2>
                  <p>
                    Choose the closest answer. You can change it later without
                    changing your actual checklist.
                  </p>
                  <div>
                    {supportReasons.map((reason) => (
                      <button
                        key={reason.id}
                        aria-pressed={record?.reason === reason.id}
                        onClick={() => {
                          onAction({
                            type: "support-open",
                            targetId,
                            reason: reason.id,
                          });
                          setAnswer("");
                          setConfirmed(false);
                          requestAnimationFrame(() =>
                            document
                              .getElementById("small-steps-title")
                              ?.focus(),
                          );
                        }}
                      >
                        {reason.label}
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </section>
                {plan && record && (
                  <>
                    <section
                      className="support-small-steps"
                      aria-labelledby="small-steps-title"
                    >
                      <div className="section-heading">
                        <div>
                          <span className="section-label">
                            Help with {plan.title}
                          </span>
                          <h2 id="small-steps-title" tabIndex={-1}>
                            Try one small step at a time
                          </h2>
                        </div>
                        <span>
                          {record.checked.length} of {plan.smallSteps.length}{" "}
                          reviewed
                        </span>
                      </div>
                      <p className="helper-text">
                        These checks track your help plan only. They do not mark
                        application paperwork complete.
                      </p>
                      <ol>
                        {plan.smallSteps.map((step) => (
                          <li key={step.id}>
                            <label>
                              <input
                                type="checkbox"
                                aria-label={`Reviewed: ${step.title}`}
                                checked={record.checked.includes(step.id)}
                                onChange={(event) =>
                                  onAction({
                                    type: "support-check",
                                    targetId,
                                    stepId: step.id,
                                    checked: event.target.checked,
                                  })
                                }
                              />
                              <span>
                                <strong>{step.title}</strong>
                                <span>{step.detail}</span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ol>
                    </section>
                    {plan.missing.length > 0 && (
                      <section className="support-intro">
                        <h3>What this step is still waiting for</h3>
                        <ul>
                          {plan.missing.map((id) => (
                            <li key={id}>{supportTargetName(id)}</li>
                          ))}
                        </ul>
                        <p>
                          Where a requirement offers alternatives, you need one
                          listed option for that requirement, not every paper.
                        </p>
                        <button
                          className="text-button"
                          onClick={() => onNavigate("Documents")}
                        >
                          Review my documents
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      </section>
                    )}
                    {plan.acceptance.length > 0 && (
                      <section className="support-options">
                        <h3>The exact options in your practice plans</h3>
                        <p>
                          These rules are fictional. Do not assume a real
                          provider accepts the same documents.
                        </p>
                        {plan.acceptance.map((rule) => (
                          <div key={`${rule.program}:${rule.requirement}`}>
                            <strong>
                              {rule.program}: {rule.requirement}
                            </strong>
                            <p>
                              {rule.documentIds
                                .map(
                                  (id) =>
                                    documentTypes.find(
                                      (document) => document.id === id,
                                    )!.name,
                                )
                                .join(" OR ")}
                            </p>
                            <small>
                              One listed option meets this particular
                              requirement. Source: {rule.source.label}.
                            </small>
                          </div>
                        ))}
                        <button
                          className="button secondary"
                          onClick={() => onNavigate("Documents")}
                        >
                          Check these document options
                        </button>
                      </section>
                    )}
                    <div className="support-practical-actions">
                      {targetId.startsWith("doc:") &&
                        !state.unavailable.includes(targetId.slice(4)) && (
                          <button
                            className="button secondary"
                            onClick={() =>
                              onAction({
                                type: "unavailable",
                                id: targetId.slice(4),
                                value: true,
                              })
                            }
                          >
                            I cannot get this document right now
                          </button>
                        )}
                      {plan.completed && plan.node?.type !== "gate" && (
                        <button
                          className="button secondary"
                          onClick={() => onReopen(targetId)}
                        >
                          Reopen this checklist item
                        </button>
                      )}
                      <button
                        className="text-button"
                        onClick={() => setSection("learn")}
                      >
                        <BookOpen size={17} aria-hidden="true" />
                        Try a short learning exercise
                      </button>
                    </div>
                    {targetId.startsWith("doc:") && (
                      <p className="helper-text">
                        Marking a document unavailable removes its ready status
                        and recalculates every selected plan that uses it. You
                        can change this later in Documents.
                      </p>
                    )}
                    {targetId !== "general" && (
                      <>
                        <section className="support-ready-check">
                          <h3>Before you mark the actual step ready</h3>
                          <p>
                            Reading help or requesting a paper is useful, but
                            neither proves that the paper is available. Use this
                            check when you are ready to update the real
                            checklist.
                          </p>
                          <fieldset>
                            <legend>{plan.question.prompt}</legend>
                            {plan.question.options.map((option) => (
                              <label className="support-choice" key={option.id}>
                                <input
                                  type="radio"
                                  name="readiness-understanding"
                                  value={option.id}
                                  checked={answer === option.id}
                                  onChange={(event) =>
                                    setAnswer(event.target.value)
                                  }
                                />
                                {option.label}
                              </label>
                            ))}
                          </fieldset>
                          {answer && (
                            <p role="status" className="support-feedback">
                              {answer === plan.question.correct
                                ? "That’s right. "
                                : "Not quite. "}
                              {plan.question.explanation}
                            </p>
                          )}
                          <label className="support-choice">
                            <input
                              type="checkbox"
                              checked={confirmed}
                              onChange={(event) =>
                                setConfirmed(event.target.checked)
                              }
                            />
                            I can actually access this document, or I have
                            finished what this task asks.
                          </label>
                          {!plan.actionable && (
                            <p className="helper-text">
                              {plan.completed
                                ? "This item is already marked ready. You can reopen it above if that was a mistake."
                                : "This item cannot be marked ready yet. Check the missing items or unavailable documents first."}
                            </p>
                          )}
                          <button
                            className="button primary"
                            disabled={!canFinish}
                            onClick={() =>
                              onAction({
                                type: "support-finish",
                                targetId,
                                answer,
                                confirmed,
                              })
                            }
                          >
                            <Check size={17} aria-hidden="true" />
                            Mark the actual step ready
                          </button>
                          {!allReviewed && (
                            <p className="helper-text">
                              Review the four small help steps first. You can
                              save your place and return later.
                            </p>
                          )}
                        </section>
                      </>
                    )}
                    <section className="support-connections">
                      <h2>If you still need a person</h2>
                      <button
                        className="button secondary"
                        onClick={() => {
                          setSection("person");
                          window.scrollTo({ top: 0 });
                        }}
                      >
                        Find a listed housing counselor
                      </button>
                      <p>
                        Ask a focused question using the sheet below. Check the
                        source dates on each card and confirm current services
                        with the organization.
                      </p>
                      <div className="support-resource-grid">
                        {plan.resources.map((resource) => (
                          <ResourceCard key={resource.id} resource={resource} />
                        ))}
                      </div>
                    </section>
                    <ContactPlan
                      title={plan.title}
                      record={record}
                      onAction={onAction}
                    />
                    <section className="support-close">
                      <h3>Did this answer your question?</h3>
                      <p>
                        You can close this help question without marking the
                        application step complete. Waiting for a reply can stay
                        open here.
                      </p>
                      <button
                        className="button secondary"
                        onClick={() =>
                          onAction({
                            type: "support-status",
                            targetId,
                            status:
                              record.status === "resolved"
                                ? "working"
                                : "resolved",
                          })
                        }
                      >
                        {record.status === "resolved"
                          ? "Reopen this help question"
                          : "My question is answered"}
                      </button>
                      <p className="helper-text">
                        Help status:{" "}
                        {record.status === "resolved"
                          ? "question resolved"
                          : record.status === "waiting"
                            ? "waiting for a response"
                            : "working on it"}
                        .
                      </p>
                    </section>
                  </>
                )}
              </>
            )}
          </div>
          <aside className="support-saved" aria-label="Saved help plans">
            <h2>Your saved help plans</h2>
            <p>
              {unfinished.length}{" "}
              {unfinished.length === 1 ? "question is" : "questions are"} still
              open. These are separate from application readiness.
            </p>
            {state.supportRecords.length ? (
              state.supportRecords.map((note) => (
                <button
                  key={note.targetId}
                  aria-pressed={note.targetId === targetId}
                  onClick={() => switchTarget(note.targetId)}
                >
                  <strong>{supportTargetName(note.targetId)}</strong>
                  <span>
                    {note.status === "resolved"
                      ? "Question answered"
                      : note.status === "waiting"
                        ? "Waiting for a reply"
                        : "Working on it"}
                  </span>
                  {note.followUpDate && (
                    <small>
                      <Clock3 size={14} aria-hidden="true" />
                      My reminder:{" "}
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(`${note.followUpDate}T12:00:00`))}
                    </small>
                  )}
                </button>
              ))
            ) : (
              <p className="helper-text">
                Choose a step and a difficulty to save your first help plan. No
                private case notes are needed.
              </p>
            )}
            <p className="helper-text">
              <CircleHelp size={15} aria-hidden="true" />
              All help plans stay in this browser and are included in your data
              export. Delete all saved data removes them too.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
