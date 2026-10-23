# Production candidate: scope, evidence and release gates

BridgeBack now includes a real, deliberately limited County housing-guidance workflow. It remains a preparation tool: no agency application, official eligibility decision, placement, appointment or guaranteed assistance is produced. The deployed web version can check public source pages. The native build bundles reviewed guidance and does not pretend that offline information is live.

## What is real and useful

Three reviewed entries are in `lib/official-catalog.json`: County Section 8 Housing Choice Voucher, County Public Housing, and the County's HUD-VASH/VA referral information. Eleven official sources were read on October 23, 2026, including selected admissions-policy sections and the applicant registration guide. Source records identify the URL, reviewed excerpt or PDF hash, review date and a 30-day BridgeBack review reminder. That reminder is our editorial policy, not an agency deadline.

The County's application directions explicitly close new waiting-list applications for HCV and Public Housing. New inquiries get a helper/referral route. Existing applicants get a different route for contact information and letters. Online portal access OR arranged County assistance can satisfy the access milestone. Reading letters does not require portal access; an account problem must not prevent someone checking a real response deadline. The app does not record a call just because a phone link was opened.

The Public Housing policy, page 7-23, lists recent paystub(s) OR an employer statement to verify a working-family preference. Documents tracks those options separately from the practice inventory. Possessing one paper does not establish that the preference applies, prove full eligibility or open the waiting list. No other substitute is invented. No identity, military, medical or financial documents are uploaded.

## Conflicts are a result, not something to hide

The Public Housing overview says 50% AMI and describes a residence condition. The linked admissions policy discusses 80% AMI in §2-1, treats residency as a preference in §4-4, and includes a category without that preference in §4-5. The overview also describes applying online while application directions say the waiting list is closed.

The app shows the 2026 household-size table's 50% and 80% figures, explains the discrepancy, and returns **More information needed**. It does not disqualify an applicant based on the 50% overview figure or living outside the authority's jurisdiction. HCV exceptions, VA assessments and other admission conditions are not fully modeled, so their real-program checks also remain uncertain. The fictional engine still exercises positive/negative eligibility boundaries in its separate demonstration. Do not describe the real catalog as a complete eligibility screener.

## Page checks and maintenance

`GET /api/source-status` accepts no applicant data or caller-supplied URL. It checks only fixed County HTTPS sources, rejects redirects, caps HTML at 2 MiB and PDFs at 4 MiB, and applies an eight-second request timeout. HTML checks look for the reviewed excerpts; PDFs must match their reviewed SHA-256. Missing facts or contradictory opening wording require a person to review the source. The checker never invents a new opening or rewrites eligibility rules automatically.

Next.js ISR shares the report and refreshes it on demand after 15 minutes. The first request after expiry may receive an older report while revalidation runs; the client uses the report's actual timestamp, labels an old response, and suggests trying again or opening the source. It does not call that response a new check. All-unavailable/invalid responses preserve the previous saved report and plans. Source checks are not a live feed of vouchers, units or appointments. If a date is stale, the browser is offline, the clock is implausible, or the catalog version differs, the report is not presented as fresh.

The source audit workflow runs daily and on catalog changes. It stores the actual report as an artifact and fails when an excerpt/PDF changes or cannot be fetched. HTTP 200 alone is not verification. Run it locally with:

```sh
npm run programs:audit
```

Review `artifacts/official-source-audit.json`. Read the affected official source; compare other applicable policies; update facts, excerpts/hashes, source dates and the catalog version only after review. Run deterministic tests, live audit, builds and browser checks, then deploy a reviewed revision. A failed check must not silently move the review date forward. Assign an actual maintainer before public rollout; no agency partnership or update agreement exists.

## Data and security boundaries

Workspace schema 3 migrates versions 1/2 while preserving saved progress. New real plans, optional municipality, real-document status and dated source reports share IndexedDB validation, revision conflict handling, export and deletion. Existing tabs from the older schema reject newer records instead of interpreting them as version 2. The IndexedDB index layout remains database version 2; record schema and database-index versions are distinct.

Real follow-up progress counts explicit milestones. OR access options count once. Correcting an access step removes dependent contact/follow-up check marks while preserving an independent letter review. Switching routes resets route-specific steps. None of this modifies fictional preparation readiness. Source checks never receive household answers. Hosting providers still process ordinary connection metadata; review their logging/retention settings and the deployed privacy policy.

Web responses include anti-framing, MIME-sniffing, no-referrer and permission restrictions, plus a production CSP. Next.js inline bootstrap scripts and React Flow styles require inline allowances in this configuration; this is not a nonce-based CSP or a claim that every XSS risk is eliminated. There is no user HTML rendering, runtime AI, backend profile database, advertising or account system.

## Deploy the actual web application

