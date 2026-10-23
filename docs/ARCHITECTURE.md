# BridgeBack architecture — Phase 2

## Existing foundation, clearer boundaries

Next.js App Router, React, strict TypeScript, Dexie, Zod, Lucide and React Flow remain the stack. No backend, account, external database or language model is required. The interface uses a navy navigation rail and a readable help-desk layout, with locally hosted Atkinson Hyperlegible type, dark mode and large-text preferences. See `DESIGN.md` for the design sources and rationale.

- `lib/engine.ts`: compatible original deterministic engine, graph validation and topological sorting. Mixed-consumer OR handling is corrected; recorded deadlines are not mislabeled as verified.
- `lib/programs.ts`: explicit program entities, canonical document types, per-program acceptance gates, screening criteria and source provenance. All shipped program rules are fictional.
- `lib/planner.ts`: compiles a selected-program DAG, computes statuses/readiness, actual action impact, barrier consequences, structured explanations, simulations, deadline collisions and Route Rescue.
- `lib/workspace.ts`: validated version 2 workspace, migration, typed mutations, timestamped events and guarded corrections.
- `lib/store.ts`: the existing IndexedDB database with ordered saves, transactional cross-tab revision checks and read-only migration until successful loading.
- `hooks/useWorkspace.ts`: hydration, persistence status, cross-tab refresh and a guard that prevents autosaving over unreadable data.
- `components/PathFinder.tsx`, `Documents.tsx`, `Explain.tsx`: shared engine results rendered as interactive decision tools.
- `components/Overview.tsx`: first-visit instructions, real calculated sample preview without persistence, current next action and checklist counts.
- `components/Help.tsx`: per-page instructions and a shared accessible help/glossary dialog.
- `components/Onboarding.tsx`, `WorkspaceViews.tsx`, `ui.tsx`: adaptive guide, directory, profile, timeline, guided demo and native accessible dialog.
- `app/page.tsx`: workspace orchestration, navigation, isolated demo and transition announcements. It delegates feature views and domain calculations.
- `lib/packet.ts`: current-state preparation packet generation.
- `lib/evaluation.ts`: independent fictional benchmark fixtures; results are reported by tests.

## Graph and acceptance model

Canonical document nodes use `doc:<id>`. Every program-specific gate/task uses `<program>:<local-id>`. Only explicitly declared acceptance edges share documents. Fresh Start accepts pay stub OR employer letter; Harbor accepts pay stub OR benefits statement; Keys accepts employer letter OR benefits statement. Identity and residence also have exact declared consumers. Accepting an employer letter in Fresh Start cannot satisfy Harbor.

A topological order rejects cycles, duplicates and dangling dependencies. All AND prerequisites plus one member of every nonempty OR group must be satisfied. Gates complete automatically; tasks require user completion and satisfied prerequisites. Unavailable documents are blocked and cannot contribute to completion. Reopening evidence invalidates downstream satisfaction while retaining the user’s previous task-completion intent for correction/recovery.

Readiness uses explicit program milestones. OR alternatives never inflate the denominator and the final ready gate is not counted twice with final review. Aggregate readiness sums satisfied milestones over all selected-program milestones. It describes preparation only.

## BarrierBreak and action impact

Reverse adjacency identifies distinct currently blocked downstream nodes. This measures a dependency route’s reach, not exclusive causation: an affected task may still have other blockers. The explanation states that distinction.

For each currently actionable, relevant node, the engine computes a counterfactual completion and compares statuses. Immediate unlocks mean a previously blocked task becomes available. New automatic gate satisfaction is counted separately. Optional alternatives remain candidates if any unfinished consumer still needs them.

Base progress score = 20 × immediate unlocks + 8 × additional satisfied requirements + 2 × unfinished descendants. Priority adjusts that score and the weight of user-reported effort: momentum weights progress 1.5 and effort 1; balanced weights progress 1 and effort 3; effort mode weights progress 0.25 and effort 12. A user-selected focus program contributes 10. A verified upcoming deadline within seven days contributes 25. Unknown effort adds no invented estimate. Stable IDs break ties. Sources, facts, missing information, assumptions and change conditions are returned as structured explanation data.

