# Publish BridgeBack on Vercel

This walkthrough uses the repository's Next.js web target, including the source-check endpoint and offline worker. You do not need a database, API key, account system or paid add-on. Vercel supplies an HTTPS `vercel.app` address; do not buy a domain to try the app. Check your account's plan terms and limits before public promotion.

## First deployment

1. Sign in at [Vercel](https://vercel.com) and open [Add New → Project](https://vercel.com/new).
2. Connect GitHub. Give Vercel access to **prestonbliang/BridgeBack**; selecting only this repository is sufficient. If the repository is missing, use **Adjust GitHub App Permissions** and add it.
3. Choose **Import** beside BridgeBack.
4. Set **Framework Preset** to **Next.js**, **Root Directory** to `./`, and **Production Branch** to `main`. Choose **Node.js 24.x** in project build settings if it is not already selected. Keep the repository's install and build commands: `npm ci` and `npm run build`. `vercel.json` supplies them.
5. Leave **Output Directory** at the Next.js default. Do not enter `out`, enable static export, or set `BRIDGEBACK_NATIVE=1`. The web deployment needs a server for source revalidation.
6. Leave environment variables empty. Do not copy the development workspace's proxy variables, certificates or GitHub credentials. Do not enable analytics, speed insights, storage, AI integrations or other add-ons for this deployment.
7. Click **Deploy**. Wait for **Ready**. If the build fails, open its build log; do not publish a native export as a workaround.
8. Open the production address. To make it public, check **Settings → Deployment Protection**: the production domain must not require a Vercel login. Preview protection can remain enabled. Check using a private browser window while signed out.
9. Copy the plain production origin, such as `https://your-project.vercel.app`. Use the stable project address, rather than an individual preview/build address, for applicants, installation and shared links.

Do not describe a deployment as public merely because its dashboard says Ready. A visitor without your account must be able to open the application, privacy page, worker and source endpoint.

## Verify that address

With Node 24 and the repository installed:

```sh
BRIDGEBACK_PUBLIC_URL=https://your-project.vercel.app node scripts/check-deployment.mjs
npx playwright install chromium
BRIDGEBACK_PUBLIC_URL=https://your-project.vercel.app npx playwright test --config playwright.deployment.config.ts
```

Replace the example address with the one Vercel actually provides. The first command checks public access, security headers, compiled assets, privacy/notices, manifest/icons, service-worker update headers, source-report schema and current catalog coverage. It writes `artifacts/deployment-check.json`. Changed, unavailable or old sources are reported as review warnings; use `--require-matched-sources` to make those warnings fail the release check. Page matches do not mean that vouchers, units or appointments are available.

The second check runs the existing desktop/mobile regression suite on the actual deployed origin, including persistence, offline reload, corrections, alternative requirements, export, failure behavior and accessibility checks. It creates isolated fictional/local test workspaces. It does not send applications or contact a provider on an applicant's behalf. Some tests deliberately intercept source responses; the separate HTTP checker exercises the real source endpoint. Browser output goes in `artifacts/deployment-browser-results/`. These checks are distinct from physical iPhone/Android installation and human usability testing.

Alternatively, open the repository's **Actions → Check a public deployment → Run workflow**, select the deployed revision, and enter the production HTTPS origin. The workflow uses no hosting secret. Its evidence is uploaded as an artifact. If Vercel authentication protection is still enabled, the check should fail; do not bypass protection with tokens in URLs.

## Check the visitor experience

In a private window, open **Find real programs**, save a County follow-up plan, and mark a preparation step. Wait for **Saved on this device** and **Offline ready**. Disconnect, reload, and check that the plan remains usable. Reconnect and choose **Check official pages**. Verify the timestamp and any source-review warning instead of assuming every page matches. Check `/privacy` and `/notices` directly.

On iPhone, use Safari → Share → Add to Home Screen. On Android, use the browser's Install app command. Stay on the same stable HTTPS origin: browser storage belongs to an origin. A preview URL, a new production project or a custom domain has a different workspace. Export progress before changing addresses; the app does not silently move or sync it.

## Updates, rollback and operations

After Git integration is connected, pushes to `main` normally create production deployments. Use pull-request previews and passing **Web production checks** before merging future changes. Vercel's default automatic deployment can finish before GitHub CI: a Ready badge alone does not establish that tests passed. Where your account supports deployment checks, require the web check. Otherwise review the exact commit's GitHub result before promotion and use manual promotion for releases.

Keep the prior successful deployment available in Vercel's deployment history. If a release breaks, use its **Instant Rollback** or promote the previous known-good deployment according to the account's available controls. Verify the public origin again. Do not clear users' browser data to fix a server release. Service-worker updates wait for old tabs to close; an installed offline shell may continue serving the older version until that happens. Changing server deployment does not instantly replace an already cached shell.

The daily **Official program source audit** workflow detects changed/unavailable sources; the publisher must monitor its failures and review the actual sources before updating rules. That workflow is not a vacancy feed and does not automatically correct the catalog. Review the host's connection-log retention and access controls before inviting applicants. The in-app privacy policy explains local storage and ordinary hosting metadata; no claim is made that host logs are disabled. Use the public issue tracker for app defects without applicant details. Never put an agency login, identity document or Social Security number in a GitHub issue or hosting log.

The hosting account's owner controls project access, billing, log settings and domain ownership. Repository configuration cannot create that account authorization. Until an actual reachable origin has been checked, this document describes deployment instructions rather than evidence of a completed public release.
