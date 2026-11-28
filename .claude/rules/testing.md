---
paths:
  - 'src/**/*.spec.ts'
  - 'e2e/**'
  - 'tools/**/*.spec.*'
---

# Testing

Getestet werden die **wesentliche** Logik und die **wesentlichen** E2E-Abläufe; Hauptziel ist, unbeabsichtigte Regressionen zu vermeiden, nicht Vollständigkeit.

**Übergang:** Bis zur Kalibrierung und Abnahme durch den Nutzer (`docs/plan-angular-umbau.md`) wird lose getestet: Formatierung (`shared/util`), Golden Master der Spielregeln, E2E-Smoke. Die Abdeckung wird gemessen, die Untergrenze ist ausgesetzt. Danach legt AP 14 ein Testkonzept fest und führt die Untergrenze wieder ein.

- **Vitest** für die wesentlichen Regeln in `domain` und `util`. Die Abdeckung wird gemessen (`vitest-base.config.mts`); eine Untergrenze ist ein Sicherheitsnetz, kein Ziel. Specs liegen neben dem Code (`<name>.spec.ts`).
- **UI:** Komponententests nur für Komponenten und Seiten mit eigener Logik, die brechen kann (z. B. Formular-Parsing). Rein darstellende Komponenten deckt der E2E-Smoke ab. Erwartete Werte nicht aus dem Code unter Test ableiten.
- **E2E:** Playwright-Smoke für Desktop und Smartphone (`e2e/*.e2e.ts`) gegen den Produktions-Build (`e2e/serve.mjs`); nur wesentliche Abläufe, nur auf Test-IDs und Rollen warten (feste Wartezeiten meldet ESLint).
- Plattformzugriffe in Tests über die Tokens ersetzen, Zeit über Fake-Timer bzw. Parameter.
- **Eigene Lint-Regeln und Prüfskripte** (`tools/eslint-rules/rules.spec.js` mit `RuleTester`, `tools/checks/checks.spec.mjs`) laufen unter `node:test` (`npm run test:tools`, auch in der CI).
