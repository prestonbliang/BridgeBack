# Privacy and local data

BridgeBack has no account requirement, backend database, analytics, advertising, external fonts or language-model calls. Profile and checklist data are not uploaded. Hosting receives ordinary requests for application files. Clicking an official provider link contacts that website and its policies apply.

## What is stored

The browser’s IndexedDB stores optional household size, approximate annual income, coarse location, housing need, selected fictional plans, task completion, document availability/unavailability, optional reminder dates, user-selected effort/priorities, theme/reading preference, onboarding position, the latest 100 activity events, and optional help plans. A help plan stores a known step, a difficulty category, reviewed help steps, a broad contact outcome, a personal reminder date and optionally selected public provider contact details. No Social Security numbers, names, street addresses, document uploads or financial records are requested. Profile events do not repeat income or household values in their descriptions.

The real contact workflow additionally saves a selected situation/agency, a barrier category, up to twelve explicitly reported contact attempts per plan, a reported next instruction and confirmation, broad requested/prepared paperwork categories, a resolution flag and entered response/follow-up dates. It does not record calls, collect letter contents or verify the dates. Contact sheets include these reported outcomes/dates and public contact details, but not household income or private case identifiers. These plans share export, deletion, schema migration and cross-tab protections with the workspace.

Browser storage is **not encrypted secure storage**. Someone with access to the browser profile may see it. Browser cleanup, private browsing, storage eviction and device loss can remove progress. There is no cloud backup or cross-device synchronization.

## Demos and simulations

Explore Demo uses a separate in-memory workspace with fictional applicants. The personal workspace remains intact. Leaving the demo or reloading discards its temporary edits. What-if analysis uses copied planner inputs and makes no stored changes until the user selects “Apply this step.” Marking a document unavailable changes the actual plan and can be corrected in Timeline.

## Exports, corrections and deletion

Workspace JSON export contains the saved profile and progress. A preparation packet contains status, accepted alternatives, screening explanations and next steps. Keep exports private; downloads and printouts are outside the app’s storage controls. Printing creates a physical/PDF copy according to browser settings.

Timeline lets users correct the latest applicable document, task or program change. Later changes to the same target supersede earlier correction controls. Every correction is recorded and derived planning results recalculate.

Delete all saved data explicitly clears the personal record after earlier queued saves finish. A non-personal revision counter remains so stale tabs cannot restore deleted profile/progress. Tabs exchange a change signal with no household data; they reload the latest local record. Conflicting edits are rejected and explained rather than silently overwriting another tab. No cross-device service is involved. Deletion does not delete exports, printouts or the generic offline shell. Browser “clear site data” removes all IndexedDB metadata and cached app files too. A failed/corrupt read does not trigger an overwrite: session-only use and explicit reset are offered instead.

## Accuracy boundary

The three practice programs and thresholds are fictional. Three real-program entries cite reviewed official sources; they offer partial comparisons and follow-up guidance, with conflicts explicitly shown. Guidance sources and public contacts show individual review or retrieval dates. The new SDHC contact page and Legal Aid contact number were reviewed October 23; 211's referral phone route is supported by the reviewed County page, while its own homepage remains unreviewed. Sources are not endorsements or partnerships. No availability, verified deadline, placement or acceptance is promised. No agency application is created or submitted by BridgeBack. Real eligibility and document acceptance must be confirmed by the provider.

## Help plans and outside resources

Learning-exercise answers and payment-calculator inputs are temporary component state, not saved income updates. Help reviews, contact outcomes and reminders do not change application readiness. The guided completion action requires explicit confirmation and checks current prerequisites.

Counselor data is a dated public snapshot from the CFPB finder for 92101. The app does not send a ZIP code, household profile, income or document contents when loading it; the data ships with the app. Maintainer refresh scripts contact public official sources independently of any user state. Website and phone links only open when the person selects them. External websites and phone services have their own policies.

Question-sheet exports contain the chosen public contact, the paperwork topic, general questions and optional reminder/outcome. They omit fictional program names from provider questions and do not include personal income or document contents. Copy/download does not automatically send the sheet to an organization; the iOS share sheet lets the person choose a destination. Contact outcomes are manually reported, not measured calls or agency responses. There are no background reminder notifications. Help plans are exported and deleted with the rest of the workspace.

## Native iOS storage and exports

The iOS candidate stores the same validated workspace in its own WKWebView IndexedDB. Browser and native app data do not synchronize. Bundled app files work without a server request. System backups, device access and app-removal behavior are operating-system concerns; there is no claim of encryption or guaranteed recovery.

Native exports use a randomly named temporary file in the app cache and the system share sheet. Cancellation is distinct from a completed share. The app attempts to remove its temporary copy after completion, cancellation or failure, and retries interrupted cleanup at next startup. A slow startup cleanup finishes before a new export is written. Failures are surfaced. Saved/shared copies are outside the app’s control. Bridge logging is disabled to avoid logging exported contents. A scene cover is intended to hide private screens in app-switcher previews and requires real-device verification; it is not screenshot prevention or encryption.

No native camera, photo-library, location, contacts, microphone, tracking or notification permission is requested. The app target includes a privacy manifest with Filesystem’s File Timestamp reason C617.1 and no tracking/collected-data declarations. Review the actual archived SDK privacy report before distribution. The readable policy is implemented at `/privacy`, with a bundled `/privacy.html` version. A production policy URL must be hosted before submission. See [iOS release gates](IOS.md).

## Real plans and public source checks

Schema 3 stores optional municipality, real-program routes/check marks, a narrow real-document availability inventory and dated source-check reports. These remain in the same local workspace, export and deletion controls. No document contents, employer name, account codes, military/medical data or identity numbers are collected. Real-document status does not flow into fictional acceptance rules or an agency decision.

The hosted web source-status endpoint receives an ordinary GET without a profile body, household query parameters or caller-selected URL. It checks only registered public County pages and may share a report for 15 minutes. Hosting providers still see ordinary connection metadata; configure the actual host and policy before public rollout. The endpoint has no profile database or analytics. Native iOS uses bundled guidance and user-selected official links instead of this web endpoint. Cached/offline checks are dated and are not called live.
