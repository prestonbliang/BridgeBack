"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Compass,
  FileCheck2,
  GitBranch,
  Home,
  Leaf,
  LockKeyhole,
  Menu,
  Moon,
  Play,
  Settings,
  ShieldCheck,
  Sun,
  WifiOff,
  X,
  History,
  Route,
} from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import {
  initialWorkspace,
  updateWorkspace,
  type Workspace,
  type WorkspaceAction,
} from "../lib/workspace";
import { evaluatePlan, transitionPlan, type Transition } from "../lib/planner";
import { programs } from "../lib/programs";
import { preparationPacket } from "../lib/packet";
import { PathFinder } from "../components/PathFinder";
import { Documents } from "../components/Documents";
import { Explain } from "../components/Explain";
import { Onboarding } from "../components/Onboarding";
import {
  Discover,
  SettingsView,
  Timeline,
  DemoGuide,
  demoScenes,
} from "../components/WorkspaceViews";
import { PageHeading, Progress, download } from "../components/ui";
const navigation = [
  { label: "Dashboard", icon: Home },
  { label: "Discover", icon: Compass },
  { label: "PathFinder", icon: GitBranch },
  { label: "Documents", icon: FileCheck2 },
  { label: "Timeline", icon: History },
  { label: "Settings", icon: Settings },
] as const;
type Tab = (typeof navigation)[number]["label"];
function demoWorkspace(index = 0): Workspace {
  const base = initialWorkspace();
  return {
    ...base,
    selectedProgramIds:
      index === 2 ? ["fresh", "harbor", "keys"] : ["fresh", "harbor"],
    profile: {
      household: index === 2 ? 1 : 2,
      income: index === 2 ? 70000 : 32000,
      location: "San Diego",
      need: index === 1 ? "At risk" : "Rent support",
    },
    documents: index === 1 ? {} : { identity: true, residence: true },
    completed: index === 0 ? ["fresh:household"] : [],
    onboarding: { step: 0, done: true },
  };
}
export default function App() {
  const local = useWorkspace();
  const [demo, setDemo] = useState<Workspace | null>(null);
  const state = demo ?? local.workspace;
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [mobile, setMobile] = useState(false);
  const [online, setOnline] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [scene, setScene] = useState(0);
  const [transition, setTransition] = useState<Transition | null>(null);
  const [notification, setNotification] = useState("");
  const [offlineReady, setOfflineReady] = useState(false);
  const main = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const analysis = useMemo(() => evaluatePlan(state), [state]);
  const example = useMemo(() => evaluatePlan(demoWorkspace()), []);
  const next = analysis.actions[0];
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then(() => setOfflineReady(true))
        .catch(() =>
          setNotification(
            "Offline caching could not finish. Keep this page open online and try again before relying on offline use.",
          ),
        );
    }
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dataset.largeText = String(state.largeText);
  }, [state.theme, state.largeText]);
  useEffect(() => {
    if (mobile)
      navRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [mobile]);
  function navigate(nextTab: Tab) {
    setTab(nextTab);
    setMobile(false);
    requestAnimationFrame(() => {
      const heading = main.current?.querySelector<HTMLElement>("h1");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      }
    });
  }
  function act(action: WorkspaceAction) {
    try {
      const before = evaluatePlan(state);
      let updated = updateWorkspace(state, action);
      const after = evaluatePlan(updated);
      const delta = transitionPlan(before, after);
      const screened = after.programs.filter(
        (program) =>
          action.type === "profile" ||
          !before.programs.some((previous) => previous.id === program.id),
      );
      if (screened.length) {
        updated = updateWorkspace(updated, {
          type: "record",
          eventType: "screening",
          label: `Screening recalculated: ${screened.map((program) => `${program.name} — ${program.screening.result.toLowerCase()} under fictional criteria`).join("; ")}. This is not an official decision.`,
        });
      }
      if (delta.newlyAvailable.length) {
        const names = delta.newlyAvailable.map(
          (id) => after.nodes.find((n) => n.id === id)?.name ?? id,
        );
        updated = updateWorkspace(updated, {
          type: "record",
          eventType: "unlocked",
          label: `Unlocked ${names.length} ${names.length === 1 ? "step" : "steps"}: ${names.join(", ")}`,
        });
      }
      if (demo) setDemo(updated);
      else local.setWorkspace(updated);
      if (
        [
          "task",
          "document",
          "unavailable",
          "program",
          "undo",
          "effort",
          "priority",
          "preferred",
        ].includes(action.type)
      )
        setTransition(delta);
    } catch (error) {
      setNotification(
        error instanceof Error
          ? error.message
          : "This change could not be applied. Your previous state was preserved.",
      );
    }
  }
  function complete(id: string) {
    if (id.startsWith("doc:")) {
      const raw = id.slice(4);
      act({ type: "document", id: raw, available: !state.documents[raw] });
      return;
    }
    const node = analysis.nodes.find((n) => n.id === id);
    if (!node || node.type === "gate") return;
    if (analysis.statuses[id] === "blocked" && !state.completed.includes(id))
      return;
    act({ type: "task", id, complete: !state.completed.includes(id) });
  }
  function startDemo(index = 0) {
    setDemo(demoWorkspace(index));
    setScene(index === 2 ? 2 : 0);
    setTransition(null);
    setOnboarding(false);
    navigate(index === 2 ? "Settings" : "Dashboard");
  }
  function exitDemo() {
    setDemo(null);
    setTransition(null);
    navigate("Dashboard");
  }
  function changeScene(index: number) {
    setScene(index);
    navigate(demoScenes[index].tab);
  }
  function exportPacket() {
    download(
      "bridgeback-preparation-packet.txt",
      preparationPacket(state, analysis),
    );
    act({
      type: "record",
      eventType: "export",
      label: `Exported preparation packet for ${analysis.programs.length} plans`,
    });
    setNotification(
      "Preparation packet downloaded. It includes current readiness, accepted alternatives, and next steps.",
    );
  }
  if (!local.ready)
    return (
      <main className="loading" aria-busy="true">
        Opening your private workspace…
      </main>
    );
  return (
    <div className="shell phase-two">
      <a className="skip" href="#main">
        Skip to content
      </a>
      {mobile && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => {
            setMobile(false);
            menu.current?.focus();
          }}
        />
      )}
      <aside
        className={`sidebar ${mobile ? "open" : ""}`}
        aria-label="Workspace navigation"
      >
        <button
          className="brand brand-button"
          onClick={() => navigate("Dashboard")}
          aria-label="BridgeBack home"
        >
          <span className="brand-mark">⌁</span>BridgeBack
          <span className="brand-dot">.</span>
        </button>
        <div className="workspace-label">A WAY FORWARD, TOGETHER</div>
        <nav
          ref={navRef}
          id="main-navigation"
          aria-label="Main navigation"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setMobile(false);
              menu.current?.focus();
            }
          }}
        >
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav ${tab === label ? "active" : ""}`}
              onClick={() => navigate(label)}
              aria-current={tab === label ? "page" : undefined}
            >
              <Icon size={19} />
              {label}
              {tab === label && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-card">
            <ShieldCheck size={24} />
            <strong>Private by design.</strong>
            <p>
              Your documents stay with you.
              <br />
              We only keep track of what’s ready.
            </p>
          </div>
          <button
            className="demo-link"
            onClick={() => (demo ? exitDemo() : startDemo())}
          >
            <Play size={17} />
            {demo ? "Leave demo" : "Explore Demo"}
            <ArrowUpRight size={16} />
          </button>
          <div className="sidebar-foot">
            <span className="avatar">{demo ? "DE" : "BB"}</span>
            <div>
              <strong>{demo ? "Fictional demo" : "My local workspace"}</strong>
              <small>
                {demo ? "Personal progress preserved" : local.saveStatus}
              </small>
            </div>
            <button
              className="icon-button"
              aria-label="Toggle theme"
              onClick={() =>
                act({
                  type: "theme",
                  theme: state.theme === "light" ? "dark" : "light",
                })
              }
            >
              {state.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <button
            ref={menu}
            className="mobile-menu icon-button"
            aria-label={mobile ? "Close menu" : "Open menu"}
            aria-expanded={mobile}
            aria-controls="main-navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <span>
            {demo ? "Demo workspace" : "My workspace"}
            <ChevronRight size={13} />
            <strong>{tab}</strong>
          </span>
          <div>
            <span className="local-badge">
              <span />
              {online
                ? offlineReady
                  ? "Offline ready"
                  : "Local & private"
                : "Offline mode"}
            </span>
            <button
              className="avatar small"
              aria-label="Open profile"
              onClick={() => navigate("Settings")}
            >
              You
            </button>
          </div>
        </header>
        <main id="main" ref={main}>
          <div aria-live="polite" className="announcements">
            {notification && (
              <div className="notice">
                {notification}
                <button
                  className="icon-button"
                  aria-label="Dismiss notification"
                  onClick={() => setNotification("")}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {local.storageError && (
              <div className="notice" role="alert">
                {local.storageError}
                <button
                  className="text-button"
                  onClick={() => navigate("Settings")}
                >
                  Open recovery settings
                </button>
              </div>
            )}
            {!online && (
              <div className="notice">
                <WifiOff size={18} />
                You’re offline. Saved plans, simulations and checklists work
                here. Official availability is not live.
              </div>
            )}
          </div>
          {demo && (
            <DemoGuide
              scene={scene}
              onScene={changeScene}
              onExit={exitDemo}
              onScenario={startDemo}
            />
          )}
          <div className="state-announcement" role="status" aria-live="polite">
            {transition && (
              <>
                <Check size={18} />
                <span>{transition.summary}</span>
                <button
                  className="icon-button"
                  aria-label="Dismiss progress update"
                  onClick={() => setTransition(null)}
                >
                  <X size={16} />
                </button>
              </>
            )}
          </div>
          {tab === "Dashboard" && (
            <>
              <PageHeading
                eyebrow={
                  analysis.programs.length
                    ? "YOUR NEXT CHAPTER"
                    : "FROM “WHAT’S MISSING?” TO “WHAT’S NEXT?”"
                }
                title={
                  analysis.programs.length
                    ? "You have a way forward."
                    : "One step. More possibilities."
                }
                action={
                  <button
                    className="button secondary"
                    onClick={() =>
                      analysis.programs.length
                        ? navigate("PathFinder")
                        : startDemo()
                    }
                  >
                    {analysis.programs.length
                      ? "Open PathFinder"
                      : "Explore Demo"}
                    <ArrowUpRight size={16} />
                  </button>
                }
              >
                {analysis.programs.length
                  ? "Your preparation adapts as things change. Here’s where to focus today."
                  : "Find the obstacle. See your options. Turn confusing requirements into a practical next step."}
              </PageHeading>
              <div className="dashboard-grid">
                <section className="hero journey-hero">
                  <div className="hero-copy">
                    <span className="pill">
                      {analysis.programs.length
                        ? "PATHFINDER · YOUR NEXT BEST ACTION"
                        : "MEET YOUR PREPARATION COMPANION"}
                    </span>
                    <h2>
                      {next
                        ? next.name
                        : analysis.programs.length
                          ? "Your preparation is ready."
                          : "See what one document can unlock."}
                    </h2>
                    <p>
                      {next
                        ? next.explanation.summary
                        : analysis.programs.length
                          ? "Review your packet and confirm current instructions with a provider. Preparation never guarantees acceptance."
                          : "A missing document can hold up more than one plan. BridgeBack shows the connection—and helps you find another route."}
                    </p>
                    <div className="inline-actions">
                      <button
                        className="button white"
                        onClick={() =>
                          analysis.programs.length
                            ? navigate("PathFinder")
                            : setOnboarding(true)
                        }
                      >
                        {analysis.programs.length
                          ? next
                            ? "Take this step"
                            : "Review my path"
                          : local.workspace.onboarding.step
                            ? "Continue my starting point"
                            : "Find my starting point"}
                        <ArrowRight size={17} />
                      </button>
                      {!analysis.programs.length && (
                        <button
                          className="hero-demo"
                          onClick={() => startDemo()}
                        >
                          <Play size={15} />
                          Explore a 2-minute demo
                        </button>
                      )}
                    </div>
                    <div className="hero-note">
                      <ShieldCheck size={15} />
                      No account. No uploads. At your pace.
                    </div>
                  </div>
                  <div
                    className="journey-preview"
                    aria-label="Computed sample dependency preview"
                  >
                    <div className="preview-document">
                      <FileCheck2 size={24} />
                      <strong>One pay stub</strong>
                      <span>Fictional example</span>
                    </div>
                    <div className="preview-branches" aria-hidden="true" />
                    <div className="preview-plans">
                      {example.programs.map((p) => (
                        <div key={p.id}>
                          <LockKeyhole size={14} />
                          {programs.find((x) => x.id === p.id)?.shortName}
                          <span>Form waiting</span>
                        </div>
                      ))}
                    </div>
                    <span className="preview-caption">
                      Accepted explicitly by both sample plans
                    </span>
                  </div>
                </section>
                <section className="card readiness">
                  <div className="card-top">
                    <h2>Preparation readiness</h2>
                  </div>
                  <div
                    className="progress-ring"
                    style={{
                      background: `conic-gradient(var(--teal) ${analysis.readiness}%, var(--border) 0)`,
                    }}
                  >
                    <div>
                      <strong>
                        {analysis.readiness}
                        <span>%</span>
                      </strong>
                      <small>prepared</small>
                    </div>
                  </div>
                  <p>
                    {analysis.programs.length
                      ? `${analysis.complete} of ${analysis.total} milestones complete`
                      : "Choose a plan to see your own progress."}
                  </p>
                  <div className="mini-divider" />
                  <span className="tiny">
                    Preparation progress, never an approval estimate
                  </span>
                </section>
              </div>
              {next && (
                <div className="dashboard-explanation">
                  <Explain explanation={next.explanation} />
                </div>
              )}
              <div className="stats-grid">
                <button className="stat" onClick={() => navigate("Discover")}>
                  <span className="stat-icon mint">
                    <Compass />
                  </span>
                  <div>
                    <span>Plans in your workspace</span>
                    <strong>
                      {analysis.programs.length}
                      <small>Program-specific rules</small>
                    </strong>
                  </div>
                  <ChevronRight />
                </button>
                <button className="stat" onClick={() => navigate("PathFinder")}>
                  <span className="stat-icon sand">
                    <Route />
                  </span>
                  <div>
                    <span>Steps ready to start</span>
                    <strong>
                      {analysis.actions.length}
                      <small>Dependencies resolved</small>
                    </strong>
                  </div>
                  <ChevronRight />
                </button>
                <button className="stat" onClick={() => navigate("Documents")}>
                  <span className="stat-icon blue">
                    <FileCheck2 />
                  </span>
                  <div>
                    <span>Documents that can be reused</span>
                    <strong>
                      {
                        analysis.documents.filter(
                          (d) => d.programIds.length > 1,
                        ).length
                      }
                      <small>Explicit acceptance only</small>
                    </strong>
                  </div>
                  <ChevronRight />
                </button>
              </div>
              <div className="lower-grid">
                <section className="card">
                  <div className="card-top">
                    <h2>Your preparation routes</h2>
                    <button
                      className="text-button"
                      onClick={() => navigate("Discover")}
                    >
                      Manage plans
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  {analysis.programs.length ? (
                    analysis.programs.map((p) => (
                      <div className="dashboard-plan" key={p.id}>
                        <div>
                          <strong>{p.name}</strong>
                          <span className="tag">FICTIONAL</span>
                        </div>
                        <Progress
                          value={p.readiness}
                          label={`${p.complete} of ${p.total} milestones`}
                        />
                        <p>{p.screening.result} under fictional criteria</p>
                      </div>
                    ))
                  ) : (
                    <div className="empty">
                      <span className="empty-icon">
                        <GitBranch size={30} />
                      </span>
                      <h2>Start with a route, not a blank form.</h2>
                      <p>
                        Your next action comes from actual requirements and
                        accepted alternatives. Try it with a fictional
                        applicant.
                      </p>
                      <button
                        className="button secondary"
                        onClick={() => startDemo()}
                      >
                        Try a guided demo
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                  <div className="gentle-note">
                    <Leaf size={17} />
                    Small steps still move you forward.
                  </div>
                </section>
                <section className="card">
                  <div className="card-top">
                    <h2>
                      {analysis.barriers.length
                        ? "BarrierBreak · what’s in the way"
                        : "Clarity before commitment"}
                    </h2>
                  </div>
                  {analysis.barriers.length ? (
                    <>
                      <div className="dashboard-barrier">
                        <span className="tag">HIGHEST DOWNSTREAM IMPACT</span>
                        <h3>{analysis.barriers[0].name}</h3>
                        <p>{analysis.barriers[0].explanation.summary}</p>
                        <button
                          className="button secondary"
                          onClick={() => navigate("PathFinder")}
                        >
                          Explore the alternatives
                          <ArrowRight size={16} />
                        </button>
                      </div>
                      <Explain explanation={analysis.barriers[0].explanation} />
                    </>
                  ) : (
                    <div className="tips">
                      <div>
                        <span>01</span>
                        <div>
                          <strong>Understand the obstacle</strong>
                          <p>
                            See which requirements are holding up your next
                            steps.
                          </p>
                        </div>
                      </div>
                      <div>
                        <span>02</span>
                        <div>
                          <strong>Try a different route</strong>
                          <p>
                            Simulate a document or find an accepted alternative.
                          </p>
                        </div>
                      </div>
                      <div>
                        <span>03</span>
                        <div>
                          <strong>Make one useful move</strong>
                          <p>Update once. Every selected plan recalculates.</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="deadline-note">
                    No verified upcoming deadlines are loaded. Check directly
                    with each official provider.
                  </div>
                </section>
              </div>
            </>
          )}
          {tab === "Discover" && (
            <Discover
              state={state}
              analysis={analysis}
              onAction={act}
              onPath={() => navigate("PathFinder")}
            />
          )}
          {tab === "PathFinder" && (
            <PathFinder
              input={state}
              analysis={analysis}
              onComplete={complete}
              onEffort={(id, value) => act({ type: "effort", id, value })}
              highlightedIds={transition?.newlyAvailable}
            />
          )}
          {tab === "Documents" && (
            <>
              <Documents
                input={state}
                analysis={analysis}
                onDocument={(id, available) =>
                  act({ type: "document", id, available })
                }
                onUnavailable={(id, value) =>
                  act({ type: "unavailable", id, value })
                }
                onExport={exportPacket}
              />
              {analysis.documents.length > 0 && (
                <details className="card expiration-panel">
                  <summary>Optional document expiration reminders</summary>
                  <p>
                    Dates are reminders only. They do not change acceptance
                    rules or count as verified agency deadlines.
                  </p>
                  <div className="expiration-grid">
                    {analysis.documents.map((d) => (
                      <label key={d.id}>
                        {d.name}
                        <input
                          aria-label={`Expiration date for ${d.name}`}
                          type="date"
                          value={state.expires[d.id] ?? ""}
                          onChange={(e) =>
                            act({
                              type: "expiration",
                              id: d.id,
                              value: e.target.value,
                            })
                          }
                        />
                        {state.expires[d.id] &&
                          state.expires[d.id] <
                            new Date().toISOString().slice(0, 10) && (
                            <small className="amber">
                              This date has passed. Check whether a newer
                              document is needed.
                            </small>
                          )}
                      </label>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
          {tab === "Timeline" && <Timeline state={state} onAction={act} />}
          {tab === "Settings" && (
            <SettingsView
              state={state}
              onAction={act}
              storageError={local.storageError}
              isDemo={!!demo}
              onDelete={async () => {
                if (demo) {
                  setDemo(demoWorkspace());
                  setTransition(null);
                  setNotification(
                    "Fictional demo reset. Your personal workspace is unchanged.",
                  );
                } else {
                  await local.reset();
                  setTransition(null);
                  setNotification(
                    "Your saved profile and progress have been deleted.",
                  );
                }
              }}
            />
          )}
          <footer>
            <span className="footer-brand">BridgeBack</span>
            <span>Your path to housing, made clear.</span>
            <span>
              <LockKeyhole size={13} />
              Local-first. Human-centered.
            </span>
          </footer>
        </main>
      </div>
      <Onboarding
        open={onboarding}
        onClose={() => setOnboarding(false)}
        state={state}
        onAction={act}
        onFinish={() => {
          setOnboarding(false);
          navigate(state.selectedProgramIds.length ? "PathFinder" : "Discover");
          setNotification(
            "Your starting point is saved. Explore the next steps and the reasons behind them.",
          );
        }}
      />
    </div>
  );
}
