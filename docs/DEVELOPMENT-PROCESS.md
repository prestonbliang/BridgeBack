# Development process and authorship

This project has substantial AI-assisted implementation. That includes application code, tests, interface revisions, research assistance, documentation and release tooling produced during the development conversation. The human supplied the product requirements, constraints and feedback, and reports having completely reviewed and understood the code. That review and understanding are self-reported, not independently assessed. This record does **not** establish which technical work the student personally completed outside that conversation.

The [official 2026 CAC rulebook, section 3](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf) permits AI support with full disclosure, requires significant individual contributions and technical understanding, and says AI must not constitute the entirety of technical development. **A polished interface and passing tests do not establish student-authorship eligibility.** The entrant must truthfully document their own contributions and resolve any eligibility uncertainty with the organizer. No claim of unaided development or guaranteed eligibility is made here.

## Evidence that is available

- The Git history records actual implementation revisions. Retain it and identify AI assistance accurately.
- Pure TypeScript engines and explicit rules are inspectable in `lib/engine.ts`, `lib/planner.ts` and `lib/programs.ts`. Runtime recommendations do not use an LLM.
- Expected benchmark outcomes are specified separately from the evaluator in `lib/evaluation.ts`. The report distinguishes fixture correctness from housing outcomes.
- Reducer, persistence, browser/offline and native-bridge checks exercise failure paths, not only screenshots. Native macOS CI produces unsigned simulator/device builds; runtime device testing is a separate gate.
- Source URLs, review dates and the fictional/real data distinction are explicit. No user interviews, partnerships, measured placement outcomes or independent student work are invented.
- Open-source frameworks are declared in the lockfile. Font attribution and license are included in `public/fonts/OFL.txt`. See the dependency inventory when preparing the originality/tooling disclosure.

## Entrant contribution record

The entrant reports completely reviewing and understanding the code. Specific personal implementation, debugging and original-design contributions have not been identified in this record. The remaining details must come from the entrant; they are deliberately not filled with an invented development story.

| Record                  | What to provide                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| Original decisions      | A specific decision you personally made, alternatives considered, and your reason                  |
| Personal implementation | Files/commits and substantive functionality you actually coded, including assistance used          |
| Debugging               | A failure you personally reproduced, the diagnosis, the change you made, and evidence it was fixed |
| Technical understanding | A live explanation of the dependency graph, OR alternatives, scoring, readiness and persistence    |
| AI disclosure           | Tools used, affected tasks, extent of generated code, and what you reviewed or changed yourself    |
| External code/data      | Frameworks, libraries, fonts and public-source data, with attribution and applicable licenses      |

Use [the code walkthrough](CODE-WALKTHROUGH.md) to prepare an explanation. Reading it or making cosmetic changes does not by itself demonstrate the significant individual technical contribution required by the rules. Any new contribution must be real, substantive, understood and described accurately. Confirm eligibility before submitting.

## Draft disclosure to adapt truthfully

“BridgeBack was developed with substantial assistance from ChatGPT/Codex for implementation, debugging, test creation, research, documentation and release preparation. The application’s runtime eligibility and preparation engines are deterministic TypeScript and do not call an AI service. My own technical contributions were [describe actual work and evidence]. I used [list other tools] and reviewed [describe what was actually reviewed].”

The bracketed personal facts must be completed accurately by the entrant. This is not a declaration that the current project satisfies the competition’s authorship requirement. Do not use a false first-person learning story or omit the extent of AI assistance.
