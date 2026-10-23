# From a housing question to a practical next step

The first screen asks what is happening: a place to stay, an application, missing paperwork, a housing notice or a veteran referral. It asks which organization handles an application instead of inferring it from someone's address. No profile, income answer, case number or account is needed to start.

Each contact plan provides a published phone number, official link, dated source, an opening script and three questions to ask before ending a conversation. County and City cases stay separate. SDHC's number is its main number/staff directory, not a claim that someone has reached their caseworker. Legal Aid determines services and representation. The VA route is information/referral guidance, not a voucher opening. The County directs urgent housing inquiries to 211; a referral does not reserve housing.

## Follow-through rules

Opening a phone link or website records no contact. The person explicitly reports an unsuccessful attempt, an unanswered message, an answered question, a referral or actually sending requested paperwork. A message without a reply cannot confirm instructions. A referral gets a handoff check: confirm who receives it, the official contact route and whether a referral is required. A reported submission never means accepted or approved.

After reporting a reply and confirming a specific next instruction, the person can track broad categories of paperwork the provider actually requested and mark their own preparation. Removing a requested category removes its prepared flag. Categories are a memory aid, not the provider's exact list or evidence of acceptance. The County working-preference inventory and fictional practice documents remain separate.

Next-action priority is explicit: an entered response date due today/earlier; a personal follow-up reminder; an unresolved contact; unconfirmed referral/instructions; outstanding reported paperwork; the person's confirmed instruction. Resolving a question does not hide an entered response date or unfinished reported paperwork. No language model ranks these actions.

Dates that need review in other saved contact plans are surfaced above the current plan with a button to open each one. A recent application question must not hide an earlier saved notice date. These remain user-entered dates rather than verified deadlines.

When access is difficult, the County's published mail/fax/in-person alternatives do not require fixing a portal first. Other routes direct people to official contact information and ask which accommodation or method is available. SDHC and Legal Aid show the TTY numbers from their reviewed pages. No texting service, accommodation, document substitute or response time is invented.

## Dates, privacy and recovery

Response dates come from the person's letter/provider and are labeled unverified. Follow-up dates are personal choices. BridgeBack does not calculate a legal response period, extend it or send background notifications. Dates use the device's calendar day, avoiding UTC rollover for Pacific users. A housing notice routes to legal help.

Plans persist in the validated local workspace, work offline, appear again on Overview and participate in export/deletion. Each retains the most recent twelve reported attempts. Contact sheets include questions, public contacts and broad reported outcomes/dates; they omit profile income, case numbers and document contents. Sharing is explicit. Native exports use the existing share sheet and temporary-file cleanup.

Record schema 4 prevents older tabs from silently stripping contact plans. Versions 1/2/3 migrate without resetting official plans, practice work or profile answers. Database index version 2 is unchanged. Existing transaction revisions and stale-tab/deletion guards apply.

## Source maintenance

`lib/assistance-contacts.json` holds five contact records and reviewed excerpts: County urgent guidance, application directions and VA information, SDHC's contact page and Legal Aid's homepage. They were read October 23, 2026. The 30-day review reminder is editorial policy. SDHC's previously inaccessible homepage is distinct from the specific contact page reviewed for this release.

`npm run programs:audit` runs the eleven-source program audit and five contact-excerpt checks. Daily CI retains `official-source-audit.json` and `assistance-contact-audit.json`. HTTP 200 is insufficient: a reviewed excerpt must remain present. Changed/unavailable sources need human review. The in-app **Check official pages** endpoint still checks only the County program catalog, not the new City/Legal Aid contact records.

## A 90-second demonstration

1. Choose **I'm working on an application**, then SDHC. Show the City contact and opening script.
2. Record a message without a reply. Instructions remain unconfirmed. Set a personal reminder.
3. Report an answered question, choose the provider's actual next instruction and confirm it. Add an income-paperwork category to the requested list; mark it prepared. Explain that this is personal preparation, not accepted evidence.
4. Save a contact sheet. Reload offline to show persistence. No agency call, message or application is sent by the demo.
5. In a real County existing-applicant checklist, choose **Help me with this step**. Show the County contact and the assisted route for a portal problem. New inquiries instead reach general helper/referral guidance; veterans use the published VA route.

These demonstrations establish functionality, not measured housing outcomes, appointments, legal advice, availability or partnerships.