Shipped fixtures have no deadlines. Deadline priority/conflicts require a verified source with a verification date and valid deadline. Prerequisites inherit the nearest upcoming verified deadline from unfinished downstream requirements; past dates are shown as passed and receive no upcoming-deadline bonus. Barrier explanations include the exact program-specific accepted alternatives, reported effort when supplied and verified deadline when present. Same-date conflicts appear in PathFinder. Tests inject temporary test-only verified fixtures to exercise these branches without displaying fake real-world deadlines.

## Simulation and transitions

`simulatePlan` uses exactly the same evaluator on a copied input. Only currently available actions can be simulated; it cannot magically bypass prerequisites. The result contains before/after analyses, newly available nodes, newly satisfied nodes and readiness delta. UI explicitly labels hypothetical results and persists nothing until “Apply this step.” Actual changes use the same mutation semantics. Transition explanations identify the changed recommendation and its engine-generated reasons.

The graph layout follows topological depth rather than fixed fixture indexes. Navigation uses familiar labels while the internal tab IDs remain compatible. My checklist puts actual tasks ahead of optional planning tools. The user can focus one program or pan/zoom the combined map. Selecting nodes shows prerequisites and accepted alternatives. A full keyboard-accessible checklist remains available.

## Route Rescue

The exact bounded subset search finds the fewest additional accepted document types satisfying all remaining acceptance gates after removing unavailable documents. Existing available documents are reused only where declared. Supplied effort breaks equal-cardinality ties; missing estimates are not invented. Impossible required gates are reported explicitly. Details and candidate comparison are in `FEATURE-SELECTION.md`.

## Local state and correction

Version 1 records migrate to version 2 without losing document availability, task flags, theme, effort, dates or prior undated history. Migration creates one honest import event, not fabricated historic timestamps. Invalid or future records reject on load and remain untouched; the UI offers session-only work and explicit reset recovery.

Writes are validated, copied and queued. IndexedDB database version 2 adds a metadata table with a non-personal revision counter. Each UI session carries the revision it loaded; an atomic read/write transaction compares it before saving and increments it after a successful change. Deletion drains prior writes and advances that revision while removing the personal record. A stale tab cannot restore a pre-deletion snapshot. BroadcastChannel messages contain only a change signal; clean tabs reload the latest data, and visibility changes also refresh clean tabs. Even without notifications, a conflicting save is rejected, the latest state is loaded and the user is told to review/repeat their change. Concurrent edits are not silently merged.

Events have unique IDs, timestamps, types and typed inverses for program/document/task changes. Only the latest still-applicable change to a target can be corrected; newer changes supersede older inverses. Corrections recompute all derived planning results. Program selection and profile changes record actual screening results. History is bounded to 100 events and can be exported.

The demo is a separate in-memory Workspace. Personal state is never replaced by scenario selection. Leaving or reloading exits the temporary demo. All scenes are interactive; they do not pre-script algorithm results.

## Offline and deployment

The production service worker precaches a complete HTML shell plus referenced JS/CSS, locally hosted fonts and local assets before activation. HTML and hashed assets stay paired. A failed candidate leaves the prior shell intact; unrelated origin caches are preserved. Updates wait for old tabs to close. The build generates a service-worker release ID, so every changed production build updates the worker without relying on a manual cache bump. IndexedDB, screening, graphs, simulations, exports and Route Rescue work offline after installation. External provider websites require network access.

The catalog is deliberately small. Full evaluation is clear and cheap for this graph; the original incremental engine remains tested, but the multi-program planner does not claim unmeasured incremental performance gains. Graph/recommendation computations are memoized by workspace state. Benchmark results measure rule correctness, not real-world housing outcomes or completion-time improvements.
