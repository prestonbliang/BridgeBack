import { execFileSync } from "node:child_process";
// Vitest provides the existing TS transform, avoiding a new runtime dependency.
execFileSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "vitest.sources.config.ts",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      BRIDGEBACK_LIVE_SOURCE_AUDIT: "1",
      NODE_USE_ENV_PROXY: "1",
    },
  },
);
