# BridgeBack: clarity and design revision

## References consulted

- [Anthropic frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): distinct subject-specific design, purposeful hierarchy, plain copy, visual review.
- [Vercel web-design-guidelines skill](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) and its current [interface rules](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md): keyboard/focus, readable forms, touch targets, motion preferences, offline fonts and dark-theme contrast.

These were read from their public sources. Neither is presented as an installed connector or as user research.

## What needed to change

The former interface repeated aspirational phrases instead of explaining the task. Similar rounded cards gave privacy notes, the next action and optional features equal weight. Terms such as downstream, dependencies, readiness and simulation required knowledge the reader should not need. Small uppercase text and a serif hero made a practical assistance tool resemble a generic marketing dashboard.

## Design plan

- Palette: paper white `#ffffff`, cool background `#f2f5f7`, navy ink `#172f43`, deep teal `#12695d`, restrained attention brown `#92501b`. Statuses always include words or icons.
- Type: locally hosted Atkinson Hyperlegible regular/bold, selected for distinguishable characters and legibility. No external font requests. Use one family, a clear heading scale and readable body text.
- Layout: a navy navigation rail beside a light work area; the actual next task has the strongest emphasis. The first visit explains the workflow and offers a small interactive document example. Checklist, help and explanations remain quiet and left aligned.

```text
Navigation | Page name + one useful explanation       Help
           | Main task / getting started | Worked example
           | Current plans              | Progress / next places
```

The distinguishing element is the worked example: a visitor can see why one document changes two checklists before entering personal information. That is the product's job, not decoration. It uses the same dependency evaluator as the saved application.

## Writing rules

Use the words a person needs to act: Find help, My checklist, Documents, Activity. Keep PathFinder and BarrierBreak as secondary names rather than making people learn them to navigate. Explain what a document is before naming which example program accepts it. Distinguish “I have this document” from “I sent an application.” Explain waiting steps with their actual unfinished requirements. Put the main answer first and optional rule details under an expandable explanation. Preserve exact rules, source labels and uncertainty; plain language must not change eligibility logic.

Every page gets short, contextual instructions and a shared help dialog. The glossary explains checklist progress, household, income proof, alternatives and waiting steps. The app still makes no claim to real program verification, acceptance or housing availability.

## Review standard

Review desktop and phone screenshots, keyboard navigation, text zoom, dark mode and actual interaction results. Automated checks establish behavior and detect accessibility issues; they do not prove that every reader understands the wording. Representative applicant testing remains a separate next release step.
