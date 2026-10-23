# iOS handoff: next stop is TestFlight

BridgeBack now has a Capacitor 8 iPhone/iPad project, a bundled offline application, native file sharing, a public privacy page, privacy-manifest declarations, and a macOS build workflow. This is an engineering handoff for a beta candidate. It is not a signed IPA, a verified Apple-device build, or App Store approval.

## Build and open on a Mac

Use Node 22+ (24 tested), Python 3 for the handoff check, and **Xcode 26+**. The Xcode requirement was verified in the framework maintainer’s [Capacitor 8 upgrade guide](https://github.com/ionic-team/capacitor-docs/blob/main/docs/main/updating/8-0.md). Accept Xcode’s license and install an iOS simulator runtime. The app targets **iOS/iPadOS 16.0+**, including native HTML dialog support; this is the minimum device OS, not the required build SDK.

```sh
npm ci
npm run ios:bundle
npm run ios:check
npm run ios:open
```

In Xcode, select the shared **App** scheme and an iPhone simulator. Run. No server, account, database, API key, Cocoapods, or housing-service credentials are required. Swift Package Manager resolves Capacitor and the two native plugins. `ios:bundle` runs a static Next.js export into `out`, removes the browser worker, and synchronizes the web files and plugins. Generated web files are ignored; the Xcode project, scheme, art and native changes are committed.

For a device, choose your own signing team. `org.bridgeback.app` is a **provisional identifier**, not a claim of registration or domain ownership. Verify ownership/availability, then update both `capacitor.config.ts` and the target’s Debug/Release bundle identifiers before registering a production app. Update the expected identifier in `scripts/check-ios.py` with that intentional change. Never commit certificates, provisioning profiles, private keys or App Store Connect credentials.

The export uses Next.js’s `.next` working directory. After an iOS bundle, run `npm run build` again before `npm start` or the normal browser E2E suite. The bundled files in `ios/App/App/public` remain separate from that web build. Do not edit generated `out`, `public/sw.js`, native `public`, or Capacitor’s generated Swift package file.

## What is different on iOS

- The shell, fonts, dated counselor directory, privacy page and graph engine ship inside the app. A first launch does not depend on a prior online visit or service-worker caching.
- Native exports use the system share sheet and a temporary file in app cache. Dismissal does not record a successful export. Sharing/cleanup errors are surfaced; neither changes preparation progress. Cleanup runs after the sheet and at next startup for interrupted exports. Copies the person saves or shares belong to that destination.
- The app’s cache export prefix is narrow; cleanup does not remove unrelated cache files. Native bridge logging is disabled so export contents are not written to debug logs by BridgeBack’s bridge configuration.
- Websites and calls go through Capacitor’s default external-navigation handling. No `server.url`, `allowNavigation`, arbitrary-transport exemption or remotely downloaded application code is configured.
- Layout uses actual safe-area insets, 44px minimum icon controls on small screens, 16px form text to avoid Safari form zoom, locally hosted readable type, reduced motion, larger text and an accessible checklist beside the graph. Pinch zoom stays enabled.
- A native scene cover hides the checklist when the app resigns active, intended to keep it out of app-switcher previews. Confirm this on a device, including share sheets and incoming calls. This does not prevent screenshots or encrypt stored information.
- Browser and app IndexedDB are separate. There is no implicit browser-to-app migration, cross-device sync or cloud backup. Export before deleting an app or browser data. System backups and device access remain OS responsibilities.

## Privacy and permissions

`PrivacyInfo.xcprivacy` is in the app target’s Resources build phase. It declares no tracking, no tracking domains and no collected-data types, reflecting the current local-only implementation. It declares File Timestamp reason **C617.1** for the Filesystem plugin’s app-container operations. This matches the [Filesystem plugin documentation](https://github.com/ionic-team/capacitor-filesystem/blob/main/README.md) and the maintainer’s [privacy-manifest guide](https://github.com/ionic-team/capacitor-docs/blob/main/docs/main/ios/privacy-manifest.md). Review the final archive’s combined privacy report, including transitive Swift packages, on the Mac.

No camera, photos, contacts, location, microphone or notification permission is requested. Follow-up dates are visible reminders when the app is open; there are no scheduled notifications. The manifest does not claim encrypted storage. The export-compliance plist flag reflects use of ordinary OS/web cryptography rather than custom non-exempt encryption; the publisher must confirm the final binary’s export classification.

The readable policy is at `/privacy` on the website and `/privacy.html` in the native bundle. Before submission, deploy it at a stable HTTPS URL under the publisher’s control and enter that URL in App Store Connect. Review hosting practices separately. Do not submit a localhost URL or an unpublished relative path. Settings links to the policy and offers complete local deletion.

## Verification layers

```sh
npm run test
npm run ios:bundle
npm run ios:check
npm run test:ios-web
npm run build
npm run lint
npm run typecheck
npm run test:e2e
```

`ios:check` validates the actual generated bundle, referenced local assets/fonts/privacy page, absence of a browser worker/remote server, disabled bridge logs, the plist and privacy-manifest resource, permission scope, deployment target and opaque 1024px icon. `test:ios-web` serves only the bundled files through Playwright request fulfillment with networking disabled and an explicitly simulated native bridge. It verifies first-launch interactions, real local counselor data, persistence, the privacy page, and share success/cancellation/error cleanup at phone and tablet sizes. **It runs Chromium, not WKWebView, UIKit, an iOS simulator or the actual Share extension.**

The [iOS preflight workflow](../.github/workflows/ios-preflight.yml) can be dispatched in GitHub Actions and runs automatically for relevant pushes to main and pull requests. It validates the bundle, checks the Xcode major version and compiles an unsigned simulator app. The resulting artifact is for a simulator; it cannot be installed as a signed device IPA or submitted to TestFlight. Cloud GitHub CLI authentication was unavailable, so this workflow was not dispatched or claimed passed here.

On a Mac, its core compile command is:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios-derived CODE_SIGNING_ALLOWED=NO build
```

## Beta release gates

| Gate | Evidence required before calling it passed |
|---|---|
| Native compilation | Successful Xcode build and resolved Swift dependencies; currently unexecuted in Linux |
| Signing and identity | Publisher-owned identifier, team and provisioning; no credentials supplied here |
| Actual first-launch offline | Fresh install, airplane mode before opening; complete a help plan and restart |
| Durability and recovery | Force-quit/reopen after changes, verify save status; delete all data and verify after restart; compare clean reinstall behavior |
| Sharing | Save text and JSON to Files, cancel, simulate unavailable destination, inspect cleanup; no false success or preparation change |
| Layout and input | Small supported iPhone, current large iPhone and iPad; portrait/landscape, notch/home indicator, hardware/software keyboards and 200% text |
| Accessibility | VoiceOver focus/order/labels, keyboard-only dialog flow, Reduce Motion and Increase Contrast; do not claim an accessibility label before testing it |
| Privacy | Inspect archive privacy report, app-switcher cover, debug output and outgoing requests; verify hosted policy/support links |
| Content | Current source dates, English-only UI clearly described, no fake eligibility/appointments; provider-language filters do not imply translated app screens |
| Submission rules | Re-read Apple’s current SDK/upload requirements, review guidelines, metadata and age-rating questionnaire in App Store Connect |

Apple’s review, privacy-manifest and upcoming-requirements pages returned access-denied responses from this environment on October 23, 2026. They were not independently reviewed here. Consult [current upload requirements](https://developer.apple.com/news/upcoming-requirements/), [review guidelines](https://developer.apple.com/app-store/review/guidelines/) and [privacy documentation](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files) before upload. A framework’s minimum Xcode version does not establish Apple’s current submission acceptance.

Once these gates pass, Archive a **Release** device build in Xcode, validate it in Organizer, upload to App Store Connect, complete privacy/export/age-rating answers and review contact details, then invite internal TestFlight testers. External testing may require Apple beta review. Public App Store submission is a separate publisher decision. No upload, invitation or publication has been performed.

See [submission copy and review notes](IOS-SUBMISSION.md) and [district-facing demonstration brief](DISTRICT-BRIEF.md).
