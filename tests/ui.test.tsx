// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../app/page";
import { deleteWorkspace, loadWorkspace, saveWorkspace } from "../lib/store";
import { initialWorkspace } from "../lib/workspace";
import { Overview } from "../components/Overview";
import { evaluatePlan, simulatePlan } from "../lib/planner";
import { evaluationInput } from "../lib/evaluation";
vi.mock("@xyflow/react", () => ({
  ReactFlow: () => null,
  Background: () => null,
  Controls: () => null,
  MarkerType: { ArrowClosed: "closed" },
}));
afterEach(async () => {
  cleanup();
  await deleteWorkspace();
});
it("opens an isolated demo with computed multi-program readiness and preserves personal data", async () => {
  await saveWorkspace({
    ...initialWorkspace(),
    profile: {
      household: 3,
      income: 40000,
      location: "Other",
      need: "Housing search",
    },
  });
  render(<App />);
  await screen.findByRole("button", { name: "Try a guided example" });
  await userEvent.click(
    screen.getByRole("button", { name: "Try a guided example" }),
  );
  expect(
    screen.getByRole("heading", { name: "Pay stub", level: 2 }),
  ).toBeTruthy();
  expect(screen.getByText("4 of 10 steps finished")).toBeTruthy();
  await userEvent.click(
    screen.getByRole("button", { name: "Return to my workspace" }),
  );
  await waitFor(async () =>
    expect((await loadWorkspace())?.profile.household).toBe(3),
  );
  expect(
    screen.getByRole("heading", { name: "Get your housing paperwork ready." }),
  ).toBeTruthy();
});

it("lets a new visitor try the document example without creating personal progress", async () => {
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "See what a pay stub changes" }),
  );
  expect(
    screen.getByText(
      "Now 2 more steps are ready to start. Checklist progress changes from 40% to 60%.",
    ),
  ).toBeTruthy();
  expect(await loadWorkspace()).toBeNull();
  await userEvent.click(
    screen.getByRole("button", { name: "Reset the example" }),
  );
  expect(
    screen.getByText("Try it here. This does not change your own checklist."),
  ).toBeTruthy();
});

it("does not call a checklist finished when unavailable documents prevent every remaining action", () => {
  const blocked = evaluatePlan(
    evaluationInput({
      selectedProgramIds: ["fresh"],
      documents: { identity: true },
      unavailable: ["paystub", "letter"],
      completed: ["fresh:household", "fresh:form", "fresh:review"],
    }),
  );
  expect(blocked.actions).toHaveLength(0);
  expect(blocked.readiness).toBeLessThan(100);
  render(
    <Overview
      analysis={blocked}
      example={simulatePlan(evaluationInput(), "doc:paystub")}
      resume={false}
      onStart={vi.fn()}
      onDemo={vi.fn()}
      onDiscover={vi.fn()}
      onPath={vi.fn()}
      onDocuments={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("heading", {
      name: "A missing document needs another option.",
    }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Check missing documents" }),
  ).toBeTruthy();
});
