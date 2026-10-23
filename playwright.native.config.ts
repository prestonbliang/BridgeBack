import { defineConfig, chromium } from "@playwright/test";
import { existsSync } from "node:fs";

export default defineConfig({
  testDir: "./tests/native-web",
  use: {
    baseURL: "http://127.0.0.1:3001",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (existsSync("/usr/bin/chromium")
          ? "/usr/bin/chromium"
          : chromium.executablePath()),
      args: ["--no-sandbox"],
    },
  },
  projects: [
    {
      name: "bundled-phone",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "bundled-tablet",
      use: {
        viewport: { width: 820, height: 1180 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
