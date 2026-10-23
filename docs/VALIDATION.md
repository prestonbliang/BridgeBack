# Validation and release limits

Validation was performed in the cloud Linux environment with Node 24, the locked dependency tree, a production Next.js build and installed system Chromium. Automated tests are deterministic and do not call government services.

## Executed results

| Command | Result |
|---|---|
| `npm ci --cache /workspace/.npm` | Succeeded during environment setup |
| `npm run test` | 42 tests passed across 6 files; none skipped or disabled |
| `npm run evaluate` | 22/22 independently specified fictional benchmark cases passed |
| `npm run lint` | Passed |
| `npm run build` | Passed; postbuild generated the build-stamped offline worker |
| `npm run typecheck` | Passed |
| `npm run test:e2e` | All 14 tests passed: 7 desktop and 7 mobile |

The final browser run completed in 26.6 seconds. Production first-load JavaScript was reported as 237 kB by Next.js. This is build output, not a device performance or user-time study.

## What the checks establish

- **Core graph:** topological sorting, cycle/duplicate/dangling-reference rejection, AND/OR alternatives, reopening dependent milestones, missing prerequisites, blockers, priority/effort/deadlines, readiness, missing profile information, screening income/geography boundaries, invalid data and original incremental/full evaluation parity.
- **Multi-program planning:** exact per-program document acceptance, accepted and rejected reuse, mixed OR consumers, program removal, actual immediate unlocks versus downstream consequences, copied what-if state and parity with actual completion, recommendation transition reasons, minimum document routes and impossible mandatory requirements. Temporary test-only authoritative fixtures exercise verified deadlines, inherited urgency and conflicts; shipped sample programs have no deadlines.
- **Persistence:** version 1 migration, invalid/future-record preservation, validated ordered saves/deletion, correction guards, bounded real event history and transactional session revisions using fake-indexeddb. Browser tests independently exercise real IndexedDB across reloads and offline changes, including locally hosted font availability.
- **Cross-tab privacy:** clean tabs receive refreshed state. A stale tab with broadcasts unavailable and visibility refresh suppressed cannot overwrite a newer revision or resurrect deleted household information. Tests check the user-facing conflict explanation and the saved result after reload.
- **Offline shell:** worker tests exercise complete precaching, failed-update preservation, ownership-limited cache deletion and external-request exclusion. Production browser tests wait for service-worker control, disconnect network, reload, update document status locally and reload again.
- **Interactions:** an isolated fictional demo never replaces personal state. The worked pay-stub example leaves personal progress untouched; Help opens, explains terms and returns focus on dismissal. Browser coverage includes seven-scene navigation, scenario switching, eligibility changes, simulations/apply/correct, explicit document reuse, Route Rescue, export content, print invocation, graph/focused routes, program removal, resumable conditional onboarding, light/dark and larger text, data deletion and reload. React Testing Library separately checks demo isolation, calculated dashboard milestones, the non-persistent worked example and an honest incomplete state when unavailable documents prevent every remaining action.
- **Accessibility and presentation:** Axe WCAG A/AA checks on dashboard, onboarding dialog, PathFinder/checklist, what-if, graph, Documents, Settings in dark theme, Discover and Timeline. Keyboard dialog dismissal/focus restoration, console errors and horizontal overflow are checked in browser workflows. Desktop, phone and dark-theme screenshots were visually reviewed. A separate diagnostic scan found no WCAG A/AA violations across 15 light/dark views, including Help, and no horizontal overflow at 320 px or 820 px. The diagnostic script reported no page errors. Automated scans and Chromium phone emulation are not a complete accessibility audit or actual-device certification.

## Factual fictional benchmark

The checked-in [machine-readable report](evaluation-results.json) records every expected and actual value. Its missing-income fixture starts with identity available and household confirmation complete across two fictional plans:

- The shared pay stub lies on eight currently blocked downstream requirement paths and is the highest-ranked available action under balanced priorities.
- Preparing it makes exactly two forms actionable and advances readiness from 30% to 50%: two additional satisfied milestones out of ten.
- Five document types have explicit reuse across two accepting programs each when all three plans are selected. An employer letter is accepted for Fresh Start and Keys; it does not satisfy Harbor.
- Simulation is pure and returns the same statuses as applying the real change.
- With all three plans, identity/residence available and pay stub unavailable, the minimum remaining income route uses employer letter plus benefits statement. Unavailable mandatory identity evidence yields an honest infeasible result.

The untouched guided demo has residence available as well, so it begins at 40% and the same income action advances it to 60%. Both results are calculated from their respective inputs. These measurements establish fixture correctness, not housing outcomes, user completion-time improvements or agency acceptance.

## Release checks requiring a person or external access

- Screen-reader review (VoiceOver/TalkBack/NVDA), real-device keyboard/touch usability and representative applicant testing.
- Actual iPhone/Android home-screen installation and storage-eviction behavior.
- Official provider research, dated source verification and reviewed eligibility/document rules before offering real program screening. Official-source verification was blocked by the environment network policy; all shipped criteria are explicitly fictional and official links are separately labeled unverified. No availability/deadline is represented as live.
- HTTPS deployment and a new-task environment snapshot restoration. Saved reusable setup/start instructions are not publication or restoration validation.

No impact statistics, testimonials, endorsements or partnerships are asserted. The application supports multiple fictional preparation plans and never submits applications to agencies.
