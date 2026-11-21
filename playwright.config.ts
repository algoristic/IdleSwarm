import { defineConfig, devices } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

// Basis-Pfad des Builds: lokal `/`, in der CI der Pages-Pfad `/IdleSwarm/` (ci.yml).
const BASE_PATH = process.env['E2E_BASE_PATH'] ?? '/';
const PORT = 4300;
const CI = process.env['CI'] !== undefined;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}${BASE_PATH}`,
    // Der Service Worker des Produktions-Builds würde Caches zwischen Tests teilen.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    locale: 'de-DE',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'smartphone',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  // Liefert den vorhandenen Produktions-Build aus; `npm run e2e` baut vorher.
  webServer: {
    command: `node e2e/serve.mjs --port ${PORT} --base ${BASE_PATH}`,
    url: `http://127.0.0.1:${PORT}${BASE_PATH}`,
    reuseExistingServer: !CI,
  },
});
