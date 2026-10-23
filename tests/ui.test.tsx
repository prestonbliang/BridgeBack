// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../app/page";
import { deleteWorkspace, loadWorkspace, saveWorkspace } from "../lib/store";
import { initialWorkspace } from "../lib/workspace";
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
  await screen.findByRole("button", { name: "Try a guided demo" });
  await userEvent.click(
    screen.getByRole("button", { name: "Try a guided demo" }),
  );
  expect(
    screen.getByRole("heading", { name: "Pay stub", level: 2 }),
  ).toBeTruthy();
  expect(screen.getByText("4 of 10 milestones complete")).toBeTruthy();
  await userEvent.click(
    screen.getByRole("button", { name: "Return to my workspace" }),
  );
  await waitFor(async () =>
    expect((await loadWorkspace())?.profile.household).toBe(3),
  );
  expect(
    screen.getByRole("heading", { name: "One step. More possibilities." }),
  ).toBeTruthy();
});
