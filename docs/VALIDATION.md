# Validation and release limits

Validation was performed in the cloud Linux environment with Node 24, the locked dependency tree, a production Next.js build and installed system Chromium. Automated tests are deterministic and do not call government services.

## Executed results

| Command | Result |
|---|---|
| `npm ci --cache /workspace/.npm` | Succeeded during environment setup |
| `npm run test` | 62 tests passed across 9 files; none skipped or disabled |
| `npm run evaluate` | 22/22 independently specified fictional benchmark cases passed |
| `npm run lint` | Passed |
| `npm run build` | Passed; postbuild generated the build-stamped offline worker |
| `npm run typecheck` | Passed |
| `npm run test:e2e` | All 20 tests passed: 10 desktop and 10 mobile |
| `npm run ios:bundle` | Static export and Capacitor iOS synchronization passed |
| `npm run ios:check` | Generated-bundle, privacy-manifest, configuration, permission-scope, deployment and icon checks passed |
| `npm run test:ios-web` | All 4 bundled-web/bridge-shim tests passed: phone and tablet; networking disabled |

The final browser run completed in 36.3 seconds. Production first-load JavaScript was reported as 256 kB by Next.js. This is build output, not a device performance or user-time study.

## What the checks establish

- **iOS handoff:** native share success/cancellation/errors, temporary-file cleanup, interrupted-export cleanup and slow-startup cleanup ordering are unit tested. Bundled browser tests use only shipped files with networking disabled; they cover first-launch counselor access, persistence, privacy-page accessibility and native export outcomes through an explicitly simulated bridge. The Xcode project was parsed with the installed OpenStep project parser; native XML and shared scheme were parsed successfully. These checks do not execute UIKit or WKWebView and are not a Swift compilation. The four bundle tests completed in 4.3 seconds.
- **Core graph:** topological sorting, cycle/duplicate/dangling-reference rejection, AND/OR alternatives, reopening dependent milestones, missing prerequisites, blockers, priority/effort/deadlines, readiness, missing profile information, screening income/geography boundaries, invalid data and original incremental/full evaluation parity.
- **Multi-program planning:** exact per-program document acceptance, accepted and rejected reuse, mixed OR consumers, program removal, actual immediate unlocks versus downstream consequences, copied what-if state and parity with actual completion, recommendation transition reasons, minimum document routes and impossible mandatory requirements. Temporary test-only authoritative fixtures exercise verified deadlines, inherited urgency and conflicts; shipped sample programs have no deadlines.
- **Persistence:** version 1 migration, invalid/future-record preservation, validated ordered saves/deletion, correction guards, bounded real event history and transactional session revisions using fake-indexeddb. Browser tests independently exercise real IndexedDB across reloads and offline changes, including locally hosted font availability and saved support/contact/reminder state.
- **Guided support:** every supported difficulty creates contextual small steps. Contact selection, reviewed guidance, pending replies and resolved help questions never increase readiness. Guided completion rejects missing reviews, wrong answers, missing confirmation, unavailable documents and blocked prerequisites. Tests cover old-v2 defaults, validated persistence/deletion, real contact follow-up without a fictional plan, exported question sheets without fictional program names, and temporary teaching calculations.
- **External counselor data:** the real ten-listing CFPB snapshot was imported successfully. Deterministic fictional parser fixtures cover initial/final assignments, escaped braces, changed or malformed data, wrong search ZIP, duplicates and invalid phone values. Language/service/distance filters match exact listed attributes. A separate reachability check reached five of seven source pages; 211/SDHC returned access denied and remain unreviewed. That diagnostic intentionally exits nonzero when any source is inaccessible; it is not an eligibility or availability check.
- **Cross-tab privacy:** clean tabs receive refreshed state. A stale tab with broadcasts unavailable and visibility refresh suppressed cannot overwrite a newer revision or resurrect deleted household information. Tests check the user-facing conflict explanation and the saved result after reload.
- **Offline shell:** worker tests exercise complete precaching, failed-update preservation, ownership-limited cache deletion, external-request exclusion and preservation when the privacy page cannot be included. The privacy page and its own scripts are precached with the shell; browser tests read it in a new tab while offline. Production browser tests wait for service-worker control, disconnect network, reload, update document status locally and reload again.
- **Interactions:** an isolated fictional demo never replaces personal state. The worked pay-stub example leaves personal progress untouched; Help opens, explains terms and returns focus on dismissal. Browser coverage includes seven-scene navigation, scenario switching, eligibility changes, simulations/apply/correct, explicit document reuse, Route Rescue, export content, print invocation, graph/focused routes, program removal, resumable conditional onboarding, light/dark and larger text, data deletion and reload. React Testing Library separately checks demo isolation, calculated dashboard milestones, the non-persistent worked example and an honest incomplete state when unavailable documents prevent every remaining action.
- **Accessibility and presentation:** Axe WCAG A/AA checks on dashboard, onboarding dialog, PathFinder/checklist, what-if, graph, Documents, Settings in dark theme, Discover, Timeline, guided support, teaching tools and counselor listings. Choosing a difficulty moves keyboard focus directly to the new small-step instructions. Keyboard dialog dismissal/focus restoration, console errors and horizontal overflow are checked in browser workflows. Desktop, phone and dark-theme screenshots were visually reviewed. A separate diagnostic scan found no WCAG A/AA violations across 15 light/dark views, including Help, and no horizontal overflow at 320 px or 820 px. The diagnostic script reported no page errors. The final overview review scanned 320px, 390px, 820px and 1440px layouts with no Axe violations, page errors or horizontal overflow. The final support review also scanned the three new support/learning/counselor views in light theme on desktop and phone: no Axe violations, page errors or horizontal overflow were reported. Automated scans and Chromium phone emulation are not a complete accessibility audit or actual-device certification.

