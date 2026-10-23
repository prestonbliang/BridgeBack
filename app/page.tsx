"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Compass,
  FileCheck2,
  GitBranch,
  Home,
  LockKeyhole,
  Menu,
  Moon,
  Play,
  Settings,
  ShieldCheck,
  Sun,
  WifiOff,
  X,
  CircleHelp,
  History,
  LifeBuoy,
} from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import {
  initialWorkspace,
  updateWorkspace,
  type Workspace,
  type WorkspaceAction,
} from "../lib/workspace";
import {
  evaluatePlan,
  simulatePlan,
  transitionPlan,
  type Transition,
} from "../lib/planner";
import { preparationPacket } from "../lib/packet";
import { PathFinder } from "../components/PathFinder";
import { Documents } from "../components/Documents";
import { Onboarding } from "../components/Onboarding";
import {
  Discover,
  SettingsView,
  Timeline,
  DemoGuide,
  demoScenes,
} from "../components/WorkspaceViews";
import { download } from "../components/ui";
import { Overview } from "../components/Overview";
import { HelpGuide, PageHelp } from "../components/Help";
import { Support } from "../components/Support";
import { isNativeApp, clearInterruptedExports } from "../lib/platform";
const navigation = [
  { label: "Dashboard", title: "Overview", icon: Home },
  { label: "Discover", title: "Find help", icon: Compass },
  { label: "PathFinder", title: "My checklist", icon: GitBranch },
  { label: "Documents", title: "Documents", icon: FileCheck2 },
  { label: "Support", title: "Get support", icon: LifeBuoy },
  { label: "Timeline", title: "Activity", icon: History },
  { label: "Settings", title: "Settings", icon: Settings },
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
  const example = useMemo(
    () => simulatePlan(demoWorkspace(), "doc:paystub"),
    [],
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [supportTarget, setSupportTarget] = useState<string | null>(null);
  const [supportSection, setSupportSection] = useState<"step" | "person">(
    "step",
  );
  const exporting = useRef(false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if (isNativeApp()) {
      document.documentElement.dataset.platform = "native";
      setOfflineReady(true);
      void clearInterruptedExports().catch(() =>
        setNotification(
          "An earlier shared export could not be cleared from temporary app storage. You can retry by restarting the app.",
        ),
      );
    } else if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
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
          label: `Sample rules checked again: ${screened.map((program) => `${program.name} — ${program.screening.result.toLowerCase()} under fictional criteria`).join("; ")}. This is not an official decision.`,
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
          "support-finish",
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
  function getSupport(id: string) {
    setSupportSection("step");
    setSupportTarget(id);
    navigate("Support");
  }
  function localHelp() {
    setSupportTarget("general");
    setSupportSection("person");
    navigate("Support");
  }
  function startDemo(index = 0) {
    setSupportTarget(null);
    setSupportSection("step");
    setDemo(demoWorkspace(index));
    setScene(index === 2 ? 2 : 0);
    setTransition(null);
    setOnboarding(false);
    navigate(index === 2 ? "Settings" : "Dashboard");
  }
  function exitDemo() {
    setSupportTarget(null);
    setSupportSection("step");
    setDemo(null);
    setTransition(null);
    navigate("Dashboard");
  }
  function changeScene(index: number) {
    setScene(index);
    navigate(demoScenes[index].tab);
  }
  async function exportPacket() {
    if (exporting.current) return;
    exporting.current = true;
    try {
      const result = await download(
        "bridgeback-preparation-packet.txt",
        preparationPacket(state, analysis),
      );
      if (result === "cancelled") {
        setNotification("Sharing cancelled. Your checklist is unchanged.");
        return;
      }
      act({
        type: "record",
        eventType: "export",
        label: `Exported preparation packet for ${analysis.programs.length} plans`,
      });
      setNotification(
        result === "shared"
          ? "You shared your preparation checklist using the system share sheet. BridgeBack did not submit an application."
          : "Your checklist was downloaded. It includes what you have, what is still missing, and the next steps. Nothing was sent to an agency.",
      );
    } catch {
      setNotification(
        "We could not confirm the export finished. Check your chosen destination before trying again. Your saved checklist is unchanged.",
      );
    } finally {
      exporting.current = false;
    }
  }
  if (!local.ready)
    return (
      <main className="loading" aria-busy="true">
        Opening your saved checklist…
      </main>
    );
  return (
    <div className="shell phase-two human-ui">
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
          <span className="brand-mark">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path
                d="M4 24V10m24 14V10M4 16c7-10 17-10 24 0M4 24h24M11 10v14m10-14v14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          BridgeBack
        </button>
        <div className="workspace-label">Housing application help</div>
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
          {navigation.map(({ label, title, icon: Icon }) => (
            <button
              key={label}
              className={`nav ${tab === label ? "active" : ""}`}
              onClick={() => navigate(label)}
              aria-current={tab === label ? "page" : undefined}
            >
              <Icon size={19} />
              {title}
              {tab === label && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-card">
            <ShieldCheck size={24} />
            <strong>No document uploads</strong>
            <p>
              Just check off the papers you have. Keep the actual files with
              you.
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
              <strong>
                {demo ? "Fictional demo" : "Saved in this browser"}
              </strong>
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
            <strong>
              {navigation.find((item) => item.label === tab)?.title}
            </strong>
          </span>
          <div>
            <button className="help-trigger" onClick={() => setHelpOpen(true)}>
              <CircleHelp size={18} aria-hidden="true" />
              Help
            </button>
            <span className="local-badge">
              <span />
              {online
                ? offlineReady
                  ? "Offline ready"
                  : "Saved here"
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
          <PageHelp page={tab} />
          {tab === "Dashboard" && (
            <Overview
              analysis={analysis}
              example={example}
              resume={local.workspace.onboarding.step > 0}
              onStart={() => setOnboarding(true)}
              onDemo={() => startDemo()}
              onDiscover={() => navigate("Discover")}
              onPath={() => navigate("PathFinder")}
              onDocuments={() => navigate("Documents")}
              helpNotes={state.supportRecords}
              onSupport={() => {
                setSupportTarget(null);
                setSupportSection("step");
                navigate("Support");
              }}
              onLocalHelp={localHelp}
            />
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
              onSupport={getSupport}
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
                onSupport={getSupport}
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
          {tab === "Support" && (
            <Support
              state={state}
              analysis={analysis}
              initialTarget={supportTarget}
              initialSection={supportSection}
              onAction={act}
              onNavigate={navigate}
              onReopen={complete}
            />
          )}
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
          <HelpGuide
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            page={tab}
          />
          <footer>
            <span className="footer-brand">BridgeBack</span>
            <span>Your path to housing, made clear.</span>
            <span>
              <LockKeyhole size={13} />
              Your checklist stays in this browser.
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
            "Your answers are saved. Choose a plan or open your checklist to see what to gather first.",
          );
        }}
      />
    </div>
  );
}
