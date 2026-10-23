import { describe, expect, it } from "vitest";
import { parseCounselorPage } from "../lib/counselor-import.mjs";
import {
  filterCounselors,
  counselorSnapshot,
  type Counselor,
} from "../lib/counselors";
const at = "2026-10-23T03:00:00.000Z";
const agency = {
  agcid: "123",
  nme: "Fictional test agency with a } in its name",
  phone1: "555-555-0101",
  adr1: "Test address",
  adr2: null,
  city: "Test city",
  statecd: "CA",
  zipcd: "92101",
  languages: ["Spanish"],
  services: ["Rental Housing Counseling"],
  distance: 3.2,
  counslg_METHOD: "Phone Counseling,Video Conference",
};
const page = (data: unknown) =>
  `<script>window.cfpbHudSettings.hud_data = {};</script><script>window.cfpbHudSettings.hud_data = ${JSON.stringify(data)};</script><script>throw new Error('must never execute')</script>`;
describe("external counselor snapshot boundary", () => {
  it("extracts validated data without executing external scripts, retaining source provenance", () => {
    const imported = parseCounselorPage(
      page({ zip: { zipcode: "92101" }, counseling_agencies: [agency] }),
      at,
    );
    expect(imported.counselors[0].name).toContain("} in its name");
    expect(imported.counselors[0].methods).toEqual([
      "Phone Counseling",
      "Video Conference",
    ]);
    expect(imported.sourceUrl).toBe(
      "https://www.consumerfinance.gov/find-a-housing-counselor/?zipcode=92101",
    );
    expect(imported.retrievedAt).toBe(at);
  });
  it("rejects changed markup, wrong geography, duplicates, empty data and invalid phone fields", () => {
    expect(() => parseCounselorPage("<p>Changed page</p>", at)).toThrow();
    expect(() =>
      parseCounselorPage(
        page({ zip: { zipcode: "10001" }, counseling_agencies: [agency] }),
        at,
      ),
    ).toThrow();
    expect(() =>
      parseCounselorPage(
        page({ zip: { zipcode: "92101" }, counseling_agencies: [] }),
        at,
      ),
    ).toThrow();
    expect(() =>
      parseCounselorPage(
        page({
          zip: { zipcode: "92101" },
          counseling_agencies: [agency, agency],
        }),
        at,
      ),
    ).toThrow();
    expect(() =>
      parseCounselorPage(
        page({
          zip: { zipcode: "92101" },
          counseling_agencies: [{ ...agency, phone1: "javascript:alert(1)" }],
        }),
        at,
      ),
    ).toThrow();
  });
  it("filters real listed attributes without inferring services or user location", () => {
    const fixture: Counselor[] = [
      {
        id: "hud-1",
        name: "Fictional A",
        phone: "555-555-0101",
        address: "Test",
        languages: ["Spanish"],
        services: ["Rental Housing Counseling"],
        methods: ["Phone Counseling"],
        distanceMiles: 2,
      },
      {
        id: "hud-2",
        name: "Fictional B",
        phone: "555-555-0102",
        address: "Test",
        languages: ["English"],
        services: ["Rental Housing Counseling"],
        methods: ["Phone Counseling"],
        distanceMiles: 3,
      },
      {
        id: "hud-3",
        name: "Fictional C",
        phone: "555-555-0103",
        address: "Test",
        languages: ["Spanish"],
        services: ["Pre-purchase Counseling"],
        methods: ["Phone Counseling"],
        distanceMiles: 1,
      },
    ];
    expect(
      filterCounselors({ language: "Spanish" }, fixture).map((item) => item.id),
    ).toEqual(["hud-1"]);
    expect(
      filterCounselors({ language: "Spanish", service: "all" }, fixture).map(
        (item) => item.id,
      ),
    ).toEqual(["hud-3", "hud-1"]);
    expect(filterCounselors({ language: "Vietnamese" }, fixture)).toEqual([]);
    expect(() => filterCounselors({ maxMiles: -1 }, fixture)).toThrow();
    expect(counselorSnapshot.counselors.length).toBeGreaterThan(0);
  });
});