The production target is **https://bridge-back-one.vercel.app/**, provided by the publisher after connecting Vercel. The [deployment walkthrough](PUBLIC-DEPLOYMENT.md) gives exact import settings and a public-origin verification procedure. `vercel.json` configures the web build; `/sw.js` has explicit revalidation and scope headers. **Check a public deployment** exercises the actual hosted origin; inspect its result independently of the hosting dashboard's Ready badge.

Use a Next.js-compatible Node 24 host with HTTPS, such as Vercel, or the tested container route. Build with `npm ci && npm run build`; start with `npm start`. No application secrets or external database are required. Do not use a static-only host for the web source-check endpoint. Do not set `BRIDGEBACK_NATIVE=1` on the web deployment.

```sh
docker build --tag bridgeback-production .
docker run --detach --name bridgeback --publish 3000:3000 bridgeback-production
```

The multi-stage image installs only production dependencies into the final image, runs as the unprivileged `node` user, includes a health check, and compiles the typed Next configuration during the build so startup does not install a compiler. Keep `.next` writable for ISR. For a container-hosted alternative, put it behind an HTTPS reverse proxy, configure the publisher's real hostname and hosting policy, and verify `/`, `/privacy`, `/notices`, `/manifest.webmanifest`, `/sw.js` and `/api/source-status` on that origin. The current production target uses Vercel rather than a claim that this local container is publicly reachable.

For this cloud's trusted network proxy, Node checks use `NODE_USE_ENV_PROXY=1`. A local container build can pass the existing public environment CA as an ephemeral BuildKit secret and standard proxy build arguments. Do not disable TLS verification, commit a certificate/key, bake proxy credentials into the image or pass applicant information to a source checker. Ordinary hosts do not need the cloud-specific certificate mount.

## Dependency maintenance

The production audit on October 23 found advisories inherited through Sharp/PostCSS. `package.json` explicitly overrides PostCSS to 8.5.31 and ties the transitive Sharp version to the patched direct 0.35.5 development-tool version. The lockfile and license inventory are updated together. CI runs `npm audit --omit=dev --audit-level=high`; the current production audit is zero, with the full report in `production-dependency-audit.json`. This is a known-advisory check, not a security certification. Re-run compatibility/build/browser checks when removing or updating the overrides.

## Human and release gates

| Gate                      | Current boundary                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Published source accuracy | Reviewed limited subset, hashes/excerpts and automated change detection; not agency-certified or exhaustive                                         |
| Web behavior              | Deterministic unit/browser/offline and accessibility checks; inspect the validation record for actual executed results                              |
| Source availability       | Public-page checks with dated reports; no live unit/voucher/appointment API                                                                         |
| iOS                       | Bundled real guidance and offline tracking; physical iPhone/iPad/VoiceOver, signing and TestFlight remain separate gates                            |
| Deployment                | Public Vercel HTTPS checks passed; hosting log/retention settings, account access and ongoing rollout remain under publisher control                |
| Applicant usability       | Representative, consent-based user/helper sessions still need to be performed; no measured outcomes are claimed                                     |
| Operations                | Assign source-review and incident ownership; confirm changed guidance, broken contact links, export/recovery and a rollback before public promotion |

Keep a prior tested container/revision for rollback. Browser data stays on the person's device, so a server rollback must not reset it. An older application that cannot read a newer record must preserve it and offer recovery rather than overwriting it. Before public rollout, rehearse export, deletion, multi-tab conflicts, offline reload and a failed source check on the deployed HTTPS origin.

## Visual review

[Real-program directory](screenshots/official-programs-desktop.png) · [Phone checklist](screenshots/official-plan-mobile.png) · [Dark document workspace](screenshots/official-documents-dark.png). These are screenshots of the running production container with illustrative local state. The source check used actual official responses; document marks and checklist steps are test state, not evidence of a real applicant, provider contact, accepted document or housing outcome.

## Executed release CI

The production-candidate application source passed [web/container checks](https://github.com/prestonbliang/BridgeBack/actions/runs/39999239593), [the live source audit](https://github.com/prestonbliang/BridgeBack/actions/runs/39999239625) and [unsigned iOS simulator/device compilation](https://github.com/prestonbliang/BridgeBack/actions/runs/39999239500). The exact commit and limitations are recorded in [CI evidence](production-ci-evidence.json). Those earlier passes do not establish a public deployment, agency review or physical-device test.

The subsequent [public Vercel verification](https://github.com/prestonbliang/BridgeBack/actions/runs/40012645015) completed successfully against **https://bridge-back-one.vercel.app/**. It ran the HTTP checker and desktop/mobile browser regression suite against the hosted origin. [Public-deployment evidence](public-deployment-evidence.json) retains the verification checkout, status and artifact digest. Detailed browser statistics and nonfatal source warnings are retained in the run's downloadable report; they are not inferred from the green status. Physical-device and representative-applicant testing remain separate.
