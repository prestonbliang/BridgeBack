import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "BridgeBack privacy policy" };

export default function PrivacyPolicy() {
  return (
    <main className="public-policy">
      <Link href="/">← Return to BridgeBack</Link>
      <p className="section-label">Privacy policy · Updated October 23, 2026</p>
      <h1>Your paperwork stays with you.</h1>
      <p>
        BridgeBack helps you understand housing paperwork and organize
        preparation. It has no account, advertising, analytics, tracking, or
        automatic application submission.
      </p>
      <h2>What you choose to save</h2>
      <p>
        Your device stores optional household size, approximate annual income, a
        broad location and housing need, selected practice plans, document
        availability, checklist progress, reading preferences, help questions,
        public contacts, personal reminder dates, and recent activity. Do not
        enter Social Security numbers, document contents, or private case notes.
        There are no document uploads.
      </p>
      <h2>Where it lives</h2>
      <p>
        Progress stays in IndexedDB in this browser or in the iOS app’s web
        view. BridgeBack does not send it to a backend. Browser and iOS app
        storage are separate and do not sync. This is not encrypted secure
        storage; someone with access to your device or browser profile may see
        it. Device backups, site-data cleanup, app removal, storage eviction,
        and device loss are controlled by your operating system or browser.
      </p>
      <h2>Sharing is your decision</h2>
      <p>
        Export creates a file only when you ask. On iOS, the system share sheet
        lets you choose Save to Files or another destination. The app tries to
        remove its temporary cached export when the share sheet finishes.
        Cleanup of interrupted exports is retried at the next app start, and
        failures are shown. A copy you save or send remains with you or its
        recipient. BridgeBack cannot delete those copies. Question sheets
        contain general questions and selected public contact details, not your
        profile income or document contents.
      </p>
      <h2>Outside sources</h2>
      <p>
        Dated public counselor listings and guidance references ship with the
        app. Loading them does not contact those providers. If you choose a
        website or phone link, your browser or phone opens that service under
        its own policies. BridgeBack does not append your income, household
        profile, or documents to those links. A deployed website host may
        process ordinary connection information under its own hosting policy.
      </p>
      <h2>Control and deletion</h2>
      <p>
        Use Settings → Export my progress to keep a copy, or Settings → Delete
        all saved data to remove the saved workspace and help plans.
        Demonstration changes stay in a separate temporary workspace.
        Learning-exercise answers and calculator inputs are temporary. No
        background reminders or tracking permissions are requested.
      </p>
      <h2>Questions or problems</h2>
      <p>
        Use the project’s{" "}
        <a
          href="https://github.com/prestonbliang/BridgeBack/issues"
          target="_blank"
          rel="noreferrer noopener"
        >
          public issue tracker
        </a>{" "}
        for app problems. Do not include income, identity documents, or other
        private details in a public issue. BridgeBack is an independent project,
        not a government agency or an endorsed service. Preparation-program
        rules are fictional; ask the real provider about current requirements.
      </p>
    </main>
  );
}
