# Working through a stuck step

Get support adds a path from a difficulty to an action, a learning exercise, an accepted alternative, or a real provider contact. It does not claim to replace a caseworker, a legal adviser, an agency decision, or housing placement.

## What a person can do

1. Choose “I’m stuck on this step” in My checklist, or “Help getting this document” in Documents. For a real housing question without a practice plan, open Get support → Talk to someone → Make a follow-up plan for my question.
2. Choose the difficulty: unclear instructions, unavailable paperwork, a request for more information, language/accessibility needs, feeling overwhelmed, a mistaken completion, or needing a real person.
3. Review four small contextual steps. They save the person’s place in the help plan only; they never count as application readiness.
4. Inspect the exact accepted documents for each selected fictional plan. One OR option is enough for that requirement. A document accepted by one plan does not automatically count for another.
5. If needed, open a short learning exercise or prepare questions for a real provider.
6. Choose a public contact, record a broad contact outcome, and optionally choose a personal follow-up date. Open questions are visible on Overview and Get support.
7. Resolve the help question separately from completing paperwork. An actual readiness update requires the guided checks below or the existing self-reported checklist controls.

A person who cannot get a pay stub can check where it came from, review employer-letter/benefits alternatives against each sample plan, mark the original paper unavailable, and ask a real provider a focused question. If no listed substitute works, the app says that plainly. It does not invent an exception.

## Error prevention

The guided completion action validates all of these again in the reducer, independently of disabled buttons:

- All four small help steps were reviewed.
- The short understanding question was answered correctly.
- The person explicitly confirmed that the document is accessible or the task is finished.
- The current dependency analysis still considers the actual item actionable.

A requested document, a reviewed help article, a selected contact, a call outcome or a reminder can never satisfy a document gate. Wrong answers explain the distinction and allow another try. Reopening a mistaken checklist item recalculates dependent steps. A resolved help question is not a submitted or approved application.

Standard checklist controls remain self-reported and do not inspect documents. The guide reduces common misunderstandings; it cannot verify the truth of someone’s answers or an agency’s acceptance of evidence.

## Real outside data

`lib/counselor-snapshot.json` contains ten public agency listings imported from the [CFPB’s housing counselor finder for ZIP code 92101](https://www.consumerfinance.gov/find-a-housing-counselor/?zipcode=92101). The official page states that its data uses HUD’s counseling-agency list. The current saved search contains four agencies listing Rental Housing Counseling within 25 miles of its search point. These are measured properties of this snapshot, not appointments, housing openings or a complete San Diego County directory.

The interface shows source/retrieval date, geography, exact listed services, languages, counseling methods, public office address and phone. Filters match listed attributes; they do not infer languages, services, eligibility, the person’s location or current capacity. Empty results invite a broader filter or the current official finder. The user can call a listed number themselves or save the public contact in a question sheet.

The snapshot works offline and is visibly dated. It is not called live. The official-site link can be used for another ZIP code; BridgeBack never appends a household profile, income or documents to that URL.

## Source review and reproducible refresh

The CFPB counselor finder, CFPB Your Money, Your Goals toolkit, USA.gov replacement-ID guidance, County Housing and Community Development page, and Legal Aid Society of San Diego homepage were fetched and read. Review dates appear on the relevant cards. The legal-aid phone was taken from that provider’s own homepage. The County page also references 2-1-1 San Diego. The 211 and SDHC homepages returned access-denied responses from this environment and retain unreviewed labels.

This review covers the cited page/contact facts. It does not verify a current appointment, a specific person’s eligibility or any real program’s document rules. All application-preparation programs and screening thresholds in the graph remain explicitly fictional.

```sh
npm run sources:counselors
npm run sources:check
```

The counselor import fetches the official HTTPS page using curl with normal TLS verification. It extracts the final JSON data assignment without evaluating any external script. Zod validates fields, phone format, expected search ZIP and unique agency IDs. Output is written to a temporary file and atomically renamed only after validation; a failed fetch or changed schema leaves the prior directory intact. Rebuild after a successful refresh to include it in the app and offline shell.

`lib/counselor-import.mjs` is separately testable with clearly fictional HTML fixtures. The tests cover quoted braces, the page’s initial empty assignment, malformed data, wrong geography, empty results, duplicate IDs and unsafe phone values.

`sources:check` records HTTP reachability in `lib/support-source-checks.json`. A reachable page is not automatically marked reviewed. The current run reached five of seven pages; two returned access denied, so this diagnostic correctly exits nonzero. This does not prevent an offline build using the checked-in snapshot. Only an actual content review should change `reviewedAt`.

## Teaching tools

The pay-stub exercise uses fictional gross pay, deductions and net pay. It teaches labels and reminds readers to use the measure the real provider asks for. It is authored educational content, not a published housing rule.

The payment-period helper distinguishes weekly (52), every two weeks (26), twice monthly (24), monthly (12) and annual (1). It explicitly assumes the same payment each time and says that one income source may not represent a whole household. Irregular pay and program-specific methods need provider clarification. Calculator values and quiz answers are temporary; they never update profile income automatically.

## Human handoff and follow-up

Question sheets omit fictional program names and fictional acceptance rules from the actual questions. They do not include household income, identifying documents or private case details. They ask about the real program, exact requirement, alternatives, language/accessibility options, deadlines and next contact. Selecting a public agency does not notify it. Copy/download are explicit actions controlled by the person.

Contact outcomes are broad self-reported statuses. A follow-up reminder is a date the person chooses, not a verified deadline or an extension. There are no background notifications. Overview shows open questions and saved dates on return. If a tenancy notice or response deadline exists, the interface directs the person to appropriate provider/legal help rather than interpreting an unseen notice.

## Persistence and privacy

Version 2 workspaces gain `supportRecords` with a default empty array, preserving older version 2 saves. Records contain a known task ID, a difficulty category, four reviewed-step flags, a broad contact outcome, an optional reminder, a help status, timestamps, and optionally selected public contact details. They request no free-form case notes, document uploads, ID numbers, health diagnoses or provider staff names.

Support records use the existing validated IndexedDB queue and cross-tab transaction revisions, are included in workspace/preparation exports, and disappear with Delete all saved data. Demo support changes stay in the separate in-memory demo. No external messaging or agency submission occurs.
