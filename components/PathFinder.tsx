"use client";
import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  GitBranch,
  ListChecks,
  LockKeyhole,
  Map as MapIcon,
  ShieldCheck,
  Sparkles,
  Undo2,
  WandSparkles,
  X,
} from "lucide-react";
import { topologicalSort } from "../lib/engine";
import {
  simulatePlan,
  type PlannerInput,
  type PlanAnalysis,
} from "../lib/planner";
import { Explain } from "./Explain";

export type PathFinderProps = {
  input: PlannerInput;
  analysis: PlanAnalysis;
  onComplete: (id: string) => void;
  onEffort: (id: string, value: number) => void;
  highlightedIds?: string[];
};

function programIdsFor(id: string, analysis: PlanAnalysis): string[] {
  const known =
    analysis.actions.find((action) => action.id === id)?.programIds ??
    analysis.barriers.find((barrier) => barrier.id === id)?.programIds ??
    analysis.documents.find((document) => `doc:${document.id}` === id)
      ?.programIds;
  if (known) return known;
  return analysis.programs
    .filter(
      (program) =>
        id.startsWith(`${program.id}:`) || id.startsWith(`${program.id}-`),
    )
    .map((program) => program.id);
}

export function PathFinder({
  input,
  analysis,
  onComplete,
  onEffort,
  highlightedIds = [],
}: PathFinderProps) {
  const [view, setView] = useState<"checklist" | "map">("checklist");
  const [scope, setScope] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const names = new Map(analysis.nodes.map((node) => [node.id, node.name]));
  const recommended = analysis.actions[0];
  const selected = analysis.nodes.find((node) => node.id === selectedId);
  const simulatedAction = analysis.actions.find(
    (action) => action.id === simulationId,
  );
  const simulation = useMemo(
    () => (simulatedAction ? simulatePlan(input, simulatedAction.id) : null),
    [input, simulatedAction],
  );
  function previewStep(id: string) {
    setSimulationId(id);
    requestAnimationFrame(() =>
      document.querySelector(".what-if-panel")?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      }),
    );
  }
  const activeScope = analysis.programs.some((program) => program.id === scope)
    ? scope
    : "all";
  const visibleIds = useMemo(() => {
    if (activeScope === "all")
      return new Set(analysis.nodes.map((node) => node.id));
    const visible = new Set(
      analysis.nodes
        .filter((node) =>
          programIdsFor(node.id, analysis).includes(activeScope),
        )
        .map((node) => node.id),
    );
    const addParents = (id: string) => {
      const node = analysis.nodes.find((item) => item.id === id);
      if (!node) return;
      for (const parent of [...node.all, ...node.any])
        if (!visible.has(parent)) {
          visible.add(parent);
          addParents(parent);
        }
    };
    [...visible].forEach(addParents);
    return visible;
  }, [activeScope, analysis]);
  const graph = useMemo(() => {
    const depths = new Map<string, number>();
    const lanes = new Map<number, number>();
    const nodeMap = new Map(analysis.nodes.map((node) => [node.id, node]));
    const nodes: Node[] = [];
    for (const id of topologicalSort(analysis.nodes)) {
      const node = nodeMap.get(id)!;
      const depth =
        Math.max(
          -1,
          ...[...node.all, ...node.any].map(
            (parent) => depths.get(parent) ?? 0,
          ),
        ) + 1;
      depths.set(id, depth);
      if (!visibleIds.has(id)) continue;
      const lane = lanes.get(depth) ?? 0;
      lanes.set(depth, lane + 1);
      const status = analysis.statuses[id];
      const shared = programIdsFor(id, analysis).length;
      nodes.push({
        id,
        position: { x: depth * 255, y: lane * 112 },
        data: {
          label: (
            <div className="journey-node-label">
              <span>
                {status === "complete" ? (
                  <Check size={15} aria-hidden="true" />
                ) : status === "blocked" ? (
                  <LockKeyhole size={14} aria-hidden="true" />
                ) : (
                  <span className="journey-node-dot" />
                )}
                {node.name}
              </span>
              <small>
                {status === "complete"
                  ? "Complete"
                  : status === "blocked"
                    ? "Needs something first"
                    : "Ready to prepare"}
                {shared > 1 ? ` · ${shared} plans` : ""}
                {recommended?.id === id ? " · Recommended" : ""}
              </small>
            </div>
          ),
        },
        className: `journey-node ${status} ${recommended?.id === id ? "recommended" : ""} ${highlightedIds.includes(id) ? "newly-unlocked" : ""}`,
        style: { width: 210 },
        ariaLabel: `${node.name}, ${status}${recommended?.id === id ? ", recommended" : ""}. Select for details.`,
        selected: id === selectedId,
      });
    }
    const edges: Edge[] = analysis.nodes
      .filter((node) => visibleIds.has(node.id))
      .flatMap((node) =>
        [...node.all, ...node.any]
          .filter((id) => visibleIds.has(id))
          .map((id) => ({
            id: `${id}->${node.id}`,
            source: id,
            target: node.id,
            label: node.any.includes(id) ? "One option" : "Needed first",
            animated: false,
            className:
              analysis.statuses[id] === "complete"
                ? "journey-edge complete"
                : "journey-edge",
            style: {
              stroke:
                analysis.statuses[id] === "complete"
                  ? "var(--teal)"
                  : "var(--muted)",
            },
            labelStyle: { fill: "var(--text)", fontSize: 10 },
            labelBgStyle: { fill: "var(--surface)" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--muted)" },
          })),
      );
    return { nodes, edges };
  }, [analysis, visibleIds, recommended?.id, selectedId, highlightedIds]);
  const taskNodes = analysis.nodes.filter(
    (node) => visibleIds.has(node.id) && node.type !== "gate",
  );

  if (!analysis.programs.length)
    return (
      <section className="card empty">
        <GitBranch size={32} />
        <h1>My checklist</h1>
        <h2>Choose a plan to make a checklist.</h2>
        <p>
          Open Find help and add a practice plan, or use Explore Demo to try a
          ready-made example.
        </p>
      </section>
    );
  return (
    <div className="pathfinder">
      <section className="pathfinder-intro">
        <div>
          <div className="eyebrow">
            <GitBranch size={15} /> PathFinder
          </div>
          <h1>Your next steps</h1>
          <p>
            Check off documents you have and tasks you have finished. A waiting
            step tells you what it still needs. You can change a check mark if
            you make a mistake.
          </p>
        </div>
        <div className="pathfinder-total">
          <strong>
            {analysis.readiness}
            <span>%</span>
          </strong>
          <div>
            <span>of your checklist finished</span>
            <small>
              {analysis.complete} of {analysis.total} steps
            </small>
          </div>
        </div>
      </section>
      <div className="pf-program-progress">
        {analysis.programs.map((program) => (
          <button
            key={program.id}
            className={`pf-program-pill ${activeScope === program.id ? "selected" : ""}`}
            aria-pressed={activeScope === program.id}
            onClick={() =>
              setScope(activeScope === program.id ? "all" : program.id)
            }
          >
            <span>{program.name}</span>
            <strong>{program.readiness}%</strong>
            <span className="pf-progress-track">
              <span style={{ width: `${program.readiness}%` }} />
            </span>
          </button>
        ))}
      </div>
      {analysis.deadlineConflicts.map((conflict) => (
        <section className="pf-change-note" key={conflict.date}>
          <CircleHelp size={22} aria-hidden="true" />
          <div>
            <strong>Verified deadlines share {conflict.date}</strong>
            <p>{conflict.explanation}</p>
            <p>{conflict.ids.map((id) => names.get(id) ?? id).join(" · ")}</p>
          </div>
        </section>
      ))}
      {highlightedIds.length > 0 && (
        <div className="pf-change-note newly-unlocked" role="status">
          <Sparkles size={19} aria-hidden="true" />
          <div>
            <strong>
              {highlightedIds.length}{" "}
              {highlightedIds.length === 1 ? "step is" : "steps are"} now
              available.
            </strong>
            <p>{highlightedIds.map((id) => names.get(id) ?? id).join(" · ")}</p>
          </div>
        </div>
      )}
      {recommended && (
        <section className="pf-next">
          <div className="pf-next-icon">
            <ArrowRight size={23} />
          </div>
          <div className="pf-next-copy">
            <span className="eyebrow">Start here</span>
            <h2>{recommended.name}</h2>
            <p>{recommended.explanation.summary}</p>
            <Explain explanation={recommended.explanation} />
          </div>
          <div className="pf-next-actions">
            <button
              className="button primary"
              onClick={() => onComplete(recommended.id)}
            >
              <Check size={16} />
              Mark this step done
            </button>
            <button
              className="button secondary"
              onClick={() => previewStep(recommended.id)}
            >
              <WandSparkles size={16} />
              What if I do this?
            </button>
          </div>
        </section>
      )}
      {!recommended && analysis.readiness === 100 && (
        <section className="pf-change-note">
          <ShieldCheck size={23} />
          <div>
            <strong>Your preparation steps are finished.</strong>
            <p>
              Review your packet and confirm current instructions with the
              provider. Preparation is not approval.
            </p>
          </div>
        </section>
      )}
      <section className="card journey-panel">
        <div className="pf-section-header">
          <div>
            <span className="eyebrow">Your checklist</span>
            <h2>
              {activeScope === "all"
                ? "All the steps"
                : analysis.programs.find(
                    (program) => program.id === activeScope,
                  )?.name}
            </h2>
          </div>
          <div className="segmented">
            <button
              aria-pressed={view === "checklist"}
              onClick={() => setView("checklist")}
            >
              <ListChecks size={15} />
              Checklist
            </button>
            <button
              aria-pressed={view === "map"}
              onClick={() => setView("map")}
            >
              <MapIcon size={15} />
              Journey map
            </button>
          </div>
        </div>
        <p className="helper-text">
          Check a box only when the document is available or the task is
          finished. For a waiting task, gather the items listed under “Needs”
          first. Nothing is sent to an agency.
        </p>
        <div className="journey-toolbar">
          <label className="pf-field">
            Show steps for
            <select
              value={activeScope}
              onChange={(event) => setScope(event.target.value)}
            >
              <option value="all">All selected plans</option>
              {analysis.programs.map((program) => (
                <option value={program.id} key={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </label>
          <div className="journey-legend">
            <span>
              <i className="legend-complete" />
              Done
            </span>
            <span>
              <i className="legend-available" />
              Can do now
            </span>
            <span>
              <i className="legend-blocked" />
              Waiting
            </span>
          </div>
        </div>
        {view === "map" && (
          <>
            <div
              className="pf-flow"
              role="region"
              aria-label="PathFinder interactive dependency map"
            >
              <ReactFlow
                key={activeScope}
                nodes={graph.nodes}
                edges={graph.edges}
                fitView
                minZoom={0.2}
                maxZoom={1.5}
                nodesDraggable={false}
                nodesConnectable={false}
                onNodeClick={(_, node) => setSelectedId(node.id)}
                onNodeDoubleClick={(_, node) => setSelectedId(node.id)}
                proOptions={{ hideAttribution: false }}
              >
                <Background gap={22} />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
            <p className="map-help">
              Drag the map to move around, or use the zoom buttons. Select a box
              to see what it needs. “Needed first” means you need that item;
              “One option” means you can choose one of the listed papers.
            </p>
          </>
        )}
        {selected && (
          <div className="node-detail">
            <div className="pf-section-header">
              <div>
                <span className="eyebrow">About this step</span>
                <h3>{selected.name}</h3>
              </div>
              <button
                className="icon-button"
                aria-label="Close requirement details"
                onClick={() => setSelectedId(null)}
              >
                <X size={17} />
              </button>
            </div>
            <p>{selected.description}</p>
            {selected.all.length > 0 && (
              <p>
                <strong>All required:</strong>{" "}
                {selected.all.map((id) => names.get(id) ?? id).join(", ")}
              </p>
            )}
            {selected.any.length > 0 && (
              <p>
                <strong>Choose one:</strong>{" "}
                {selected.any.map((id) => names.get(id) ?? id).join(" or ")}
              </p>
            )}
            <p className="node-source">Source: {selected.source}</p>
            {selected.any.length > 0 && (
              <div className="node-alternative-actions">
                {selected.any
                  .filter((id) =>
                    analysis.actions.some((action) => action.id === id),
                  )
                  .map((id) => (
                    <button
                      key={id}
                      className="button secondary"
                      onClick={() => previewStep(id)}
                    >
                      Preview {names.get(id) ?? id}
                      <WandSparkles size={14} />
                    </button>
                  ))}
              </div>
            )}
            {analysis.actions.find((action) => action.id === selected.id) && (
              <button
                className="button secondary"
                onClick={() => previewStep(selected.id)}
              >
                Preview this step <WandSparkles size={15} />
              </button>
            )}
          </div>
        )}
        <div className={view === "map" ? "pf-map-checklist" : "pf-checklist"}>
          {view === "map" && <h3>Accessible task checklist</h3>}
          {taskNodes.map((node) => {
            const status = analysis.statuses[node.id];
            const action = analysis.actions.find((item) => item.id === node.id);
            const owners = programIdsFor(node.id, analysis)
              .map(
                (id) =>
                  analysis.programs.find((program) => program.id === id)?.name,
              )
              .filter(Boolean);
            const blockedBy = node.all.filter(
              (id) => analysis.statuses[id] !== "complete",
            );
            const alternatives =
              node.any.length &&
              !node.any.some((id) => analysis.statuses[id] === "complete")
                ? node.any
                : [];
            return (
              <article
                className={`pf-task ${highlightedIds.includes(node.id) ? "newly-unlocked" : ""} ${status}`}
                key={node.id}
              >
                <button
                  className={`check ${status}`}
                  disabled={
                    status === "blocked" ||
                    input.unavailable.includes(node.id.replace(/^doc:/, ""))
                  }
                  aria-label={`${status === "complete" ? "Reopen" : "Complete"} ${node.name}`}
                  aria-pressed={status === "complete"}
                  onClick={() => onComplete(node.id)}
                >
                  {status === "complete" ? (
                    <Check size={17} />
                  ) : status === "blocked" ? (
                    <LockKeyhole size={15} />
                  ) : null}
                </button>
                <div className="pf-task-body">
                  <div className="pf-task-heading">
                    <h3>{node.name}</h3>
                    <span className={`pf-status ${status}`}>
                      {input.unavailable.includes(node.id.replace(/^doc:/, ""))
                        ? "Unavailable"
                        : node.type === "document" &&
                            status === "available" &&
                            !action
                          ? "Optional alternative"
                          : {
                              complete: "Done",
                              available: "Can do now",
                              blocked: "Waiting",
                            }[status]}
                    </span>
                  </div>
                  <p>{node.description}</p>
                  {owners.length > 0 && (
                    <div className="program-tags">
                      {owners.map((owner) => (
                        <span key={owner}>{owner}</span>
                      ))}
                      {owners.length > 1 && (
                        <span className="shared-tag">
                          One task · {owners.length} plans
                        </span>
                      )}
                    </div>
                  )}
                  {blockedBy.length > 0 && (
                    <p className="pf-blocker-text">
                      Needs:{" "}
                      {blockedBy.map((id) => names.get(id) ?? id).join(", ")}
                    </p>
                  )}
                  {alternatives.length > 0 && (
                    <p className="pf-blocker-text">
                      One of:{" "}
                      {alternatives
                        .map((id) => names.get(id) ?? id)
                        .join(" or ")}
                    </p>
                  )}
                  <div className="pf-task-footer">
                    {status !== "complete" && (
                      <label className="pf-effort">
                        How hard is this for you?
                        <select
                          aria-label={`Effort for ${node.name}`}
                          value={input.effort[node.id] ?? ""}
                          onChange={(event) =>
                            onEffort(node.id, Number(event.target.value))
                          }
                        >
                          <option value="" disabled>
                            Not rated
                          </option>
                          <option value={1}>Straightforward</option>
                          <option value={2}>A little effort</option>
                          <option value={3}>Some effort</option>
                          <option value={4}>Substantial effort</option>
                          <option value={5}>Difficult</option>
                        </select>
                      </label>
                    )}
                    {action && (
                      <>
                        <button
                          className="text-button"
                          onClick={() => previewStep(node.id)}
                        >
                          Preview this step <WandSparkles size={14} />
                        </button>
                        <Explain explanation={action.explanation} />
                      </>
                    )}
                    {status === "complete" && (
                      <button
                        className="text-button"
                        onClick={() => onComplete(node.id)}
                      >
                        <Undo2 size={13} />
                        Correct this step
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <div className="planning-tools-heading">
        <h2>Check another option before you act</h2>
        <p>
          These tools explain what is holding things up and let you preview a
          change.
        </p>
      </div>
      <div className="pf-workspace-grid">
        <section className="card barrier-panel" aria-labelledby="barrier-title">
          <div className="pf-section-header">
            <div>
              <span className="eyebrow">BarrierBreak</span>
              <h2 id="barrier-title">What’s holding things up?</h2>
            </div>
            <GitBranch size={22} aria-hidden="true" />
          </div>
          <p className="pf-section-description">
            These missing items are connected to later steps. An item near the
            top affects more of your checklist, but other missing things may
            also need attention.
          </p>
          {analysis.barriers.length ? (
            <div className="barrier-list">
              {analysis.barriers.slice(0, 4).map((barrier, index) => (
                <article className="barrier-item" key={barrier.id}>
                  <span className="barrier-rank">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{barrier.name}</h3>
                    <p>
                      {barrier.blockedCount} later{" "}
                      {barrier.blockedCount === 1 ? "step" : "steps"} affected ·{" "}
                      {barrier.actionable
                        ? "You can work on this now"
                        : "Needs another item first"}
                    </p>
                    {barrier.alternativeIds.length > 0 && (
                      <small className="barrier-alternatives">
                        Other routes vary by program:{" "}
                        {barrier.alternativeIds
                          .map((id) => names.get(id) ?? id)
                          .join(" · ")}
                      </small>
                    )}
                    {barrier.effort !== null && (
                      <small>
                        Your reported effort: {barrier.effort} of 5.
                      </small>
                    )}
                    {barrier.deadline && (
                      <small>
                        Verified deadline: {barrier.deadline.date} for{" "}
                        {barrier.deadline.taskName}
                        {barrier.deadline.days < 0
                          ? " (passed; confirm options with the provider)"
                          : ""}
                        .
                      </small>
                    )}
                    <Explain explanation={barrier.explanation} />
                    <button
                      className="text-button"
                      onClick={() => {
                        setSelectedId(barrier.id);
                        if (
                          analysis.actions.some(
                            (action) => action.id === barrier.id,
                          )
                        )
                          setSimulationId(barrier.id);
                      }}
                    >
                      Explore this obstacle <ChevronRight size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="pf-small-empty">
              <Check size={22} />
              <p>
                No unresolved obstacles in this plan. Review your next available
                action.
              </p>
            </div>
          )}
        </section>
        <section className="card what-if-panel" aria-labelledby="what-if-title">
          <div className="pf-section-header">
            <div>
              <span className="eyebrow">Preview a change</span>
              <h2 id="what-if-title">See what would change</h2>
            </div>
            <WandSparkles size={22} aria-hidden="true" />
          </div>
          <p className="pf-section-description">
            For example: what if you got your pay stub? Pick a step below to see
            what would become ready. This will not check it off your real
            checklist.
          </p>
          <label className="pf-field">
            Choose a step to preview
            <select
              value={simulatedAction?.id ?? ""}
              onChange={(event) => setSimulationId(event.target.value || null)}
            >
              <option value="">Choose a step</option>
              {analysis.actions.map((action) => (
                <option key={action.id} value={action.id}>
                  {action.name}
                </option>
              ))}
            </select>
          </label>
          {simulation && simulatedAction ? (
            <div className="simulation-result" aria-live="polite">
              <span className="simulation-label">
                Preview only — not marked done
              </span>
              <div className="simulation-scores">
                <div>
                  <span>Your checklist now</span>
                  <strong>{simulation.before.readiness}%</strong>
                </div>
                <ArrowRight size={23} />
                <div>
                  <span>After this step</span>
                  <strong>{simulation.after.readiness}%</strong>
                </div>
              </div>
              <div className="simulation-metrics">
                <span>
                  <strong>{simulation.newlyAvailable.length}</strong> newly
                  available
                </span>
                <span>
                  {simulation.before.complete} to {simulation.after.complete} of{" "}
                  {simulation.after.total} steps finished
                </span>
              </div>
              <h3>Steps you could start next</h3>
              {simulation.newlyAvailable.length ? (
                <ul>
                  {simulation.newlyAvailable.map((id) => (
                    <li key={id}>{names.get(id) ?? id}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  No extra steps become ready immediately. This still prepares
                  part of your checklist; later steps may need other items too.
                </p>
              )}
              <p className="simulation-next">
                <strong>Then:</strong>{" "}
                {simulation.after.actions[0]?.name ??
                  (simulation.after.readiness === 100
                    ? "Review your completed preparation."
                    : "Review unavailable document routes in Documents.")}
              </p>
              <p className="simulation-next">
                {simulation.after.barriers.length} remaining{" "}
                {simulation.after.barriers.length === 1
                  ? "obstacle"
                  : "obstacles"}
                .
              </p>
              <p className="helper-text">
                Only update your checklist if you have actually done this step.
                Otherwise, close the preview.
              </p>
              <button
                className="button primary"
                onClick={() => {
                  onComplete(simulatedAction.id);
                  setSimulationId(null);
                }}
              >
                <Check size={16} />
                Update my checklist
              </button>
              <button
                className="text-button"
                onClick={() => setSimulationId(null)}
              >
                Close preview
              </button>
            </div>
          ) : (
            <div className="pf-small-empty">
              <CircleHelp size={30} />
              <p>
                Choose a step above. You’ll see the new checklist progress,
                which tasks become ready and what would still be missing.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
