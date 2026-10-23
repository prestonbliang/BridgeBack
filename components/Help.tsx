"use client";
import { CircleHelp, Check, Clock3, FileText } from "lucide-react";
import { Dialog } from "./ui";
export type HelpPage =
  | "Dashboard"
  | "Discover"
  | "PathFinder"
  | "Documents"
  | "Support"
  | "Timeline"
  | "Settings";
const guides: Record<
  HelpPage,
  { title: string; steps: string[]; note: string }
> = {
  Support: {
    title: "Get help without pretending a step is finished.",
    steps: [
      "Choose the checklist item and what is making it hard. Review one small step at a time; those checks save your place in the help plan only.",
      "Use the exact options shown for each practice plan, or try the short learning tools. None of those activities automatically completes paperwork.",
      "If you need a real person, take the question sheet to an official or provider website. Record whether you are waiting and choose a personal reminder.",
    ],
    note: "Source dates are shown on each card; confirm current services and appointments with the organization. Provider questions omit fictional program names. No profile or application is sent, and a personal reminder is not an agency deadline.",
  },
  Dashboard: {
    title: "New here? Start with these three things.",
    steps: [
      "Choose a plan in Find help. Current plans are examples so you can try the checklist safely.",
      "In Documents, tick the papers you already have. Keep the actual files with you; there is nothing to upload.",
      "Open My checklist. It shows the next step you can do and what needs to happen first.",
    ],
    note: "For real housing support, use the official website links in Find help. BridgeBack does not send an application or find housing for you.",
  },
  Discover: {
    title: "Real services and practice checklists are different.",
    steps: [
      "Official website links take you to organizations that provide housing information or services. Ask them about current openings and how to apply.",
      "Practice plans are made up. Add one to learn how BridgeBack organizes paperwork; adding a plan does not apply for assistance.",
      "A sample eligibility result only compares the details you entered with that example's rules. Open its explanation to see what was checked.",
    ],
    note: "The official links have not been reviewed for current requirements or availability. Confirm those details with the organization.",
  },
  PathFinder: {
    title: "How to work through your checklist",
    steps: [
      "Start with the suggested step. We choose it because it helps you move on to other unfinished steps.",
      "If you are unsure, preview what would change. A preview does not tick anything off. Only apply it once you have actually done the step.",
      "A waiting step lists what you still need. Gather one accepted alternative when the list says ‘or’; you do not need every alternative.",
    ],
    note: "A check mark means you have prepared that item. It does not mean an agency has received or approved it. Your checklist percentage counts prepared steps, not your chance of getting housing.",
  },
  Documents: {
    title: "Keep track of papers, without uploading them.",
    steps: [
      "Tick ‘I have this available’ only when you can get to the document. Uncheck it if you no longer have it.",
      "If you cannot get a document, tick that option. The alternative finder checks which other papers your selected example plans accept.",
      "A shared document can help with more than one plan, but only where that plan's rules accept it. Check the acceptance list before relying on it.",
    ],
    note: "Export downloads a text checklist; Print opens your browser's print menu. Neither sends documents or applications anywhere.",
  },
  Timeline: {
    title: "See what you changed, and fix a mistaken tick.",
    steps: [
      "Activity records changes such as adding a plan, getting a document ready or exporting a checklist.",
      "Choose ‘Correct this action’ to undo the latest change to that document, task or plan.",
      "The checklist updates too. Removing income proof, for example, can make a later form wait again.",
    ],
    note: "Only the latest change to an item can be corrected here. You can also change document status directly in Documents. The latest 100 events are kept.",
  },
  Settings: {
    title: "Only share what you want to use here.",
    steps: [
      "Household means the people who would be included on the same application. You can leave household size and income blank.",
      "Income means the approximate total for a whole year. The current comparison uses made-up sample limits, not an agency decision.",
      "Changes save in this browser. Export keeps a copy on your device; Delete removes the profile and progress stored here.",
    ],
    note: "This browser's storage is not encrypted secure storage. Someone using the same browser profile may be able to see your progress. No account or document upload is needed.",
  },
};
export function PageHelp({ page }: { page: HelpPage }) {
  const guide = guides[page];
  return (
    <details className="page-help">
      <summary>
        <CircleHelp size={18} aria-hidden="true" />
        How to use this page
      </summary>
      <div>
        <h2>{guide.title}</h2>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>{guide.note}</p>
      </div>
    </details>
  );
}
export function HelpGuide({
  open,
  onClose,
  page,
}: {
  open: boolean;
  onClose: () => void;
  page: HelpPage;
}) {
  const guide = guides[page];
  return (
    <Dialog open={open} onClose={onClose} title="Help with BridgeBack">
      <div className="help-dialog-intro">
        <CircleHelp size={28} aria-hidden="true" />
        <h2>Help with your checklist</h2>
        <p>
          You do not need to know how housing applications work to start a
          checklist.
        </p>
      </div>
      <section className="help-current">
        <h3>{guide.title}</h3>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>{guide.note}</p>
      </section>
      <section className="help-glossary">
        <h3>A few words you’ll see</h3>
        <dl>
          <div>
            <dt>
              <Check size={17} aria-hidden="true" />
              Done
            </dt>
            <dd>
              You told us you have the document or finished the task. An agency
              has not checked it.
            </dd>
          </div>
          <div>
            <dt>
              <Clock3 size={17} aria-hidden="true" />
              Waiting
            </dt>
            <dd>
              This step needs something else first. We list the missing items
              beside it.
            </dd>
          </div>
          <div>
            <dt>
              <FileText size={17} aria-hidden="true" />
              Accepted alternative
            </dt>
            <dd>
              A different document a plan allows for the same requirement. If it
              says pay stub or employer letter, one is enough for that plan.
            </dd>
          </div>
          <div>
            <dt>Checklist progress</dt>
            <dd>
              The share of preparation steps you have finished. A plan can reach
              100% here without being submitted or approved.
            </dd>
          </div>
          <div>
            <dt>Eligibility check</dt>
            <dd>
              A first comparison with a plan’s rules. “Potentially eligible”
              means the answers appear to fit; it is never a promise of
              assistance.
            </dd>
          </div>
          <div>
            <dt>Household income</dt>
            <dd>
              The approximate money received by the people included on an
              application over a whole year. Leave it blank if you do not know.
            </dd>
          </div>
        </dl>
      </section>
      <button className="button primary" onClick={onClose}>
        Back to what I was doing
      </button>
    </Dialog>
  );
}
