import { execFileSync } from "node:child_process";
import { rm, access } from "node:fs/promises";

execFileSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  stdio: "inherit",
  env: { ...process.env, BRIDGEBACK_NATIVE: "1" },
});
await access(new URL("../out/index.html", import.meta.url));
// WKWebView loads bundled assets directly. Never install a browser worker there.
await rm(new URL("../out/sw.js", import.meta.url), { force: true });
execFileSync(
  process.execPath,
  ["node_modules/@capacitor/cli/bin/capacitor", "sync", "ios"],
  {
    stdio: "inherit",
  },
);