## Factual fictional benchmark

The checked-in [machine-readable report](evaluation-results.json) records every expected and actual value. Its missing-income fixture starts with identity available and household confirmation complete across two fictional plans:

- The shared pay stub lies on eight currently blocked downstream requirement paths and is the highest-ranked available action under balanced priorities.
- Preparing it makes exactly two forms actionable and advances readiness from 30% to 50%: two additional satisfied milestones out of ten.
- Five document types have explicit reuse across two accepting programs each when all three plans are selected. An employer letter is accepted for Fresh Start and Keys; it does not satisfy Harbor.
- Simulation is pure and returns the same statuses as applying the real change.
- With all three plans, identity/residence available and pay stub unavailable, the minimum remaining income route uses employer letter plus benefits statement. Unavailable mandatory identity evidence yields an honest infeasible result.

The untouched guided demo has residence available as well, so it begins at 40% and the same income action advances it to 60%. Both results are calculated from their respective inputs. These measurements establish fixture correctness, not housing outcomes, user completion-time improvements or agency acceptance.

## Release checks requiring a person or external access

- Native Xcode compilation, real iPhone/iPad/VoiceOver testing, provisioning and signing, SDK/upload-rule review, final archive privacy report, production policy URL and publisher metadata. The macOS workflow is provided but was not dispatched: GitHub CLI authentication was unavailable. Apple documentation fetches were access denied; official Capacitor 8 and manifest documentation were reviewed through the maintainer’s source repository. See [the TestFlight gates](IOS.md).
- Screen-reader review (VoiceOver/TalkBack/NVDA), real-device keyboard/touch usability and representative applicant testing.
- Actual iPhone/Android home-screen installation and storage-eviction behavior.
- Reviewed program-specific eligibility/document rules before offering real program screening. Five guidance/contact pages were fetched and reviewed, and ten public counselor listings were imported from the CFPB finder. Two referral homepages remain unreviewed after access-denied responses. All shipped screening criteria and preparation programs remain explicitly fictional. No appointment, housing availability or agency deadline is represented as live.
- HTTPS deployment and a new-task environment snapshot restoration. Saved reusable setup/start instructions are not publication or restoration validation.

No impact statistics, testimonials, endorsements or partnerships are asserted. The application supports multiple fictional preparation plans and never submits applications to agencies.
