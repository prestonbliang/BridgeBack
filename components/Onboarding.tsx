"use client";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { type Workspace, type WorkspaceAction } from "../lib/workspace";
import { programs, documentTypes } from "../lib/programs";
import { screenProgram } from "../lib/planner";
import { Dialog } from "./ui";
export function Onboarding({
  open,
  onClose,
  state,
  onAction,
  onFinish,
}: {
  open: boolean;
  onClose: () => void;
  state: Workspace;
  onAction: (a: WorkspaceAction) => void;
  onFinish: () => void;
}) {
  const step = state.onboarding.step;
  function finish() {
    onAction({ type: "onboarding", step: 0, done: true });
    onFinish();
  }
  function next() {
    if (step === 1 && state.profile.location === "Other") {
      finish();
      return;
    }
    if (step === 3 && !state.selectedProgramIds.length) {
      finish();
      return;
    }
    if (step >= 4) {
      finish();
      return;
    }
    onAction({ type: "onboarding", step: step + 1, done: false });
  }
  const titles = [
    "What would help right now?",
    "Where are you looking?",
    "A little context, if you’re comfortable.",
    "Choose a route to practice.",
    "What do you already have?",
  ];
  return (
    <Dialog open={open} onClose={onClose} title="Find your starting point">
      <div className="eyebrow">YOUR STARTING POINT · {step + 1} / 5</div>
      <h2>{titles[step]}</h2>
      <p className="onboarding-note">
        You can skip any question. Answers stay in this browser and help explain
        sample screening results.
      </p>
      <div className="onboarding-content">
        {step === 0 && (
          <fieldset>
            <legend>Choose the need closest to yours</legend>
            {(["Rent support", "Housing search", "At risk"] as const).map(
              (need) => (
                <label className="choice" key={need}>
                  <input
                    type="radio"
                    name="need"
                    checked={state.profile.need === need}
                    onChange={() =>
                      onAction({
                        type: "profile",
                        profile: { ...state.profile, need },
                      })
                    }
                  />
                  <span>
                    <strong>
                      {need === "At risk" ? "Keeping my current housing" : need}
                    </strong>
                    <small>
                      {need === "Rent support"
                        ? "Understand preparation for rent assistance"
                        : need === "Housing search"
                          ? "Organize a housing search"
                          : "Find relevant support and referral resources"}
                    </small>
                  </span>
                </label>
              ),
            )}
          </fieldset>
        )}
        {step === 1 && (
          <>
            <p>
              Service areas matter. A city-level choice is enough; we never need
              your address.
            </p>
            <label>
              Location
              <select
                value={state.profile.location}
                onChange={(e) =>
                  onAction({
                    type: "profile",
                    profile: {
                      ...state.profile,
                      location: e.target
                        .value as Workspace["profile"]["location"],
                    },
                  })
                }
              >
                <option value="Unknown">Prefer to skip</option>
                <option>San Diego</option>
                <option value="Other">Outside San Diego</option>
              </select>
            </label>
            {state.profile.location === "Other" && (
              <p className="notice">
                We’ll skip local screening questions and take you to national
                resource links. Fictional examples remain available to explore.
              </p>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <p>
              These optional answers compare your circumstances with explicitly
              fictional sample rules. Real provider eligibility is not
              evaluated.
            </p>
            <label>
              Household size (optional)
              <input
                type="number"
                min={1}
                max={20}
                value={state.profile.household ?? ""}
                onChange={(e) => {
                  const n =
                    e.target.value === "" ? null : Number(e.target.value);
                  if (n === null || (Number.isInteger(n) && n >= 1 && n <= 20))
                    onAction({
                      type: "profile",
                      profile: { ...state.profile, household: n },
                    });
                }}
              />
            </label>
            <label>
              Approximate annual income ($, optional)
              <input
                type="number"
                min={0}
                max={1000000}
                value={state.profile.income ?? ""}
                onChange={(e) => {
                  const n =
                    e.target.value === "" ? null : Number(e.target.value);
                  if (n === null || (n >= 0 && n <= 1000000))
                    onAction({
                      type: "profile",
                      profile: { ...state.profile, income: n },
                    });
                }}
              />
            </label>
            <p className="fine-print">
              Unknown answers remain unknown. No Social Security numbers, names
              or financial records.
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <p>
              All three plans below are fictional learning examples. Official
              resources are available in Discover.
            </p>
            {programs.map((p) => (
              <label className="choice" key={p.id}>
                <input
                  type="checkbox"
                  checked={state.selectedProgramIds.includes(p.id)}
                  onChange={(e) =>
                    onAction({
                      type: "program",
                      id: p.id,
                      selected: e.target.checked,
                    })
                  }
                />
                <span>
                  <strong>{p.shortName}</strong>
                  <small>
                    {screenProgram(p, state.profile).result} under fictional
                    rules
                  </small>
                </span>
              </label>
            ))}
          </>
        )}
        {step === 4 && (
          <>
            <p>
              Availability is enough. Accepted documents may help with more than
              one selected plan; each plan keeps its own rules.
            </p>
            {documentTypes
              .filter((d) =>
                programs
                  .filter((p) => state.selectedProgramIds.includes(p.id))
                  .some((p) =>
                    p.accepts.some((a) => a.documentIds.includes(d.id)),
                  ),
              )
              .map((d) => (
                <label className="choice" key={d.id}>
                  <input
                    type="checkbox"
                    checked={!!state.documents[d.id]}
                    onChange={(e) =>
                      onAction({
                        type: "document",
                        id: d.id,
                        available: e.target.checked,
                      })
                    }
                  />
                  <span>
                    <strong>{d.name}</strong>
                    <small>I have this available. No upload needed.</small>
                  </span>
                </label>
              ))}
          </>
        )}
      </div>
      <div className="onboarding-controls">
        {step > 0 && (
          <button
            className="button secondary"
            onClick={() =>
              onAction({ type: "onboarding", step: step - 1, done: false })
            }
          >
            Back
          </button>
        )}
        <button className="text-button" onClick={next}>
          {step === 4 ? "Skip & see my path" : "Skip this step"}
        </button>
        <button className="button primary" onClick={next}>
          {step === 4 ? "Show my first steps" : "Continue"}
          {step === 4 ? <Check size={17} /> : <ArrowRight size={17} />}
        </button>
      </div>
      <div className="privacy-line">
        <ShieldCheck size={15} /> Your place is saved if you close this guide.
      </div>
    </Dialog>
  );
}
