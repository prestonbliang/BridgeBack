# Validation and release limits

Validation was performed in the cloud Linux environment with Node 24, the locked dependency tree, a production Next.js build and installed system Chromium. Automated tests are deterministic and do not call government services.

## Executed results

| Command                          | Result                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm ci --cache /workspace/.npm` | Succeeded during environment setup                                                                     |
| `npm run test`                   | 76 tests passed across 10 files; none skipped or disabled                                              |
| `npm run evaluate`               | 22/22 independently specified fictional benchmark cases passed                                         |
| `npm run lint`                   | Passed                                                                                                 |
| `npm run build`                  | Passed; postbuild generated the build-stamped offline worker                                           |
| `npm run typecheck`              | Passed                                                                                                 |
| `npm run test:e2e`               | All 24 tests passed: 12 desktop and 12 mobile                                                          |
| `npm run notices:check`          | Lockfile fingerprint, direct runtime dependency coverage and full license texts passed                 |
| `npm run ios:bundle`             | Static export and Capacitor iOS synchronization passed                                                 |
| `npm run ios:check`              | Generated-bundle, privacy-manifest, configuration, permission-scope, deployment and icon checks passed |
| `npm run test:ios-web`           | All 6 bundled-web/bridge-shim tests passed: phone and tablet; networking disabled                      |

The final local browser regression run completed in 52.0 seconds, after recovering disk space used by temporary Docker builds. All six native-bundle checks passed in 7.1 seconds. Production first-load JavaScript was reported as 275 kB by Next.js. The final optional-practice label is additionally covered by the pushed CI revision. This is build output, not a device performance or user-time study.

## Native compilation evidence

The production-candidate source `3ac0234a1c1f873fd5379d8a60f511aa9e4d1dda` passed [macOS iOS preflight](https://github.com/prestonbliang/BridgeBack/actions/runs/39999239500): both unsigned simulator and unsigned device builds were compiled and uploaded. [Machine-readable evidence](ios-build-evidence.json) records the successful status and both artifact SHA-256 digests. The workflow keeps binaries for seven days; the tested source and digest record remain in Git. This is compilation evidence, not an actual-device, signing or App Store result.

## What the checks establish

- **iOS handoff:** native share success/cancellation/errors, temporary-file cleanup, interrupted-export cleanup and slow-startup cleanup ordering are unit tested. Bundled browser tests use only shipped files with networking disabled; they cover first-launch counselor access, persistence, privacy-page accessibility and native export outcomes through an explicitly simulated bridge. The Xcode project was parsed with the installed OpenStep project parser; native XML and shared scheme were parsed successfully. These Chromium/shim checks do not execute UIKit or WKWebView. Separately, actual macOS CI compiled both unsigned simulator and device apps; the exact tested source, successful run and artifact digests are recorded in [native build evidence](ios-build-evidence.json).
- **Core graph:** topological sorting, cycle/duplicate/dangling-reference rejection, AND/OR alternatives, reopening dependent milestones, missing prerequisites, blockers, priority/effort/deadlines, readiness, missing profile information, screening income/geography boundaries, invalid data and original incremental/full evaluation parity.
- **Multi-program planning:** exact per-program document acceptance, accepted and rejected reuse, mixed OR consumers, program removal, actual immediate unlocks versus downstream consequences, copied what-if state and parity with actual completion, recommendation transition reasons, minimum document routes and impossible mandatory requirements. Temporary test-only authoritative fixtures exercise verified deadlines, inherited urgency and conflicts; shipped sample programs have no deadlines.
- **Persistence:** version 1 migration, invalid/future-record preservation, validated ordered saves/deletion, correction guards, bounded real event history and transactional session revisions using fake-indexeddb. Browser tests independently exercise real IndexedDB across reloads and offline changes, including locally hosted font availability and saved support/contact/reminder state.
- **Guided support:** every supported difficulty creates contextual small steps. Contact selection, reviewed guidance, pending replies and resolved help questions never increase readiness. Guided completion rejects missing reviews, wrong answers, missing confirmation, unavailable documents and blocked prerequisites. Tests cover old-v2 defaults, validated persistence/deletion, real contact follow-up without a fictional plan, exported question sheets without fictional program names, and temporary teaching calculations.
- **External counselor data:** the real ten-listing CFPB snapshot was imported successfully. Deterministic fictional parser fixtures cover initial/final assignments, escaped braces, changed or malformed data, wrong search ZIP, duplicates and invalid phone values. Language/service/distance filters match exact listed attributes. A separate reachability check reached five of seven source pages; 211/SDHC returned access denied and remain unreviewed. That diagnostic intentionally exits nonzero when any source is inaccessible; it is not an eligibility or availability check.
- **Cross-tab privacy:** clean tabs receive refreshed state. A stale tab with broadcasts unavailable and visibility refresh suppressed cannot overwrite a newer revision or resurrect deleted household information. Tests check the user-facing conflict explanation and the saved result after reload.
- **Offline shell:** worker tests exercise complete precaching, failed-update preservation, ownership-limited cache deletion, external-request exclusion and preservation when the privacy page cannot be included. The privacy and acknowledgments pages and their own scripts are precached with the shell; browser tests read both in new tabs while offline. Production browser tests wait for service-worker control, disconnect network, reload, update document status locally and reload again.
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

## Review recording

The captioned [review clip](media/README.md) was produced from actual production-browser interactions with Playwright and FFmpeg. The recording script completed the graph, preview/apply, unavailable-document, support/learning, counselor-filter, contact-outcome and privacy-navigation route. Extracted preview and counselor frames were visually reviewed for readable captions and correct fictional/real labels. It is silent footage requiring entrant identification and narration; it was not uploaded or submitted.

## Release checks requiring a person or external access

- Real iPhone/iPad/VoiceOver runtime testing, provisioning and signing, final archive privacy report, production policy URL and publisher metadata. Unsigned simulator and device compilation passed on macOS CI. Current Apple upload/review pages were read October 23, 2026; see [the TestFlight gates](IOS.md) and [dated source record](submission-sources.json).
- Screen-reader review (VoiceOver/TalkBack/NVDA), real-device keyboard/touch usability and representative applicant testing.
- Actual iPhone/Android home-screen installation and storage-eviction behavior.
- Reviewed program-specific eligibility/document rules before offering real program screening. Five guidance/contact pages were fetched and reviewed, and ten public counselor listings were imported from the CFPB finder. Two referral homepages remain unreviewed after access-denied responses. The fictional practice rules remain separate. Three real-program entries and eleven official sources now support partial comparisons, follow-up guidance and a specific working-preference evidence rule. Full agency eligibility is not modeled, and contradictory published criteria remain uncertain. No appointment, housing availability or agency deadline is represented as live.
- A new-task environment snapshot restoration. Saved reusable setup/start instructions are not restoration validation. The public HTTPS deployment was subsequently checked as recorded below.

No impact statistics, testimonials, endorsements or partnerships are asserted. The application supports multiple fictional preparation plans and never submits applications to agencies.

## Real-program production checks

Thirteen additional deterministic unit tests cover catalog provenance, actual table boundaries, policy conflicts, missing/larger-household information, source-review expiry, AND/OR access, independent letter review, corrections, schema-2 migration to 3, persisted real documents, deletion, bounded source fetching, changed HTML/PDFs and stale/offline reports. Four added browser runs (desktop/phone) cover the real-program workflow, profile/city comparisons, source-change warnings, failed refresh preservation, actual IndexedDB/offline reloads, exports, demo isolation, dark-theme accessibility and production response headers. Two new native-bundle runs cover real guidance and document tracking without claiming a live check.

The separate live official-source audit matched all eleven reviewed pages/PDFs. [The checked report](official-source-audit.json) identifies the actual date, catalog version and digests; it establishes excerpt/PDF consistency, not current units, appointments or full rule verification. A daily workflow repeats that diagnostic. Deterministic tests use explicit network fixtures rather than government calls.

The production npm audit found inherited Sharp/PostCSS advisories. The lockfile now uses Sharp 0.35.5 and PostCSS 8.5.31 with explicit overrides, and the production audit reports zero known vulnerabilities on October 23, 2026. [The dated report](production-dependency-audit.json) is retained. This is not a claim of complete security or zero future vulnerabilities. Builds, tests, license checks and native artifact checks validate the patched tree.

The production container was built locally and served the actual app under UID 1000, with a healthy status and all eleven public-source checks matched. Additional container-browser scans covered the real directory, phone checklist, dark document workspace and 320px document layout: no Axe violations, page errors or horizontal overflow were reported. The committed screenshots show illustrative local test state; no actual provider contact or document acceptance is claimed.

## Verified production-candidate CI

All three workflows passed for `3ac0234a1c1f873fd5379d8a60f511aa9e4d1dda`: [web production checks](https://github.com/prestonbliang/BridgeBack/actions/runs/39999239593) (including the container build/HTTP smoke and full browser/native-bundle suite), [official source audit](https://github.com/prestonbliang/BridgeBack/actions/runs/39999239625), and the native compilation linked above. [The CI evidence record](production-ci-evidence.json) preserves the same-source successful run URLs. The final packet formatting and optional-practice label are included in that revision; success is observed, not assumed from workflow configuration.

## Public-deployment preparation rehearsal · October 23, 2026

The subsequent Vercel preparation adds explicit service-worker update headers, a hosting configuration, a public-origin HTTP checker, and a deployment Playwright configuration that reuses the existing regression suite without starting a local server. Its local rehearsal passed all 76 unit tests, lint, type checking, the production build, all six HTTP checks and all 24 desktop/mobile browser runs (55.7 seconds). All eleven sources matched in the HTTP rehearsal, with no review warnings. The URL validator also rejected plain external HTTP, embedded credentials, paths and query parameters before making requests.

The deployment check explicitly records `transport: "local rehearsal"` for `http://127.0.0.1:3000`. This rehearsal was not evidence of a public Vercel deployment; the subsequent hosted run is recorded below. Earlier native/container CI reports above remain evidence for their recorded source revision; this preparation does not rewrite them as a pass for changed source.

## Public HTTPS verification · October 23, 2026

After the publisher provided **https://bridge-back-one.vercel.app/**, the [public verification workflow](https://github.com/prestonbliang/BridgeBack/actions/runs/40012645015) completed successfully in 11 minutes 40 seconds against that origin. The HTTP checker and the existing desktop/mobile browser suite ran on GitHub's runner with no Vercel authentication supplied. The local workspace's network proxy denied this hostname; those local request failures were not treated as evidence that the app failed. GitHub's runner supplied the actual hosted checks.

The [evidence record](public-deployment-evidence.json) retains the verification checkout, successful status and report artifact SHA-256. The public run summary establishes successful commands; detailed browser statistics and nonfatal source-review warnings remain in the artifact and require GitHub account access to inspect. A green run does not by itself establish zero source warnings, a served Git revision, live housing availability, physical-device installation or agency approval.
