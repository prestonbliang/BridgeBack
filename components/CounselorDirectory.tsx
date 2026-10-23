"use client";
import { useState } from "react";
import { ArrowUpRight, Phone, UserRound } from "lucide-react";
import {
  counselorSnapshot,
  filterCounselors,
  type Counselor,
} from "../lib/counselors";
export function CounselorDirectory({
  onChoose,
}: {
  onChoose?: (counselor: Counselor) => void;
}) {
  const [language, setLanguage] = useState("all");
  const [service, setService] = useState<"rental" | "all">("rental");
  const [maxMiles, setMaxMiles] = useState(25);
  const counselors = filterCounselors({ language, service, maxMiles });
  const languages = [
    ...new Set(counselorSnapshot.counselors.flatMap((item) => item.languages)),
  ].sort();
  return (
    <section className="counselor-directory" aria-labelledby="counselor-title">
      <div className="section-heading">
        <div>
          <span className="section-label">
            Public data from an official source
          </span>
          <h2 id="counselor-title">
            Housing counselors listed near downtown San Diego
          </h2>
        </div>
        <UserRound size={25} aria-hidden="true" />
      </div>
      <p>
        These agency details come from the CFPB’s finder, which uses HUD’s
        counseling-agency list. The saved search is for ZIP code{" "}
        <strong>92101</strong>, not your address. This is a limited search
        result, not every counselor in San Diego County.
      </p>
      <p className="counselor-source">
        Saved{" "}
        {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
          new Date(counselorSnapshot.retrievedAt),
        )}
        . This list works offline. Services, contact details, fees and
        appointment availability can change; call to confirm.
      </p>
      <div className="counselor-filters">
        <label>
          Listed service
          <select
            value={service}
            onChange={(event) =>
              setService(event.target.value as typeof service)
            }
          >
            <option value="rental">Rental Housing Counseling</option>
            <option value="all">Any listed service</option>
          </select>
        </label>
        <label>
          Listed language
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="all">Any listed language</option>
            {languages.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Distance from the 92101 search point
          <select
            value={maxMiles}
            onChange={(event) => setMaxMiles(Number(event.target.value))}
          >
            <option value={25}>Within 25 miles</option>
            <option value={75}>Within 75 miles</option>
            <option value={100}>Within 100 miles</option>
          </select>
        </label>
      </div>
      <p role="status" className="helper-text">
        {counselors.length} matching{" "}
        {counselors.length === 1 ? "listing" : "listings"} in the saved result.
        This does not mean an appointment is available.
      </p>
      <div className="support-resource-grid">
        {counselors.map((counselor) => (
          <article className="counselor-card" key={counselor.id}>
            <h3>{counselor.name}</h3>
            <p>{counselor.address}</p>
            <p className="helper-text">
              About {counselor.distanceMiles} miles from the 92101 search point.
            </p>
            <dl>
              <div>
                <dt>Languages listed</dt>
                <dd>{counselor.languages.join(", ")}</dd>
              </div>
              <div>
                <dt>Counseling methods listed</dt>
                <dd>{counselor.methods.join(", ")}</dd>
              </div>
            </dl>
            <details>
              <summary>See the services listed by the source</summary>
              <ul>
                {counselor.services.map((value) => (
                  <li key={value}>{value}</li>
                ))}
              </ul>
            </details>
            <div className="inline-actions">
              <a
                className="button secondary"
                href={`tel:+1${counselor.phone.replace(/-/g, "")}`}
              >
                <Phone size={16} aria-hidden="true" />
                {counselor.phone}
              </a>
              {onChoose && (
                <button
                  className="text-button"
                  onClick={() => onChoose(counselor)}
                >
                  Use this contact in my question sheet
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!counselors.length && (
        <div className="support-feedback">
          No saved listing matches these filters. Broaden the distance or
          language filter, or use the official finder for another ZIP code. This
          result does not mean there is no help available.
        </div>
      )}
      <a
        className="button secondary"
        href={counselorSnapshot.sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
      >
        Open the current official counselor finder
        <ArrowUpRight size={17} aria-hidden="true" />
      </a>
      <p className="helper-text">
        Opening the official finder contacts the CFPB website. BridgeBack does
        not append your profile or income. You can enter a different ZIP code on
        that site under its privacy policy.
      </p>
    </section>
  );
}
