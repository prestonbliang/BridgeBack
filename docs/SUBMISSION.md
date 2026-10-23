# 2026 Congressional App Challenge entry packet

This is preparation material, not an application submission or an eligibility certification. Personal information belongs in the official portal, not this repository. Entrant contributions and reflections must be accurate and supplied by the student.

## Deadline and eligibility: read these first

Sources reviewed October 23, 2026:

- [Scott Peters’s CA-50 entry page](https://scottpeters.house.gov/app-challenge): fall-2026 middle/high-school enrollment; residence or school in CA-50; teams up to four with at least half eligible in the district; original concept, design and execution.
- [2026 national rulebook](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf): one app/person/year and one district; eligible project dates after October 30, 2025; significant personal technical contributions and understanding; all AI usage disclosed and AI must not constitute all technical development. The entrant must verify their own eligibility. See [authorship record](DEVELOPMENT-PROCESS.md).
- **Deadline conflict:** the PDF states **October 26, 2026, noon EDT = 8:00 a.m. America/Los_Angeles**. The district page says noon “EST,” while the [national registration page](https://www.congressionalappchallenge.us/students/student-registration/) says 9 p.m. ET. Prepare to finish **before the earliest stated deadline**, and confirm discrepancies with the organizer. Do not rely on the later webpage time.
- [Official 2026 portal](https://webportalapp.com/sp/congressional_app_challenge_2026), linked from national registration. No profile, eligibility answers or form submission has been created here.

The district page lists 858-455-5550 for competition questions. Contact is the entrant’s choice; no call or message has been sent. Confirm any current updates before submitting. Being technically complete does not cure an authorship or eligibility issue.

## Prepared project facts

- **Title:** BridgeBack
- **One-sentence purpose:** BridgeBack helps people understand housing-assistance paperwork, identify what is blocking their next step, and prepare a practical question or action plan.
- **Audience:** People navigating housing paperwork, initially in San Diego County, including those using a phone, working offline or unfamiliar with application terms.
- **Platform:** Functional web/PWA and a native iOS candidate; the web version is sufficient as a platform under the reviewed rules. Do not wait for App Store release to demonstrate the working web app.
- **Languages:** TypeScript/JavaScript, HTML/CSS, Swift for native lifecycle integration, Python for packaging checks.
- **Core tools:** Next.js/React, Dexie/IndexedDB, Zod, React Flow, Lucide, Capacitor, Vitest, Playwright and Axe. See `package.json`, `package-lock.json` and the dependency notices for exact versions/attribution.
- **Original feature to explain:** A program-specific dependency graph with AND/OR alternatives, explainable next-action ranking, actual/hypothetical state differences, and bounded exact alternate-document search.
- **Accuracy boundary:** Real public counselor/guidance sources are separate from fictional program screening/acceptance rules. No placement, appointments, official eligibility, measured housing outcomes or endorsements are claimed.

## Draft answer material

**Purpose.** BridgeBack addresses a point where a resource directory stops helping: an applicant has a confusing requirement, cannot get a paper, or does not know which task can proceed. It shows the prerequisite, checks each selected practice plan’s exact alternatives, and explains the consequence of one action. For real housing questions, a person can use dated public counselor listings, prepare questions and track follow-up without a practice program or income profile.

**Technical challenge.** A shared document does not satisfy every program automatically. The implementation keeps one inventory node but separate acceptance gates. An employer letter works for one fictional plan and not another. Immediate unlocks are computed by reevaluating a hypothetical action, so the app does not mistake every descendant for an actionable task. Corrections propagate through the same evaluation. This is a factual implementation description; explain which part you personally implemented and which assistance was used.

**Inspiration, learning and personal contribution.** The entrant must write these in their own words from actual experience. The entrant reports completely reviewing and understanding the code. No personal housing story, specific independent implementation history, interview or learning outcome has been supplied. Use [the walkthrough](CODE-WALKTHROUGH.md) to review the code, and [the process record](DEVELOPMENT-PROCESS.md) to disclose AI assistance. Do not submit generated first-person claims as facts.

**A possible future version.** Review current real program rules with authoritative sources and clear update ownership; conduct consent-based usability sessions; validate iOS behavior with real applicants/devices. These are future directions, not completed partnerships or research.

## Demonstration video

The reviewed PDF requires a **1–3 minute** video, maximum three minutes, uploaded publicly to YouTube or Vimeo. It must identify every participant, name the app, explain its purpose and audience, identify tools/languages and show working functionality. A public URL is required; a local MP4, private video or source repository alone is not the final video submission.

Use [the two-minute script](DEMO.md), [district brief](DISTRICT-BRIEF.md), [recorded review footage](media/README.md) and [timed narration draft](DEMO-NARRATION.md). Any automated screen capture/caption assistance must be disclosed. Review footage does not supply participant identification, an authentic student explanation or evidence of personal technical contributions. Record your own accurate narration and add the required participant identification before publishing. No video has been uploaded or made public by this work.

## Final check by the entrant

- Confirm eligible year, district, enrollment, team membership, prior-project dates and one-entry rule in the official system. Complete guardian/contact requirements privately.
- Resolve the AI/originality requirement using a truthful contribution record; disclose all assistance. Contact the organizer if uncertain. Do not treat this checklist as a determination.
- Review app claims, source dates and fictional labels. Be prepared to provide a functioning app and source code if judges request access.
- Complete the six written-question areas: title, purpose, inspiration, coding challenge, actual learning and a future version. Character limits and current form fields must be checked in the portal.
- Watch the entire public video, check its duration/audio/legibility, confirm all names/tools/audience/purpose are included, and test its URL while signed out.
- Make the application and source reviewable, retain library/font notices, record the tested commit, and export a clean source snapshot with `npm run submission:pack`.
- Submit through the portal before the earlier deadline, confirm the receipt, retain a copy, and honor any freeze on changes after the submission period. No registration, eligibility attestation, publication or submission is performed automatically.

The separate [iOS handoff](IOS.md) covers TestFlight signing, device checks and Apple submission. An unsigned simulator/device artifact is not a TestFlight invitation or an approved App Store release.
