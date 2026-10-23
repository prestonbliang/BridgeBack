# Submission copy and reviewer walkthrough

Prepared copy for a publisher to review and enter in App Store Connect. This file does not submit an app. Bundle identifier, publisher/team, production privacy URL, review contact, screenshots and final questionnaire responses require the publisher’s actual information.

- **Name:** BridgeBack
- **Subtitle:** Housing paperwork made clear
- **Suggested category:** Lifestyle
- **Language:** English
- **Keywords:** housing,San Diego,paperwork,checklist,counselor,documents,assistance

## Description

Housing paperwork can be hard to untangle. BridgeBack helps you understand what a step needs, work through missing documents, and prepare a clear question for a real organization.

Find dated public counselor listings near downtown San Diego, filter their listed services and languages, and choose a contact for your question sheet. Keep track of whether you are waiting for a reply and choose a personal date to follow up. You can use these tools without adding a practice program or entering income.

Try clearly labeled fictional preparation plans to see why one document can unlock several steps. The checklist explains what is ready, what is waiting, and which accepted alternatives meet each example requirement. Short exercises explain pay-stub labels and regular payment periods.

No account, document uploads or advertising. Checklists, explanations, a saved resource directory and the privacy policy are included for offline use. Export a checklist or your saved progress through the iOS share sheet. Delete saved data in Settings.

BridgeBack is an independent preparation and learning tool. Its program rules and eligibility examples are fictional. It does not submit applications, decide official eligibility, provide legal advice, or guarantee housing. Counselor listings are dated public information, not available appointments; confirm services and actual program requirements with the provider. Website visits and calls need a connection. Personal follow-up dates are not agency deadlines, and there are no background reminder notifications.

## Review notes

No login, subscription or reviewer credentials are needed. The app bundles its working interface and local calculations; it does not load a hosted website as its main UI.

1. On Overview, choose **Find a real person to help**. The real public counselor directory opens directly. Source date and 92101 search boundary are visible. Choose **Make a follow-up plan for my question**, select a public contact, record **waiting**, and return to Overview. No fictional plan is required.
2. Choose **Try a guided example**. It uses a separate in-memory fictional workspace. In My checklist, preview Pay stub, then explicitly apply it to see two sample forms become available. Return to your workspace to preserve personal progress.
3. From Documents, choose **Help getting this document**. Help reviews, contacting someone and a reminder do not mark a document complete. The guided completion requires reviewed steps, a correct understanding answer, explicit readiness and satisfied current dependencies.
4. In Settings, **Export my progress** opens the native share sheet. Save to Files or cancel. Cancellation does not add a success event. Delete all saved data requires confirmation and clears help plans as well.
5. After a fresh install, airplane mode still permits the checklist, calculations, directory, learning tools and policy. External sites/calls need connectivity. Browser and native app storage do not sync.

The directory is a small, dated CFPB/HUD-powered search snapshot, not an exhaustive county directory or a live government integration. All actual eligibility screening and document acceptance rules in preparation plans are deliberately labeled fictional. This beta does not claim official housing placement or provider partnerships.

## Privacy-label and export-compliance review

The intended App Privacy answer for the current app is **Data Not Collected**: no app analytics/backend, advertising identifiers, tracking, account or profile transmission to the developer. Local optional household/income inputs and explicit user-directed exports are described in the policy. Confirm the archived SDK privacy report, final hosting/website behavior and Apple’s current definitions before selecting answers. Do not silently reuse this answer after introducing analytics, feedback collection or a backend.

The plist sets `ITSAppUsesNonExemptEncryption` to false for this implementation. Confirm the final app’s encryption questionnaire; this file is not a legal determination. No tracking prompt is needed for the current no-tracking design. Answer age/content questionnaires based on actual content; do not guess a rating.

- **Support URL:** https://github.com/prestonbliang/BridgeBack/issues
- **Privacy policy:** deploy the implemented `/privacy` page to the publisher’s actual HTTPS domain and enter its full URL. No production domain has been supplied or invented.
- **Reviewer contact:** publisher’s actual person, email and phone, entered privately in App Store Connect.
- **Screenshots:** capture the running native app at App Store Connect’s currently required device sizes. Repository Chromium screenshots are design-review evidence, not certified native App Store screenshots. Avoid household information and invented impact claims.

Suggested screenshot captions: “Know what to do next”; “Find the paper that unlocks the next step”; “Work through a stuck step”; “Bring clear questions to a real helper”; “Your progress stays on your device.” Keep the fictional-example banner and source dates visible wherever applicable.
