import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Set BASE_URL to run the identical suite against a deployed site (no local server is started).
const REMOTE = process.env.BASE_URL;
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: REMOTE ?? `http://localhost:${PORT}` },
  webServer: REMOTE
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 60_000,
      },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grepInvert: /@desktop-only/ },
  ],
});
