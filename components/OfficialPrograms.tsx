"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CircleHelp,
  Clock3,
  Phone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  officialCatalog,
  officialSource,
  sourceNeedsReview,
  type OfficialProgram,
} from "../lib/official-catalog";
import { screenOfficialProgram } from "../lib/official-screening";
import {
  analyzeOfficialPlan,
  officialPreferenceProof,
  type OfficialPlan,
  type OfficialRole,
  type OfficialStepId,
} from "../lib/official-plans";
import { freshSourceReport, sourceReportSchema } from "../lib/official-status";
import type { Workspace, WorkspaceAction } from "../lib/workspace";
import { useNativeApp } from "../hooks/useNativeApp";
import { Progress } from "./ui";

function useSourceContext(state: Workspace) {
  const [online, setOnline] = useState(true),
    [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      setNow(Date.now());
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const timer = window.setInterval(update, 30000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const report =
    state.sourceReport?.catalogVersion === officialCatalog.version
      ? state.sourceReport
      : null;
  return {
    online,
    now,
    report,
    fresh: freshSourceReport(report, online, now),
    changed:
      report?.checks
        .filter((c) => c.state === "needs-review")
        .map((c) => c.sourceId) ?? [],
  };
}
function SourceDetails({
  program,
  state,
}: {
  program: OfficialProgram;
  state: Workspace;
}) {
  return (
    <details className="official-sources">
      <summary>Sources, dates and limits</summary>
      <p>
        BridgeBack reviewed the cited content on October 23, 2026. Page checks
        look for specific reviewed facts; they do not verify every rule,
        appointment or available home. Our review reminder is 30 days, not an
        agency expiration date.
      </p>
      <ul>
        {program.sourceIds.map((id) => {
          const source = officialSource(id);
          return (
            <li key={id}>
              <a href={source.url} target="_blank" rel="noreferrer noopener">
                {source.title} <ArrowUpRight size={13} />
              </a>
              <small>Content reviewed {source.reviewedAt}</small>
              {state.sourceReport?.catalogVersion === officialCatalog.version &&
                state.sourceReport.checks.find(
                  (check) => check.sourceId === id,
                ) && (
                  <small>
                    Saved page-check result:{" "}
                    {state.sourceReport.checks.find(
                      (check) => check.sourceId === id,
                    )!.state === "matches-reviewed-facts"
                      ? "reviewed excerpt still present / PDF unchanged"
                      : state.sourceReport.checks.find(
                            (check) => check.sourceId === id,
                          )!.state === "needs-review"
                        ? "changed; human review needed"
                        : "could not be checked"}
                    . This does not renew the content review date.
                  </small>
                )}
            </li>
          );
        })}
      </ul>
      <p>{program.documentNote}</p>
      <ul>
        {program.cautions.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </details>
  );
}
export function SourceCheckControl({
  state,
  onAction,
}: {
  state: Workspace;
  onAction: (a: WorkspaceAction) => void;
}) {
  const native = useNativeApp();
  const { online, now, report, fresh } = useSourceContext(state);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function check() {
    if (!navigator.onLine || busy) {
      setMessage(
        "You are offline. Saved guidance is still available; no current source check was made.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/source-status", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        credentials: "omit",
      });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/json")
      )
        throw Error("unavailable");
      const data = sourceReportSchema.parse(await response.json());
      if (
        data.mode !== "online" ||
        data.catalogVersion !== officialCatalog.version
      )
        throw Error("version");
      if (data.checks.every((c) => c.state === "unavailable"))
        throw Error("unavailable");
      if (data.checkedAt && Date.parse(data.checkedAt) > Date.now() + 60000)
        throw Error("clock");
      onAction({ type: "source-report", report: data });
      setMessage(
        freshSourceReport(data, true, Date.now())
          ? "Source check loaded. Read each program’s result below. This checks published pages, not live housing openings."
          : "The server returned an older check. Saved guidance is preserved. The server refreshes checks about every 15 minutes; try again shortly or open the official page.",
      );
    } catch {
      setMessage(
        "The official-page check could not finish. Your saved plans and guidance are preserved. Use the cited County pages or call the provider to confirm current instructions.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="official-check-control"
      aria-labelledby="source-check-title"
    >
      <div>
        <span className="section-label">
          Know how current the information is
        </span>
        <h2 id="source-check-title">Reviewed guidance. Dated page checks.</h2>
        <p>
          Rules below were read from official County sources. A page check can
          flag changed instructions; it cannot tell us whether a voucher, home
          or appointment is available. No household information is sent.
        </p>
        {report?.checkedAt && (
          <p className="fine-print">
            {fresh
              ? "Latest page check"
              : online
                ? "Saved page check; refresh due"
                : "Saved page check; not live while offline"}
            :{" "}
            <time dateTime={report.checkedAt}>
              {new Date(report.checkedAt).toLocaleString("en-US")}
            </time>
            . Checks may be shared for up to 15 minutes.
          </p>
        )}
        {now > 0 &&
          officialCatalog.sources.some((s) => sourceNeedsReview(s, now)) && (
            <p className="official-warning">
              Content review is due. Confirm requirements with the provider;
              published-criteria comparisons are paused.
            </p>
          )}
      </div>
      {native ? (
        <p className="helper-text">
          This installed iOS build uses bundled reviewed guidance. Use its
          official links for current information; online page checks are
          available in the hosted web version.
        </p>
      ) : (
        <button
          className="button secondary"
          disabled={busy || !online}
          onClick={() => void check()}
        >
          <RefreshCw
            size={16}
            className={busy ? "source-check-spinning" : undefined}
          />
          {busy
            ? "Checking sources…"
            : online
              ? "Check official pages"
              : "Offline — saved guidance"}
        </button>
      )}
      <p className="official-check-message" role="status">
        {message}
      </p>
    </section>
  );
}
function ProgramStatus({
  program,
  state,
}: {
  program: OfficialProgram;
  state: Workspace;
}) {
  const { fresh, report, changed, now } = useSourceContext(state);
  const accessCheck = report?.checks.find(
    (c) => c.sourceId === program.availability.sourceId,
  );
  const changedAny = program.sourceIds.some((id) => changed.includes(id));
  const overdue =
    now > 0 &&
    program.sourceIds.some((id) => sourceNeedsReview(officialSource(id), now));
  return (
    <div className="official-access" role="note">
      <strong>
        {changedAny
          ? "Published information needs another review"
          : program.availability.kind === "closed"
            ? "Waiting list closed to new applicants"
            : "Referral information; availability unknown"}
      </strong>
      <p>
        {changedAny
          ? "A reviewed source changed. Open the official instructions and contact the provider; do not rely on the saved access description as current."
          : program.availability.detail}
      </p>
      <small>
        {!changedAny && fresh && accessCheck?.state === "matches-reviewed-facts"
          ? "The recent page check still found the cited access wording. This is not a live opening feed."
          : accessCheck?.state === "unavailable"
            ? "The latest attempt could not check this source. Showing reviewed, saved guidance."
            : overdue
              ? "Content review is overdue. Confirm directly with the provider."
              : "Saved official guidance reviewed October 23, 2026. Confirm current access directly."}
      </small>
    </div>
  );
}
export function OfficialDirectory({
  state,
  onAction,
  onPath,
  onSettings,
  query,
  region,
}: {
  state: Workspace;
  onAction: (a: WorkspaceAction) => void;
  onPath: () => void;
  onSettings: () => void;
  query: string;
  region: string;
}) {
  const { now, changed } = useSourceContext(state);
  const matches =
    region === "City of San Diego" || region === "National"
      ? []
      : officialCatalog.programs.filter((p) =>
          `${p.name} ${p.organization} ${p.description} ${p.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        );
  return (
    <section
      className="official-directory"
      aria-labelledby="official-programs-heading"
    >
      <div className="directory-section">
        <span className="section-label">Real programs · official sources</span>
        <h2 id="official-programs-heading">
          Start with what the agency actually says.
        </h2>
        <p>
          Eligibility and application access are different questions. A closed
          list can still have useful steps for someone already on it. These are
          personal follow-up plans, not agency applications.
        </p>
      </div>
      <SourceCheckControl state={state} onAction={onAction} />
      {!matches.length && (
        <p>
          No real programs in this reviewed County catalog match these filters.
          The City of San Diego has its own housing authority; use its official
          website below.
        </p>
      )}
      <div className="official-program-grid">
        {matches.map((program) => {
          const selected = state.officialPlans.some(
            (p) => p.programId === program.id,
          );
          const result = screenOfficialProgram(
            program,
            state.profile,
            now || Date.parse(officialCatalog.reviewedAt),
            changed,
          );
          return (
            <article
              className="card official-program"
              data-testid={`official-program-${program.id}`}
              key={program.id}
            >
              <span className="tag neutral">
                <ShieldCheck size={13} /> Real program · {program.category}
              </span>
              <h3>{program.name}</h3>
              <p className="official-organization">{program.organization}</p>
              <p>{program.description}</p>
              <ProgramStatus program={program} state={state} />
              <p className="fine-print">
                <strong>Service area:</strong> {program.coverage}
              </p>
              <details className="official-screening">
                <summary>Compare the published criteria</summary>
                <strong>{result.result}</strong>
                {result.reasons.map((reason) => (
                  <p key={reason}>{reason}</p>
                ))}
                <p className="fine-print">
                  {result.scope} This result does not change the waiting-list
                  status above. Your optional answers stay on this device.
                </p>
                <button className="text-button" onClick={onSettings}>
                  Review household and city answers <ArrowRight size={15} />
                </button>
              </details>
              <SourceDetails program={program} state={state} />
              <div className="inline-actions">
                <button
                  className="button primary"
                  onClick={() => {
                    if (!selected)
                      onAction({
                        type: "official-plan",
                        id: program.id,
                        selected: true,
                      });
                    onPath();
                  }}
                  aria-label={`${selected ? "Open" : "Save"} ${program.name} follow-up plan`}
                >
                  {selected
                    ? "Open my real-program plan"
                    : "Save a follow-up plan"}
                  <ArrowRight size={16} />
                </button>
                <a
                  className="button secondary"
                  href={officialSource(program.availability.sourceId).url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Official instructions <ArrowUpRight size={16} />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
export function OfficialOverview({
  plans,
  onPath,
  onDiscover,
}: {
  plans: OfficialPlan[];
  onPath: () => void;
  onDiscover: () => void;
}) {
  if (!plans.length)
    return (
      <section className="official-start">
        <div>
          <span className="section-label">
            Real programs, clearly explained
          </span>
          <h2>Check the door before you gather the paperwork.</h2>
          <p>
            See which County waiting lists are closed, what existing applicants
            can do, and where to ask for help. Every real-program entry cites
            its official source.
          </p>
        </div>
        <button className="button primary" onClick={onDiscover}>
          Find real programs <ArrowRight size={17} />
        </button>
      </section>
    );
  const progress = plans.map(analyzeOfficialPlan);
  return (
    <section className="official-overview" aria-labelledby="real-next-heading">
      <div className="section-heading">
        <div>
          <span className="section-label">Your real-program follow-up</span>
          <h2 id="real-next-heading">
            A useful next step, even when a list is closed.
          </h2>
          <p>
            Check marks track your own follow-up work. They do not show
            application acceptance or your chances of housing.
          </p>
        </div>
        <button className="text-button" onClick={onPath}>
          Open real-program checklist <ArrowRight size={16} />
        </button>
      </div>
      {progress.map((plan) => (
        <article key={plan.program.id} className="official-overview-row">
          <div>
            <h3>{plan.program.name}</h3>
            <p>
              {plan.next
                ? `Next: ${plan.next.name}`
                : "Your follow-up steps are checked. Confirm any remaining work with the provider."}
            </p>
            <small>
              {plan.program.availability.kind === "closed"
                ? "New waiting-list applications closed in reviewed source"
                : "Referral route; no availability confirmed"}
            </small>
          </div>
          <Progress
            value={plan.progress}
            label={`${plan.complete} of ${plan.total} follow-up milestones`}
          />
          <button className="button secondary" onClick={onPath}>
            View steps
          </button>
        </article>
      ))}
    </section>
  );
}
export function OfficialPlans({
  state,
  onAction,
  onLocalHelp,
}: {
  state: Workspace;
  onAction: (a: WorkspaceAction) => void;
  onLocalHelp: () => void;
}) {
  return (
    <section
      className="official-plans"
      aria-labelledby="official-checklist-title"
    >
      <header className="pathfinder-intro">
        <div>
          <span className="eyebrow">Real-program follow-up</span>
          <h1 id="official-checklist-title">Your real-program next steps</h1>
          <p>
            Use the route that fits your situation. A checked step records what
            you did; it does not submit or approve an application.
          </p>
        </div>
      </header>
      {state.officialPlans.map((plan) => (
        <OfficialPlanCard
          key={plan.programId}
          plan={plan}
          state={state}
          onAction={onAction}
          onLocalHelp={onLocalHelp}
        />
      ))}
    </section>
  );
}
function OfficialPlanCard({
  plan,
  state,
  onAction,
  onLocalHelp,
}: {
  plan: OfficialPlan;
  state: Workspace;
  onAction: (a: WorkspaceAction) => void;
  onLocalHelp: () => void;
}) {
  const analysis = analyzeOfficialPlan(plan);
  const { program } = analysis;
  const tasks = analysis.nodes.filter((n) => n.type === "task");
  return (
    <article className="card official-plan-card" aria-label={program.name}>
      <span className="tag neutral">
        Real program · personal follow-up checklist
      </span>
      <h2>{program.name}</h2>
      <ProgramStatus program={program} state={state} />
      {program.availability.kind === "closed" && (
        <>
          <label className="official-route-label">
            Which situation fits you?
            <select
              value={plan.role}
              onChange={(event) =>
                onAction({
                  type: "official-role",
                  id: program.id,
                  role: event.target.value as OfficialRole,
                })
              }
            >
              <option value="new">I am not already on this waiting list</option>
              <option value="existing">
                I am already on this County waiting list
              </option>
            </select>
          </label>
          <p className="helper-text">
            Changing routes resets route-specific check marks and keeps your
            reviewed-status step. Choose “already on” only for an existing
            application with this agency.
          </p>
        </>
      )}
      <Progress
        value={analysis.progress}
        label={`${analysis.complete} of ${analysis.total} follow-up milestones finished`}
      />
      <p className="fine-print">
        This percentage tracks this follow-up checklist, not application
        readiness or approval. The online and assisted access routes count as
        one milestone.
      </p>
      <p className="official-next" role="status">
        <ArrowRight size={18} />
        <strong>
          {analysis.next
            ? `Next: ${analysis.next.name}`
            : "Follow-up checklist finished. Confirm the result with the provider."}
        </strong>
      </p>
      <ol className="official-step-list">
        {tasks.map((node) => {
          const status = analysis.statuses[node.id];
          const alternate =
            (node.id === "email-access" || node.id === "assisted-access") &&
            analysis.statuses.access === "complete" &&
            status !== "complete";
          return (
            <li key={node.id} className={`official-step ${status}`}>
              <label>
                <input
                  type="checkbox"
                  checked={status === "complete"}
                  disabled={status === "blocked"}
                  onChange={(event) =>
                    onAction({
                      type: "official-step",
                      id: program.id,
                      stepId: node.id as OfficialStepId,
                      checked: event.target.checked,
                    })
                  }
                />
                <span>
                  <strong>{node.name}</strong>
                  <span>{node.description}</span>
                </span>
              </label>
              <small>
                {alternate
                  ? "Another access route already satisfies this milestone; this option is optional."
                  : status === "complete"
                    ? "You marked this finished. Uncheck to correct it and reopen dependent work."
                    : status === "blocked"
                      ? `Waiting for: ${node.all
                          .filter((id) => analysis.statuses[id] !== "complete")
                          .map(
                            (id) =>
                              analysis.nodes.find((n) => n.id === id)?.name,
                          )
                          .join(", ")}`
                      : "You can work on this now."}
              </small>
              <a
                href={officialSource(node.source).url}
                target="_blank"
                rel="noreferrer noopener"
              >
                Read the source for this guidance <ArrowUpRight size={13} />
              </a>
            </li>
          );
        })}
      </ol>
      <details className="official-trouble">
        <summary>
          <CircleHelp size={17} /> Trouble with this route?
        </summary>
        <p>
          {plan.role === "existing" && program.availability.kind === "closed"
            ? "No email or registration code? The County’s guide describes registration with or without a code. You can instead ask HACSD about mail, fax or in-person help. Keep account and identity details on the County’s own site."
            : "If the waiting list or referral route cannot help now, ask a real helper about other current services. For a place to stay tonight or soon, the County directs people to 211. A phone link does not reserve housing."}
        </p>
        <p>{program.documentNote}</p>
        <p>
          Never send a password, verification code, Social Security number or
          document to BridgeBack. Do not mark a contact step complete until you
          actually contacted someone.
        </p>
        <div className="inline-actions">
          <a
            className="button secondary"
            href={`tel:${program.contactPhone.replace(/-/g, "")}`}
          >
            <Phone size={16} />
            Call {program.contactPhone}
          </a>
          <button className="button secondary" onClick={onLocalHelp}>
            Find another real helper
          </button>
        </div>
      </details>
      <SourceDetails program={program} state={state} />
      <div className="inline-actions">
        <a
          className="button secondary"
          href={program.contactUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          Open the official provider page <ArrowUpRight size={16} />
        </a>
        <button
          className="text-button"
          onClick={() =>
            onAction({ type: "official-plan", id: program.id, selected: false })
          }
        >
          Remove this follow-up plan
        </button>
      </div>
      <p className="fine-print">
        <Clock3 size={13} /> Last changed on this device:{" "}
        {new Date(plan.updatedAt).toLocaleString("en-US")}. Dates here are not
        agency deadlines.
      </p>
    </article>
  );
}
export function OfficialDocuments({
  state,
  onAction,
}: {
  state: Workspace;
  onAction: (a: WorkspaceAction) => void;
}) {
  const plan = state.officialPlans.find((p) => p.programId === "county-public");
  const { changed, now } = useSourceContext(state);
  if (!plan) return null;
  const proof = officialPreferenceProof(plan);
  const review =
    changed.includes(proof.sourceId) ||
    (now > 0 && sourceNeedsReview(officialSource(proof.sourceId), now));
  return (
    <section
      className="card official-document-workspace"
      aria-labelledby="real-documents-title"
    >
      <span className="tag neutral">
        Real program · a specific preference, not basic eligibility
      </span>
      <h2 id="real-documents-title">
        County Public Housing: working-preference proof
      </h2>
      <p>
        The County’s admissions policy (7-23) lists recent paystub(s){" "}
        <strong>OR</strong> a statement from the employer for the working-family
        preference. One listed option meets that modeled evidence rule; you do
        not need both. The County must confirm whether the preference applies,
        whether your records are sufficient, and when it needs them.
      </p>
      <p>
        Only track what you already have or are preparing for your own case. A
        closed waiting list does not become open because you gather a document.
      </p>
      <fieldset>
        <legend>Which listed option do you have available?</legend>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={plan.documents["recent-paystubs"] === true}
            onChange={(event) =>
              onAction({
                type: "official-document",
                id: plan.programId,
                documentId: "recent-paystubs",
                available: event.target.checked,
              })
            }
          />
          Recent paystub(s) for the working preference
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={plan.documents["employer-statement"] === true}
            onChange={(event) =>
              onAction({
                type: "official-document",
                id: plan.programId,
                documentId: "employer-statement",
                available: event.target.checked,
              })
            }
          />
          Employer statement for the working preference
        </label>
      </fieldset>
      <p className="official-next" role="status">
        {review
          ? "Source review is needed. Your document status is saved, but confirm the accepted evidence with HACSD."
          : proof.satisfied
            ? "You marked one listed evidence option as available. This does not verify the document, establish the preference, or change application eligibility."
            : "Neither listed option is marked available. Ask the County which option and level of detail your case needs; no document is uploaded here."}
      </p>
      <details className="official-trouble">
        <summary>What if I cannot get either option?</summary>
        <p>
          Ask HACSD whether another verification method is accepted for your
          case. The reviewed passage does not establish another substitute, so
          BridgeBack does not invent one. Do not postpone responding to an
          actual agency letter while waiting for a document; ask the agency
          about its instructions and deadline.
        </p>
        <a href="tel:8586944801" className="button secondary">
          <Phone size={16} />
          Ask HACSD: 858-694-4801
        </a>
      </details>
      <p>
        <a
          href={officialSource(proof.sourceId).url}
          target="_blank"
          rel="noreferrer noopener"
        >
          Read the official policy, page 7-23 <ArrowUpRight size={14} />
        </a>
      </p>
      <p className="fine-print">
        This inventory is separate from the fictional examples. It never marks
        documents accepted by another program. Status only: no uploads, employer
        name, income records or identity numbers.
      </p>
    </section>
  );
}
