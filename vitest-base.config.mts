import { defineConfig } from 'vitest/config';

// Wird vom Angular-Builder `@angular/build:unit-test` eingelesen (angular.json: runnerConfig).
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcovonly'],
      thresholds: {
        // Ziel laut technischem Konzept §10; gilt nur für die Spiellogik in core/.
        'src/app/core/**/*.ts': {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85,
        },
      },
    },
  },
});
