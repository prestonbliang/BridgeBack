import { describe, expect, it } from "vitest";
import { runEvaluation } from "../lib/evaluation";

describe("fictional preparation evaluation benchmark", () => {
  it("meets independently specified outcomes across dependency, reuse, screening and rescue fixtures", () => {
    const report = runEvaluation();
    console.info(
      "BridgeBack evaluation (fictional fixtures): " + JSON.stringify(report),
    );
    for (const item of report.cases)
      expect(item.actual, `${item.id}: ${item.measure}`).toEqual(item.expected);
    expect(report.passed).toBe(report.total);
    expect(report.total).toBeGreaterThanOrEqual(20);
  });
});
