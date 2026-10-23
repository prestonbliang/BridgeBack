"use client";
import { useState } from "react";
import Link from "next/link";
import { useNativeApp } from "../hooks/useNativeApp";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Download,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { programs } from "../lib/programs";
import { resources } from "../lib/data";
import { OfficialDirectory } from "./OfficialPrograms";
import { municipalitySchema, type Municipality } from "../lib/official-catalog";
import { screenOfficialProgram } from "../lib/official-screening";
import { officialCatalog } from "../lib/official-catalog";
import { screenProgram, type PlanAnalysis } from "../lib/planner";
import { type Workspace, type WorkspaceAction } from "../lib/workspace";
import { Explain } from "./Explain";
import { Dialog, PageHeading, download, Progress } from "./ui";
export function Discover({
  state,
  analysis,
  onAction,
  onPath,
  onSettings,
}: {
  state: Workspace;
  analysis: PlanAnalysis;
  onAction: (a: WorkspaceAction) => void;
  onPath: () => void;
  onSettings: () => void;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All resources"),
    [region, setRegion] = useState("All areas");
  const real =
    category === "Practice plans"
      ? []
      : resources.filter(
          (r) =>
            (r.name + " " + r.description)
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (region === "All areas" || r.region === region),
        );
  const samples =
    category === "Official resources" ||
    (region !== "All areas" && region !== "San Diego County")
      ? []
      : programs.filter((p) =>
          (p.name + " " + p.description)
            .toLowerCase()
            .includes(query.toLowerCase()),
        );
  const hasOfficialMatches =
    category !== "Practice plans" &&
    (region === "All areas" || region === "San Diego County") &&
    officialCatalog.programs.some((program) =>
      `${program.name} ${program.organization} ${program.description} ${program.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  return (
    <>
      <PageHeading eyebrow="FIND A POSSIBLE FIT" title="Find housing help">
        Read reviewed real-program instructions, check application access, and
        save a follow-up plan. Optional practice plans are labeled separately;
        nothing is submitted here.
      </PageHeading>
      <div className="filters">
        <label>
          Search resources
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, organization, or need"
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>All resources</option>
            <option>Official resources</option>
            <option>Practice plans</option>
          </select>
        </label>
        <label>
          Geographic coverage
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option>All areas</option>
            <option>San Diego County</option>
            <option>City of San Diego</option>
            <option>National</option>
          </select>
        </label>
      </div>
      <div className="notice">
        <ShieldCheck size={18} /> Real-program guidance cites reviewed official
        sources. Page checks can flag changes; they do not show live housing
        openings. Practice-plan criteria remain fictional.
      </div>
      {category !== "Practice plans" && (
        <OfficialDirectory
          state={state}
          onAction={onAction}
          onPath={onPath}
          onSettings={onSettings}
          query={query}
          region={region}
        />
      )}
      <div className="resource-grid">
        {real.length > 0 && (
          <div className="directory-section">
            <h2>Official housing websites</h2>
            <p>
              These links lead to real organizations. Ask them about current
              programs, openings and how to apply.
            </p>
          </div>
        )}
        {real.map((r) => (
          <article className="card resource" key={r.name}>
            <span className="tag neutral">Official website</span>
            <h2>{r.name}</h2>
            <p>{r.description}</p>
            <span className="location">
              <MapPin size={16} />
              {r.region}
            </span>
            <p className="fine-print">
              Organization link; not an eligibility check. Specific reviewed
              County programs are listed above. Confirm current services
              directly.
            </p>
            <a
              className="button secondary"
              href={r.url}
              target="_blank"
              rel="noreferrer"
            >
              Visit official website <ArrowUpRight size={16} />
            </a>
          </article>
        ))}
        {samples.length > 0 && (
          <div className="directory-section">
            <h2>Try a practice checklist</h2>
            <p>
              These programs are made up. Add one to see how the paperwork
              checklist works; it does not apply for assistance.
            </p>
          </div>
        )}
        {samples.map((p) => {
          const screening = screenProgram(p, state.profile);
          const selected = state.selectedProgramIds.includes(p.id);
          const progress = analysis.programs.find((a) => a.id === p.id);
          return (
            <article className="card resource" key={p.id}>
              <span className="tag">Practice plan — not a real program</span>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <div className="screen-result">
                <strong>{screening.result}</strong>
                <p>{screening.reasons.join(" ")}</p>
                <Explain explanation={screening.explanation} />
              </div>
              <details className="program-rules">
                <summary>Accepted documents & preparation rules</summary>
                {p.accepts.map((a) => (
                  <div key={a.id}>
                    <strong>{a.name}</strong>
                    <p>{a.description}</p>
                  </div>
                ))}
                <p>
                  Source: {p.source.label}. No real verification date or
                  deadline applies.
                </p>
              </details>
              {progress && (
                <Progress
                  value={progress.readiness}
                  label={`${p.shortName} preparation`}
                />
              )}
              <div className="inline-actions">
                <button
                  className={selected ? "button secondary" : "button primary"}
                  onClick={() =>
                    onAction({ type: "program", id: p.id, selected: !selected })
                  }
                >
                  {selected ? <Check size={16} /> : null}
                  {selected ? "Remove plan" : "Add preparation plan"}
                </button>
                {selected && (
                  <button className="text-button" onClick={onPath}>
                    Open PathFinder <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!samples.length && !real.length && !hasOfficialMatches && (
        <section className="card empty">
          <h2>No matching resources</h2>
          <p>Try another area, category, or search term.</p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setRegion("All areas");
              setCategory("All resources");
            }}
          >
            Clear filters
          </button>
        </section>
      )}
    </>
  );
}
export function SettingsView({
  state,
  onAction,
  onDelete,
  storageError,
  isDemo,
}: {
  state: Workspace;
  onAction: (a: WorkspaceAction) => void;
  onDelete: () => Promise<void>;
  storageError: string;
  isDemo: boolean;
}) {
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const native = useNativeApp();
  return (
    <>
      <PageHeading
        eyebrow="YOUR CHOICES, ALWAYS"
        title="Your information and settings"
      >
        These questions are optional. Real-program entries explain exactly which
        published factors they compare. Practice-plan screening stays separate.
        Leave anything blank if unsure.
      </PageHeading>
      {isDemo && (
        <div className="notice">
          You’re editing a fictional demo profile. Your personal workspace is
          preserved.
        </div>
      )}
      <div className="settings-grid">
        <section className="card">
          <h2>Household & housing needs</h2>
          <label>
            Household size
            <input
              type="number"
              inputMode="numeric"
              name="household-size"
              aria-describedby="household-help"
              min={1}
              max={20}
              value={state.profile.household ?? ""}
              onChange={(e) => {
                const n = e.target.value === "" ? null : Number(e.target.value);
                if (n === null || (Number.isInteger(n) && n >= 1 && n <= 20))
                  onAction({
                    type: "profile",
                    profile: { ...state.profile, household: n },
                  });
              }}
            />
          </label>
          <p className="helper-text" id="household-help">
            Count the people who would be on the same application. You can leave
            this blank.
          </p>
          <label>
            Approximate annual household income ($)
            <input
              type="number"
              inputMode="decimal"
              name="annual-income"
              aria-describedby="income-help"
              min={0}
              max={1000000}
              value={state.profile.income ?? ""}
              onChange={(e) => {
                const n = e.target.value === "" ? null : Number(e.target.value);
                if (n === null || (n >= 0 && n <= 1000000))
                  onAction({
                    type: "profile",
                    profile: { ...state.profile, income: n },
                  });
              }}
            />
          </label>
          <p className="helper-text" id="income-help">
            For the real County Public Housing income comparison, use
            approximate gross income before deductions for the whole household
            and year. The agency decides what counts. Leave it blank if unsure.
          </p>
          <label>
            Location
            <select
              value={state.profile.location}
              onChange={(e) =>
                onAction({
                  type: "profile",
                  profile: {
                    ...state.profile,
                    location: e.target
                      .value as Workspace["profile"]["location"],
                  },
                })
              }
            >
              <option>Unknown</option>
              <option>San Diego</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            City or community for real programs
            <select
              value={state.profile.municipality ?? "Unknown"}
              onChange={(event) =>
                onAction({
                  type: "profile",
                  profile: {
                    ...state.profile,
                    municipality: event.target.value as Municipality,
                  },
                })
              }
            >
              {municipalitySchema.options.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <p className="helper-text">
            No street address or ZIP code is needed. The County housing
            authority and City of San Diego housing authority serve different
            areas. The broader Location field above is retained for the practice
            examples.
          </p>
          <label>
            Housing need
            <select
              value={state.profile.need}
              onChange={(e) =>
                onAction({
                  type: "profile",
                  profile: {
                    ...state.profile,
                    need: e.target.value as Workspace["profile"]["need"],
                  },
                })
              }
            >
              <option>Rent support</option>
              <option>Housing search</option>
              <option>At risk</option>
            </select>
          </label>
          <div aria-live="polite">
            {programs
              .filter((p) => state.selectedProgramIds.includes(p.id))
              .map((p) => {
                const result = screenProgram(p, state.profile);
                return (
                  <div className="screen-result" key={p.id}>
                    <strong>
                      {p.shortName}: {result.result}
                    </strong>
                    <p>{result.reasons.join(" ")}</p>
                    <Explain explanation={result.explanation} />
                  </div>
                );
              })}
          </div>
          {state.officialPlans.map((plan) => {
            const program = officialCatalog.programs.find(
              (p) => p.id === plan.programId,
            )!;
            const changed =
              state.sourceReport?.catalogVersion === officialCatalog.version
                ? state.sourceReport.checks
                    .filter((c) => c.state === "needs-review")
                    .map((c) => c.sourceId)
                : [];
            const screening = screenOfficialProgram(
              program,
              state.profile,
              Date.now(),
              changed,
            );
            return (
              <div className="screen-result" key={plan.programId}>
                <strong>
                  {program.name}: {screening.result}
                </strong>
                {screening.reasons.map((reason) => (
                  <p key={reason}>{reason}</p>
                ))}
                <p className="fine-print">
                  Partial published-criteria check. Application access is shown
                  separately in Find help.
                </p>
              </div>
            );
          })}
          <p className="fine-print">
            Practice results above use fictional rules. Real-program comparisons
            cite their own published criteria and can remain uncertain. Housing
            need is context, not a disqualifying rule.
          </p>
        </section>
        <div className="settings-stack">
          <section className="card">
            <h2>What matters most today?</h2>
            <label>
              Preparation priority
              <select
                value={state.priority}
                onChange={(e) =>
                  onAction({
                    type: "priority",
                    priority: e.target.value as Workspace["priority"],
                  })
                }
              >
                <option value="balanced">Balance progress and effort</option>
                <option value="momentum">Unlock the most next steps</option>
                <option value="effort">Start with lower effort</option>
              </select>
            </label>
            <label>
              Focus on a plan
              <select
                value={state.preferredProgram ?? ""}
                onChange={(e) =>
                  onAction({ type: "preferred", id: e.target.value || null })
                }
              >
                <option value="">Treat all selected plans equally</option>
                {programs
                  .filter((p) => state.selectedProgramIds.includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.shortName}
                    </option>
                  ))}
              </select>
            </label>
            <p>
              This changes which step we suggest first. We only use difficulty
              ratings you have chosen; we do not guess how hard a task is for
              you.
            </p>
          </section>
          <section className="card">
            <h2>Comfort & accessibility</h2>
            <label>
              Appearance
              <select
                value={state.theme}
                onChange={(e) =>
                  onAction({
                    type: "theme",
                    theme: e.target.value as Workspace["theme"],
                  })
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={state.largeText}
                onChange={(e) =>
                  onAction({ type: "largeText", value: e.target.checked })
                }
              />
              Larger reading text
            </label>
            <p>
              Motion respects your device’s reduced-motion setting. A checklist
              alternative is always available beside the graph.
            </p>
          </section>
          <section className="card">
            <h2>Your data belongs to you</h2>
            <p>
              Data stays in IndexedDB in this browser. It is not encrypted
              secure storage; other people using this browser profile may access
              it. Exports and printouts are your responsibility.
            </p>
            {storageError && <p role="alert">{storageError}</p>}
            <div className="inline-actions">
              <button
                className="button secondary"
                disabled={exporting}
                onClick={async () => {
                  setExporting(true);
                  try {
                    const result = await download(
                      "bridgeback-progress.json",
                      JSON.stringify(state, null, 2),
                      "application/json",
                    );
                    if (result === "cancelled") {
                      setExportMessage(
                        "Sharing cancelled. Your saved progress is unchanged.",
                      );
                      return;
                    }
                    onAction({
                      type: "record",
                      eventType: "export",
                      label: "Exported workspace data",
                    });
                    setExportMessage(
                      result === "shared"
                        ? "You shared your progress using the system share sheet. Copies you save or share are under your control."
                        : "Your progress was downloaded. Keep this copy somewhere private.",
                    );
                  } catch {
                    setExportMessage(
                      "We could not confirm the export finished. Check your chosen destination before trying again. Your saved progress is unchanged.",
                    );
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                <Download size={16} />
                Export my progress
              </button>
              <button
                className="text-button danger"
                onClick={() => setConfirm(true)}
              >
                <Trash2 size={16} />
                {isDemo ? "Reset this demo" : "Delete all saved data"}
              </button>
            </div>
            <p className="helper-text" role="status">
              {exportMessage}
            </p>
            <p className="fine-print">
              No accounts, analytics, advertising or automatic applications.
              {native
                ? " This iOS app includes its checklists and dated resource information for offline use from first launch. Browser and app storage are separate; progress does not sync between them."
                : " First load online, then install through your browser menu; on iPhone use Safari → Share → Add to Home Screen."}
            </p>
            <Link
              prefetch={false}
              href="/privacy"
              target={native ? undefined : "_blank"}
              rel="noreferrer noopener"
            >
              Read the privacy policy
            </Link>
            <p>
              <Link
                prefetch={false}
                href="/notices"
                target={native ? undefined : "_blank"}
                rel="noreferrer noopener"
              >
                Open-source acknowledgments
              </Link>
            </p>
          </section>
        </div>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Confirm data deletion"
      >
        <h2>{isDemo ? "Reset the demo?" : "Delete your saved checklist?"}</h2>
        <p>
          This clears{" "}
          {isDemo
            ? "the current fictional scenario"
            : "saved profile, document statuses, tasks and history"}
          . Downloaded exports and printed copies remain. This cannot be undone.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="inline-actions">
          <button
            className="button secondary"
            onClick={() => setConfirm(false)}
          >
            Keep my progress
          </button>
          <button
            className="button primary"
            onClick={async () => {
              try {
                await onDelete();
                setConfirm(false);
              } catch {
                setError(
                  "Deletion failed. Your workspace has not been reported as deleted. Try again.",
                );
              }
            }}
          >
            Yes, delete my data
          </button>
        </div>
      </Dialog>
    </>
  );
}
export function Timeline({
  state,
  onAction,
}: {
  state: Workspace;
  onAction: (a: WorkspaceAction) => void;
}) {
  const [filter, setFilter] = useState("all");
  const events = state.events.filter(
    (e) =>
      filter === "all" ||
      (filter === "corrections" ? e.type === "correction" : e.canUndo),
  );
  return (
    <>
      <PageHeading
        eyebrow="THE STEPS YOU’VE TAKEN"
        title="Your recent activity"
      >
        See the changes you made to your checklist. If you checked something by
        mistake, you can correct it below.
      </PageHeading>
      <label className="timeline-filter">
        Show events
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All changes</option>
          <option value="editable">Actions I can correct</option>
          <option value="corrections">Corrections</option>
        </select>
      </label>
      {events.length ? (
        <ol className="progress-timeline">
          {events.map((event) => (
            <li key={event.id} className={event.undone ? "corrected" : ""}>
              <span className="timeline-dot">
                {event.type === "correction" ? (
                  <RotateCcw size={16} />
                ) : (
                  <Check size={16} />
                )}
              </span>
              <div>
                <span className="timeline-type">{event.type}</span>
                <h2>{event.label}</h2>
                <time dateTime={event.at}>
                  {new Date(event.at).toLocaleString()}
                </time>
                {event.undone && (
                  <p>
                    Corrected — this earlier action no longer contributes to
                    your path.
                  </p>
                )}
              </div>
              {event.canUndo && !event.undone && (
                <button
                  className="button secondary"
                  onClick={() => onAction({ type: "undo", eventId: event.id })}
                >
                  Correct this action
                </button>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <section className="card empty">
          <h2>
            {filter === "all"
              ? "No changes recorded yet"
              : "No events in this view."}
          </h2>
          <p>
            Program selection, document preparation, completed tasks, newly
            available steps and exports appear here as they happen.
          </p>
        </section>
      )}
      {state.legacyHistory.length > 0 && (
        <details className="card">
          <summary>Earlier workspace activity (dates unknown)</summary>
          <ul>
            {state.legacyHistory.map((event, index) => (
              <li key={index}>{event}</li>
            ))}
          </ul>
        </details>
      )}
      <p className="fine-print">
        You can undo the most recent change to a document, task or plan. Newer
        changes replace earlier ones. The latest 100 events are retained.
      </p>
    </>
  );
}
export const demoScenes = [
  {
    title: "Start with two unfinished checklists.",
    copy: "This made-up applicant has ID and proof of address, but no income document. Both forms need that missing paperwork.",
    tab: "Dashboard",
  },
  {
    title: "See why a step is waiting.",
    copy: "Choose Journey map to see the connections. A form waits for the papers linked to it. You can always use the checklist instead.",
    tab: "PathFinder",
  },
  {
    title: "Find the missing item that holds up the most.",
    copy: "Look at “What’s holding things up?” A pay stub helps both plans. Open “Why this?” to see exactly which rules count.",
    tab: "PathFinder",
  },
  {
    title: "Try a change without checking anything off.",
    copy: "In “See what would change,” choose Pay stub. Compare the before and after numbers. Your actual checklist has not changed.",
    tab: "PathFinder",
  },
  {
    title: "Now mark the document as ready.",
    copy: "Choose “Update my checklist” in the preview. The forms become available in your checklist too. Activity records the change, and you can undo it.",
    tab: "PathFinder",
  },
  {
    title: "Use a document for more than one plan.",
    copy: "The same pay stub counts for Fresh Start and Harbor. An employer letter only counts for Fresh Start. Mark a document as hard to get to see accepted alternatives.",
    tab: "Documents",
  },
  {
    title: "Keep a copy of your next steps.",
    copy: "Choose Export preparation packet to download the checklist, or Print to make a paper copy. Neither sends an application. Return to your workspace when you are done.",
    tab: "Documents",
  },
] as const;
export function DemoGuide({
  scene,
  onScene,
  onExit,
  onScenario,
}: {
  scene: number;
  onScene: (n: number) => void;
  onExit: () => void;
  onScenario: (n: number) => void;
}) {
  return (
    <section className="demo-guide" aria-label="Interactive demo guide">
      <div className="demo-guide-head">
        <span>
          <Play size={15} /> Practice example · Step {scene + 1} of 7
        </span>
        <button className="text-button" onClick={onExit}>
          Return to my workspace
        </button>
      </div>
      <div className="demo-guide-body">
        <div>
          <h2>{demoScenes[scene].title}</h2>
          <p>{demoScenes[scene].copy}</p>
        </div>
        <div className="demo-scene-controls">
          <button
            className="icon-button"
            aria-label="Previous demo scene"
            disabled={scene === 0}
            onClick={() => onScene(scene - 1)}
          >
            <ChevronLeft />
          </button>
          <span>{scene + 1} / 7</span>
          <button
            className="icon-button"
            aria-label="Next demo scene"
            disabled={scene === 6}
            onClick={() => onScene(scene + 1)}
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="demo-dots">
        {demoScenes.map((s, i) => (
          <button
            key={s.title}
            aria-label={`Demo scene ${i + 1}: ${s.title}`}
            aria-current={scene === i ? "step" : undefined}
            onClick={() => onScene(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <details>
        <summary>Try another fictional scenario</summary>
        <div className="inline-actions">
          <button className="button secondary" onClick={() => onScenario(0)}>
            Missing documentation
          </button>
          <button className="button secondary" onClick={() => onScenario(1)}>
            Multiple blockers
          </button>
          <button className="button secondary" onClick={() => onScenario(2)}>
            Eligibility changes
          </button>
        </div>
      </details>
      <p className="demo-preserved">
        <ShieldCheck size={14} /> Your own checklist is saved separately.
        Changes to this example disappear when you leave it.
      </p>
    </section>
  );
}
