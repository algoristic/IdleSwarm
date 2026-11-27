import { defineConfig } from 'vitest/config';

// Wird vom Angular-Builder `@angular/build:unit-test` eingelesen (angular.json: runnerConfig).
export default defineConfig({
  test: {
    // Abdeckung wird nur gemessen; die Untergrenze ist bis zum Testkonzept ausgesetzt (AP 14, docs/plan-angular-umbau.md).
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcovonly'],
    },
  },
});
