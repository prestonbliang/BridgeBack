"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  Phone,
  LifeBuoy,
  Clock3,
} from "lucide-react";
import {
  assistanceGoals,
  assistanceKey,
  assistanceRoute,
  assistanceNext,
  assistanceBarrierAdvice,
  assistanceBarriers,
  assistanceOutcomes,
  assistanceInstructions,
  assistancePapers,
  assistanceSheet,
  localCalendarDate,
  type AssistanceGoal,
  type AssistanceAgency,
  type AssistanceChange,
  type AssistanceCase,
} from "../lib/assistance";
import type { Workspace, WorkspaceAction } from "../lib/workspace";
import { download } from "./ui";

const agencyNames = {
  unknown: "I’m not sure",
  county: "County housing assistance (HACSD)",
  city: "San Diego Housing Commission (SDHC)",
};
export function HelpDesk({
  state,
  onAction,
  onLocalHelp,
  focusKey,
}: {
  state: Workspace;
  onAction: (action: WorkspaceAction) => void;
  onLocalHelp: () => void;
  focusKey: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(
    focusKey ?? state.assistanceCases[0]?.key ?? null,
  );
  const [choosing, setChoosing] = useState(!selected);
  const [draft, setDraft] = useState<AssistanceGoal | null>(null);
  const [agency, setAgency] = useState<AssistanceAgency>("unknown");
  const [today, setToday] = useState("");
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => {
      setToday(localCalendarDate());
      setOnline(navigator.onLine);
    };
    update();
    const timer = window.setInterval(update, 30000);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (focusKey) {
      setSelected(focusKey);
      setChoosing(false);
      setDraft(null);
    }
  }, [focusKey]);
  const item = state.assistanceCases.find((c) => c.key === selected);
  const otherDates = today
    ? state.assistanceCases.filter(
        (c) =>
          c.key !== selected &&
          ((c.responseDate && c.responseDate <= today) ||
            (c.followUpDate && c.followUpDate <= today)),
      )
    : [];
  function open(goal: AssistanceGoal, agency: AssistanceAgency) {
    onAction({ type: "assistance-open", goal, agency });
    setSelected(assistanceKey(goal, agency));
    setChoosing(false);
    setDraft(null);
    requestAnimationFrame(() =>
      document.getElementById("help-desk-current")?.focus(),
    );
  }
  return (
    <section
      className="help-desk"
      aria-labelledby="help-desk-title"
      data-testid="help-desk"
    >
      <header className="help-desk-heading">
        <div>
          <span className="section-label">
            Start here · real people, practical steps
          </span>
          <h2 id="help-desk-title">Let’s get you to the right help.</h2>
          <p>
            Choose what is happening. Get a contact, know what to ask, and keep
            the next step here.
          </p>
        </div>
        <LifeBuoy size={30} aria-hidden="true" />
      </header>
      {state.profile.location === "Other" && (
        <p className="help-desk-note">
          You selected a location outside San Diego. These are San Diego
          contacts. Choose “Find a real person to help” below to open the
          official counselor finder and search your area.
        </p>
      )}
      {state.assistanceCases.length > 0 && (
        <label className="help-desk-saved">
          Your saved contact plans
          <select
            value={item?.key ?? ""}
            onChange={(event) => {
              setSelected(event.target.value);
              setChoosing(false);
              setDraft(null);
            }}
          >
            {!item && <option value="">Choose a saved plan</option>}
            {state.assistanceCases.map((c) => (
              <option key={c.key} value={c.key}>
                {assistanceGoals.find((g) => g.id === c.goal)!.label}
                {c.agency !== "unknown"
                  ? ` — ${c.agency === "city" ? "SDHC" : "County"}`
                  : ""}
                {c.resolved ? " (resolved)" : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      {otherDates.length > 0 && (
        <div className="help-desk-date-alerts">
          <h3>Saved dates to review</h3>
          <p>
            These are dates you entered, not deadlines verified by BridgeBack.
          </p>
          <ul>
            {otherDates.map((c) => (
              <li key={c.key}>
                <button
                  className="text-button"
                  onClick={() => {
                    setSelected(c.key);
                    setChoosing(false);
                    setDraft(null);
                    requestAnimationFrame(() =>
                      document.getElementById("help-desk-current")?.focus(),
                    );
                  }}
                >
                  Review saved dates:{" "}
                  {assistanceGoals.find((g) => g.id === c.goal)!.label}
                  {c.agency !== "unknown"
                    ? ` (${c.agency === "city" ? "SDHC" : "County"})`
                    : ""}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(choosing || !item) && (
        <div className="help-desk-choose">
          {draft ? (
            <div className="help-desk-agency">
              <h3 tabIndex={-1} id="help-desk-agency-title">
                Which organization handles this paperwork?
              </h3>
              <p>
                Look at the name on your letter or application. The City and
                County are different agencies. Living in San Diego does not tell
                us which agency holds your case.
              </p>
              <label>
                Organization on my application or letter
                <select
                  value={agency}
                  onChange={(e) =>
                    setAgency(e.target.value as AssistanceAgency)
                  }
                >
                  {Object.entries(agencyNames).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="fine-print">
                Not sure? Start with 211 and ask which organization handles your
                situation. You do not need to enter your case number here.
              </p>
              <div className="inline-actions">
                <button
                  className="button primary"
                  onClick={() => open(draft, agency)}
                >
                  Show my contact and next steps <ArrowRight size={17} />
                </button>
                <button className="text-button" onClick={() => setDraft(null)}>
                  Back to situations
                </button>
              </div>
            </div>
          ) : (
            <div className="help-desk-goals">
              {assistanceGoals.map((goal) => (
                <button
                  key={goal.id}
                  className="help-desk-goal"
                  onClick={() => {
                    if (["application", "paperwork"].includes(goal.id)) {
                      setDraft(goal.id);
                      requestAnimationFrame(() =>
                        document
                          .getElementById("help-desk-agency-title")
                          ?.focus(),
                      );
                    } else open(goal.id, "unknown");
                  }}
                >
                  <span>
                    <strong>{goal.label}</strong>
                    <span>{goal.description}</span>
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {!choosing && item && (
        <ContactWorkspace
          key={item.key}
          item={item}
          today={today}
          online={online}
          onChange={(change) =>
            onAction({ type: "assistance-change", key: item.key, change })
          }
        />
      )}
      <div className="help-desk-footer">
        {item && !choosing && (
          <button
            className="text-button"
            onClick={() => {
              setChoosing(true);
              setDraft(null);
            }}
          >
            Start a different contact plan
          </button>
        )}
        {item && choosing && (
          <button
            className="text-button"
            onClick={() => {
              setChoosing(false);
              setDraft(null);
            }}
          >
            Return to my saved contact plan
          </button>
        )}
        <button className="text-button" onClick={onLocalHelp}>
          Find a real person to help{" "}
          <ArrowUpRight size={15} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
function ContactWorkspace({
  item,
  today,
  online,
  onChange,
}: {
  item: AssistanceCase;
  today: string;
  online: boolean;
  onChange: (change: AssistanceChange) => void;
}) {
  const { contact, script, questions } = assistanceRoute(
    item.goal,
    item.agency,
  );
  const next = assistanceNext(item, today || "0000-00-00");
  const advice = assistanceBarrierAdvice(item),
    last = item.attempts.at(-1);
  const [channel, setChannel] = useState<"phone" | "website" | "in-person">(
    "phone",
  );
  const [outcome, setOutcome] =
    useState<AssistanceCase["attempts"][number]["outcome"]>("no-answer");
  const [message, setMessage] = useState("");
  const [logOpen, setLogOpen] = useState(item.attempts.length > 0);
  const exporting = useRef(false);
  const mayConfirm =
    !!last &&
    ["spoke", "sent", "referred"].includes(last.outcome) &&
    item.instruction !== "clarify";
  const needsReply = !last || ["no-answer", "message"].includes(last.outcome);
  const callLink = (
    <a
      className="button primary"
      href={`tel:${contact.phone.replaceAll("-", "")}`}
    >
      <Phone size={18} aria-hidden="true" />
      Call {contact.phone}
    </a>
  );
  const overdue =
    !!today &&
    ((!!item.responseDate && item.responseDate <= today) ||
      (!!item.followUpDate && item.followUpDate <= today)) &&
    !item.resolved;
  const sourceDue =
    !!today &&
    Date.parse(today) - Date.parse(contact.reviewedAt) >
      contact.reviewAfterDays * 86400000;
  async function exportSheet() {
    if (exporting.current) return;
    exporting.current = true;
    try {
      const result = await download(
        "bridgeback-contact-plan.txt",
        assistanceSheet(item, today || localCalendarDate()),
      );
      setMessage(
        result === "cancelled"
          ? "Sharing cancelled. Your contact plan is saved here."
          : result === "shared"
            ? "You shared the contact sheet using the system share sheet."
            : "Your contact sheet was downloaded. It includes questions and your reported contact history, not your income or private case details.",
      );
    } catch {
      setMessage(
        "The export could not be confirmed. Your contact plan is still saved here; check your destination before trying again.",
      );
    } finally {
      exporting.current = false;
    }
  }
  return (
    <div className="help-desk-current">
      <div className={`help-desk-next ${overdue ? "attention" : ""}`}>
        <span className="section-label">Your next useful action</span>
        <h3 id="help-desk-current" tabIndex={-1}>
          {next.title}
        </h3>
        {needsReply && <div className="inline-actions">{callLink}</div>}
        <p>{next.detail}</p>
        <small>{next.reason}</small>
        {!needsReply && !item.resolved && (
          <div className="inline-actions">
            <button
              className="button secondary"
              onClick={() => {
                setLogOpen(true);
                requestAnimationFrame(() =>
                  document
                    .getElementById(
                      item.instructionsConfirmed && item.requestedPapers.length
                        ? "help-desk-papers"
                        : "help-desk-instruction",
                    )
                    ?.focus(),
                );
              }}
            >
              {item.instructionsConfirmed && item.requestedPapers.length
                ? "Review my requested paperwork"
                : "Review my next instructions"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <div className="help-desk-contact">
        <div>
          <span className="section-label">Who to contact</span>
          <h3>{contact.name}</h3>
          <p>{contact.description}</p>
        </div>
        <div className="help-desk-contact-actions">
          {!needsReply && callLink}
          <a
            className="button secondary"
            href={contact.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            Official contact information{" "}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          {contact.tty && (
            <a
              className="button secondary"
              href={`tel:${contact.tty.replaceAll("-", "")}`}
            >
              TTY: {contact.tty}
            </a>
          )}
        </div>
      </div>
      {!online && (
        <p className="help-desk-note">
          You’re offline. Saved questions and contact plans still work. Websites
          need internet access; calls need phone service.
        </p>
      )}
      {sourceDue && (
        <p className="help-desk-note">
          These contact details are due for review. Check the organization’s
          official page before relying on them.
        </p>
      )}
      <div className="help-desk-conversation">
        <div>
          <h3>You can start with this</h3>
          <blockquote>“{script}”</blockquote>
          <p className="fine-print">
            Use your own words. Keep case numbers and personal records out of
            BridgeBack; share them only through a confirmed provider’s
            appropriate process.
          </p>
        </div>
        <div>
          <h3>Before you finish, ask</h3>
          <ol>
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </div>
      </div>
      <div className="help-desk-barrier">
        <label>
          Is something making this difficult?
          <select
            value={item.barrier}
            onChange={(e) =>
              onChange({
                type: "barrier",
                value: e.target.value as AssistanceCase["barrier"],
              })
            }
          >
            {assistanceBarriers.map((b) => (
              <option value={b.id} key={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        {advice && (
          <div className="help-desk-note" role="status">
            <p>{advice}</p>
            {item.agency === "county" &&
              ["phone", "technology"].includes(item.barrier) && (
                <a
                  href="https://www.sandiegocounty.gov/content/sdc/sdhcd/rental-assistance/Yardi.html"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  County instructions for assisted access{" "}
                  <ArrowUpRight size={14} />
                </a>
              )}
          </div>
        )}
      </div>
      <details
        className="help-desk-log"
        open={logOpen}
        onToggle={(event) => setLogOpen(event.currentTarget.open)}
      >
        <summary>After you try: record what happened</summary>
        <p>
          Only save an outcome after you actually tried. Opening a phone link or
          website does not count as a contact, submission or reply.
        </p>
        <div className="help-desk-fields">
          <label>
            How did you contact them?
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
            >
              <option value="phone">Phone</option>
              <option value="website">Official website or contact form</option>
              <option value="in-person">In person</option>
            </select>
          </label>
          <label>
            What actually happened?
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as typeof outcome)}
            >
              {assistanceOutcomes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            onChange({ type: "contact", channel, outcome });
            setMessage(
              "Your reported contact outcome was saved. Review your updated next action above.",
            );
          }}
        >
          <Check size={16} aria-hidden="true" />
          Save my contact outcome
        </button>
        {last && (
          <p className="help-desk-last">
            <Clock3 size={15} aria-hidden="true" />
            Last reported:{" "}
            {assistanceOutcomes.find((o) => o.id === last.outcome)!.label}.{" "}
            <time dateTime={last.at}>
              {new Date(last.at).toLocaleString("en-US")}
            </time>
          </p>
        )}
        <label>
          What did the organization ask you to do next?
          <select
            id="help-desk-instruction"
            value={item.instruction}
            onChange={(e) =>
              onChange({
                type: "instruction",
                value: e.target.value as AssistanceCase["instruction"],
              })
            }
          >
            {assistanceInstructions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
        <label className="help-desk-check">
          <input
            type="checkbox"
            checked={item.instructionsConfirmed}
            disabled={!mayConfirm}
            onChange={(e) =>
              onChange({ type: "confirm", value: e.target.checked })
            }
          />
          <span>I confirmed this next step with the organization.</span>
        </label>
        {!mayConfirm && (
          <p className="fine-print">
            Record an answered question, referral or actual submission, then
            select a specific next step before confirming it. A message without
            a reply does not confirm instructions.
          </p>
        )}
        {((item.instructionsConfirmed &&
          ["gather", "submit"].includes(item.instruction)) ||
          item.requestedPapers.length > 0) && (
          <fieldset
            className="help-desk-papers"
            id="help-desk-papers"
            tabIndex={-1}
          >
            <legend>Paperwork the organization asked me for</legend>
            <p>
              Use its exact written list. These broad categories are your own
              reminder, not a program’s document rules. “Prepared” does not mean
              the provider accepted it. Keep the actual papers and instructions
              privately.
            </p>
            {assistancePapers.map((p) => (
              <div className="help-desk-paper-row" key={p.id}>
                <label className="help-desk-check">
                  <input
                    type="checkbox"
                    checked={item.requestedPapers.includes(p.id)}
                    disabled={
                      !item.instructionsConfirmed &&
                      !item.requestedPapers.includes(p.id)
                    }
                    onChange={(event) =>
                      onChange({
                        type: "paper-request",
                        id: p.id,
                        value: event.target.checked,
                      })
                    }
                  />
                  <span>They requested {p.label.toLowerCase()}</span>
                </label>
                {item.requestedPapers.includes(p.id) && (
                  <label className="help-desk-check">
                    <input
                      type="checkbox"
                      checked={item.preparedPapers.includes(p.id)}
                      onChange={(event) =>
                        onChange({
                          type: "paper-ready",
                          id: p.id,
                          value: event.target.checked,
                        })
                      }
                    />
                    <span>
                      I prepared the requested {p.label.toLowerCase()}
                    </span>
                  </label>
                )}
              </div>
            ))}
          </fieldset>
        )}
        <div className="help-desk-fields">
          <label>
            My follow-up reminder
            <input
              type="date"
              value={item.followUpDate}
              onChange={(e) =>
                onChange({
                  type: "date",
                  kind: "followup",
                  value: e.target.value,
                })
              }
            />
          </label>
          <label>
            Response date from my letter or provider, if any
            <input
              type="date"
              value={item.responseDate}
              onChange={(e) =>
                onChange({
                  type: "date",
                  kind: "response",
                  value: e.target.value,
                })
              }
            />
          </label>
        </div>
        <p className="fine-print">
          Both dates are entered by you and shown in this app. BridgeBack does
          not verify or calculate a legal deadline, extend it, or send
          background notifications.
        </p>
        <label className="help-desk-check">
          <input
            type="checkbox"
            checked={item.resolved}
            disabled={!item.instructionsConfirmed}
            onChange={(e) =>
              onChange({ type: "resolve", value: e.target.checked })
            }
          />
          <span>My question is resolved and I know what to do next.</span>
        </label>
        <p className="fine-print">
          Resolving a question does not complete your application or mark an
          official-program requirement as accepted.
        </p>
        {item.attempts.length > 1 && (
          <details>
            <summary>
              Earlier contact attempts ({item.attempts.length - 1})
            </summary>
            <ol>
              {item.attempts.slice(0, -1).map((a, i) => (
                <li key={`${a.at}-${i}`}>
                  {new Date(a.at).toLocaleString("en-US")} · {a.channel} ·{" "}
                  {assistanceOutcomes.find((o) => o.id === a.outcome)!.label}
                </li>
              ))}
            </ol>
            <p className="fine-print">
              The most recent 12 attempts are retained in this help plan.
            </p>
          </details>
        )}
      </details>
      <div className="help-desk-export">
        <button className="button secondary" onClick={exportSheet}>
          <Download size={16} aria-hidden="true" />
          Save my contact sheet
        </button>
        <a href={contact.sourceUrl} target="_blank" rel="noreferrer noopener">
          Where this contact comes from{" "}
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
      <p className="fine-print">
        Contact information reviewed {contact.reviewedAt}. Confirm current
        services directly. Your plan stays on this device. Nothing is sent to a
        provider by BridgeBack.
      </p>
      {message && (
        <p className="help-desk-note" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
