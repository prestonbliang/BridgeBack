# Phase 2 audit and implementation priorities

The original implementation was inspected before Phase 2 changes: application shell and five sections, CSS, package/TypeScript/lint/build configuration, pure graph engine, fixture data, Dexie schema, service worker, manifest, unit/browser tests and documentation.

## The five largest weaknesses

1. **One application was baked into the model.** A global requirement array and `active` flag meant “plans” could only ever mean one fixture. There was no way to preserve program-specific acceptance rules or reuse documents safely. Replace those assumptions with explicit program entities, program-scoped task IDs and canonical documents connected through acceptance gates.
2. **Recommendation impact was overstated and sharing was unsafe.** Descendant counts were described as unlocks even when prerequisites remained. An OR document was hidden when any consumer was satisfied, even if another consumer still needed it. Calculate immediate unlocks using a counterfactual evaluation, distinguish blocked descendants from immediate changes, and retain shared alternatives needed by any unfinished consumer.
3. **The graph did not help users make decisions.** Index-based positions, generic explanations and no selected-node interaction made it largely a picture. Add graph-derived layout, program focus, selectable requirements, structured rule evidence, and a what-if comparison that can be explicitly applied.
4. **Continued use could lose information.** Demo selection overwrote the personal workspace. A failed storage read could be followed by an autosave of blank state. History had no event IDs, timestamps or reliable corrections. Introduce versioned migration, serialized writes, a load-error save guard, an isolated in-memory demo and reversible typed events.
5. **The interface and validation were too tightly coupled to one scenario.** The 1,285-line page owned every screen, storage, graph, dialogs and mutations. Tests proved one tiny fixture and missed mixed OR consumers, migration, simulation purity, source verification, reuse and keyboard focus. Extract feature components and a state reducer; add independently authored benchmark fixtures and complete browser workflows.

## What was already real

The original AND/OR dependency evaluation, cycle checks, local IndexedDB persistence, effort scoring, theme switching, document-status controls, exports and production offline reload worked and were tested. Phase 2 keeps Next.js, React, Dexie, Zod, React Flow, the existing visual language, canonical storage database and compatible legacy engine API. It evolves these foundations rather than introducing a backend or an AI dependency.

## Execution order

1. Define explicit programs and document acceptance. Preserve old stored progress through migration.
2. Implement actual action-delta evaluation, BarrierBreak, structured explanations, simulations and exact alternative-route search.
3. Connect modular PathFinder, document inventory, onboarding, timeline, settings and isolated guided demo.
4. Refine typography, contrast, motion, keyboard focus, mobile navigation and graph interaction.
5. Validate deterministic fixtures, state correction, offline shell lifecycle and real browser journeys. Record measured results separately from untested claims.

## Privacy/security and offline findings

No external analytics, AI requests, accounts or uploaded sensitive documents were present. Those boundaries remain. The original worker deleted every cache on the origin and could replace its HTML shell without caching matching new assets. Phase 2 restricts deletion to BridgeBack caches and installs matching HTML/assets before activation. Deployment cache invalidation is automated from build output.
