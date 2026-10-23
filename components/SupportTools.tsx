"use client";
import { useState } from "react";
import { ArrowUpRight, BookOpen, Copy, Download, Phone } from "lucide-react";
import { providerQuestionSheet, annualIncomeEstimate } from "../lib/support";
import { supportOutcomes, type SupportRecord } from "../lib/support-model";
import { type WorkspaceAction } from "../lib/workspace";
import {
  supportResources,
  type SupportResource,
} from "../lib/support-resources";
import { counselorSnapshot } from "../lib/counselors";
import { download } from "./ui";
import { useNativeApp } from "../hooks/useNativeApp";
export function ResourceCard({ resource }: { resource: SupportResource }) {
  return (
    <article className="support-resource">
      <span className="section-label">
        {resource.kind === "official-agency"
          ? "Government source"
          : "Service provider"}
      </span>
      <h3>{resource.name}</h3>
      <strong>{resource.organization}</strong>
      <p>{resource.purpose}</p>
      <details>
        <summary>What could I ask?</summary>
        <p>{resource.ask}</p>
      </details>
      <div className="inline-actions">
        <a
          className="button secondary"
          href={resource.url}
          target="_blank"
          rel="noreferrer noopener"
        >
          Open website
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
        {resource.phone && (
          <a className="button secondary" href={`tel:${resource.phone}`}>
            <Phone size={16} aria-hidden="true" />
            Call {resource.phone}
          </a>
        )}
      </div>
      <small>
        {resource.reviewedAt
          ? `Page reviewed ${resource.reviewedAt}. Confirm today’s services and appointments directly.`
          : "This page could not be reviewed here. Check current information on the website."}
      </small>
    </article>
  );
}
export function ContactPlan({
  title,
  record,
  onAction,
}: {
  title: string;
  record: SupportRecord;
  onAction: (action: WorkspaceAction) => void;
}) {
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const native = useNativeApp();
  const sheet = providerQuestionSheet(title, record.reason, record);
  return (
    <details
      className="contact-plan"
      open={
        !!record.contact ||
        record.outcome !== "not-contacted" ||
        ["contact", "rejected", "access"].includes(record.reason)
      }
    >
      <summary>Prepare questions and a follow-up plan</summary>
      <h3>Take these questions with you</h3>
      <p>
        This sheet uses general housing questions. It does not present the
        made-up practice program names or rules as real.
      </p>
      <textarea
        readOnly
        aria-label="Questions to ask a real provider"
        value={sheet}
        rows={10}
      />
      <div className="inline-actions">
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(sheet);
              setMessage("Questions copied. Nothing was sent to a provider.");
            } catch {
              setMessage(
                "Copy is not available in this browser. Use Download questions instead.",
              );
            }
          }}
        >
          <Copy size={16} aria-hidden="true" />
          Copy questions
        </button>
        <button
          className="button secondary"
          disabled={exporting}
          onClick={async () => {
            setExporting(true);
            try {
              const result = await download(
                "bridgeback-provider-questions.txt",
                sheet,
              );
              if (result === "cancelled") {
                setMessage("Sharing cancelled. Your help plan is unchanged.");
                return;
              }
              onAction({
                type: "record",
                eventType: "export",
                label:
                  "Exported a provider question sheet; no application was submitted.",
              });
              setMessage(
                result === "shared"
                  ? "You shared your questions using the system share sheet. BridgeBack did not submit an application."
                  : "Your question sheet was downloaded. You choose whether to share it.",
              );
            } catch {
              setMessage(
                "We could not confirm the export finished. Check your chosen destination before trying again. Your help plan is unchanged.",
              );
            } finally {
              setExporting(false);
            }
          }}
        >
          <Download size={16} aria-hidden="true" />
          {native ? "Share or save questions" : "Download questions"}
        </button>
      </div>
      <p role="status" className="helper-text">
        {message}
      </p>
      <div className="support-contact-fields">
        <label>
          Organization for this question
          <select
            value={record.contact?.id ?? ""}
            onChange={(event) =>
              onAction({
                type: "support-provider",
                targetId: record.targetId,
                providerId: event.target.value,
              })
            }
          >
            <option value="">Not chosen, or a different organization</option>
            <optgroup label="Agencies in the saved official counselor search">
              {counselorSnapshot.counselors.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Other referral and learning sources">
              {supportResources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.organization}
                </option>
              ))}
            </optgroup>
            {record.contact &&
              ![...counselorSnapshot.counselors, ...supportResources].some(
                (provider) => provider.id === record.contact!.id,
              ) && (
                <option value={record.contact.id}>
                  {record.contact.name} (earlier saved contact)
                </option>
              )}
          </select>
        </label>
        <label>
          Where does the conversation stand?
          <select
            value={record.outcome}
            onChange={(event) =>
              onAction({
                type: "support-contact",
                targetId: record.targetId,
                outcome: event.target.value as SupportRecord["outcome"],
              })
            }
          >
            {supportOutcomes.map((outcome) => (
              <option value={outcome.id} key={outcome.id}>
                {outcome.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          My follow-up reminder (optional)
          <input
            type="date"
            value={record.followUpDate}
            onChange={(event) =>
              onAction({
                type: "support-reminder",
                targetId: record.targetId,
                date: event.target.value,
              })
            }
            aria-describedby="reminder-limit"
          />
        </label>
        <p className="helper-text" id="reminder-limit">
          This is a date you choose to check back. It is not an agency deadline
          and does not extend one. There are no background notifications;
          reminders appear when you open BridgeBack.
        </p>
      </div>
      {record.outcome === "no-response" && (
        <p className="support-callout">
          Use the contact information on the organization’s own website to ask
          about another way to follow up. If you have a notice or response
          deadline, get appropriate provider or legal help promptly rather than
          relying on this reminder.
        </p>
      )}
    </details>
  );
}
export function LearningTools() {
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] =
    useState<Parameters<typeof annualIncomeEstimate>[1]>("monthly");
  const [answer, setAnswer] = useState("");
  const parsed = Number(amount);
  const estimate =
    amount !== "" && Number.isFinite(parsed) && parsed >= 0 && parsed <= 1000000
      ? annualIncomeEstimate(parsed, frequency)
      : null;
  return (
    <div className="learning-tools">
      <section className="learning-lesson">
        <div className="section-heading">
          <div>
            <span className="section-label">A short practice exercise</span>
            <h2>Read a pay stub without uploading yours</h2>
          </div>
          <BookOpen size={24} aria-hidden="true" />
        </div>
        <p>
          A pay stub may show several different amounts. Which one a provider
          needs depends on its instructions. This example teaches the labels; it
          does not choose the income amount for a real program.
        </p>
        <dl className="example-paystub">
          <div>
            <dt>Gross pay</dt>
            <dd>$1,000</dd>
          </div>
          <div>
            <dt>Deductions</dt>
            <dd>$180</dd>
          </div>
          <div>
            <dt>Net pay</dt>
            <dd>$820</dd>
          </div>
        </dl>
        <p>
          <strong>Gross</strong> means before the listed deductions.{" "}
          <strong>Net</strong> is what is left after them. The{" "}
          <strong>pay period</strong> is the stretch of time that payment
          covers.
        </p>
        <fieldset>
          <legend>
            In this made-up stub, which amount is before deductions?
          </legend>
          {[
            { id: "net", label: "$820 — net pay" },
            { id: "gross", label: "$1,000 — gross pay" },
          ].map((option) => (
            <label className="support-choice" key={option.id}>
              <input
                type="radio"
                name="paystub-reading"
                value={option.id}
                checked={answer === option.id}
                onChange={(event) => setAnswer(event.target.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        {answer && (
          <p className="support-feedback" role="status">
            {answer === "gross"
              ? "Yes. Gross pay is $1,000 before $180 in deductions. Net pay is $820. Always check whether a provider asks for gross, net, or another measure."
              : "Look at gross pay: that is the amount before deductions. The $820 net amount is what remains after deductions. Try the other answer."}
          </p>
        )}
        <p className="helper-text">
          Fictional amounts for learning only. Your answer does not change your
          profile or checklist.
        </p>
      </section>
      <section className="learning-lesson">
        <span className="section-label">Avoid a common income mistake</span>
        <h2>Turn a regular payment into a yearly estimate</h2>
        <p>
          This helps explain the time period. It does not decide eligibility or
          replace a provider’s method.
        </p>
        <div className="income-converter">
          <label>
            Amount for one payment ($)
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={1000000}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label>
            How often is that payment?
            <select
              value={frequency}
              onChange={(event) =>
                setFrequency(event.target.value as typeof frequency)
              }
            >
              <option value="weekly">Every week</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="semimonthly">Twice a month</option>
              <option value="monthly">Every month</option>
              <option value="annual">Once a year</option>
            </select>
          </label>
        </div>
        {amount !== "" && !estimate && (
          <p role="alert">Enter an amount from 0 to 1,000,000.</p>
        )}
        {estimate && (
          <div className="support-feedback" aria-live="polite">
            <strong>
              {estimate.annual.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}{" "}
              per year, approximately
            </strong>
            <p>{estimate.explanation}</p>
          </div>
        )}
        <p className="helper-text">
          Every 2 weeks usually means 26 payments per year; twice a month means
          24. For changing hours, irregular pay, other household income or
          benefits, ask how the provider wants you to calculate it. This
          exercise stays on this screen and never updates your profile
          automatically.
        </p>
      </section>
      <section className="learning-lesson">
        <h2>Read more from outside sources</h2>
        <p>
          These links open external learning or official replacement-document
          information. Source review dates are shown on each card. The
          explanations above were written for BridgeBack; they are not copied
          agency rules.
        </p>
        <div className="support-resource-grid">
          {supportResources
            .filter((resource) => resource.topics.includes("learning"))
            .map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
        </div>
      </section>
    </div>
  );
}
