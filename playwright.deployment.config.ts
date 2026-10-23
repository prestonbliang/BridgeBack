import { defineConfig } from "@playwright/test";
import local from "./playwright.config";

const origin = process.env.BRIDGEBACK_PUBLIC_URL;
if (!origin)
  throw Error("Set BRIDGEBACK_PUBLIC_URL to your deployment's HTTPS origin.");
const url = new URL(origin);
const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
if (
  (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) ||
  url.username ||
  url.password ||
  url.pathname !== "/" ||
  url.search ||
  url.hash
)
  throw Error(
    "Use a plain HTTPS origin without credentials, a path or query parameters.",
  );

// Reuse the actual application regression suite against the deployed host.
// Each test gets an empty browser workspace; no real applicant data is used.
export default defineConfig({
  ...local,
  webServer: undefined,
  use: { ...local.use, baseURL: url.origin },
  outputDir: "artifacts/deployment-browser-results",
  workers: 2,
});
