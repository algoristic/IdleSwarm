---
paths:
  - "e2e/**"
  - "playwright.config.ts"
---

# E2E (Playwright-Smoke)

Smoke-Tests für die wesentlichen Abläufe (AP 1.5.7, TK §10, CLAUDE.md §10) mit `@playwright/test` (devDependency, nur Chromium). Ziel ist Regressionsschutz, nicht Vollständigkeit.

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `playwright.config.ts` | `testDir: 'e2e'`, `testMatch: '**/*.e2e.ts'` (nicht `*.spec.ts`, damit Vitest sie nicht einsammelt); Projekte `desktop` (Desktop Chrome, 1440 × 900) und `smartphone` (Pixel 7 mit Touch, 390 × 844); `serviceWorkers: 'block'`, `locale: 'de-DE'`, Trace bei Fehlern; Webserver `node e2e/serve.mjs` auf Port 4300; Basis-Pfad aus `E2E_BASE_PATH` (Standard `/`, CI `/IdleSwarm/`); mit `CI` ein Retry, `forbidOnly` und HTML-Report |
| `e2e/serve.mjs` | statischer Server ohne Abhängigkeit für `dist/idle-swarm/browser` unter `--base`; Pfade ohne Dateiendung → `index.html` (SPA-Fallback), `Cache-Control: no-store` |
| `e2e/tsconfig.json` | erbt `tsconfig.json` (Alias `@app/*`), nur zum Prüfen mit `npx tsc -p e2e/tsconfig.json`; ohne `@types/node` (`process` deklariert die Config selbst) |
| `e2e/support/game-states.ts` | `advancedGame(nowMs, awayMs = 0)`: fortgeschrittener Stand aus den echten Domänenfunktionen (aktiver Bot der Modell-Seite, 2 h, Seed `e2e-smoke`, je Worker einmal gerechnet; Auto-Weiterziehen aus, laufende Reise per `step` beendet; alle Freischaltungen, alle Hinweise gesehen; `time.now`/`lastSaved` neu gesetzt), liefert `save` (`encodeSave`) und `departTarget` (erstes Ziel mit `canDepart`); `seedSave(page, save)` legt den Stand per `addInitScript` vor dem ersten Laden unter `SAVE_KEY` ab (nur einmal je Tab, über `sessionStorage`) |
| `e2e/new-game.e2e.ts` | neues Spiel (frischer Kontext = leerer `localStorage`): Startteile sichtbar, Gesperrtes fehlt, Hinweis `collect` wegklicken, Drohne kaufen (15 Nahrung reichen), `/umgebung` leitet auf die Szene um |
| `e2e/modes.e2e.ts` | Zoom-Leiste Szene → Umgebung → Genom, Browser-Zurück, `shell.back`; Tasten W/G/Esc (nur `desktop`); Schublade Pheromone öffnen/schließen (Smartphone: Bottom-Sheet) |
| `e2e/move.e2e.ts` | Umgebung: (Smartphone: Sheet aufklappen) Zielliste öffnen, `departTarget` wählen, aufbrechen; `sonar.status.travel` im Titel, danach in der Szene Log-Eintrag und `hud.site.travel` |
| `e2e/settings.e2e.ts` | Zahlenformat „wissenschaftlich“ (Klick aufs Label, das Radio ist `sr-only`; geprüft am Restvorrat über 1 Mio., `hud.site.stock`), Export-Text vorhanden, kaputter Import → `settings.import.error` (nach `settings.import.confirm`) |
| `e2e/return.e2e.ts` | Stand mit `lastSaved` 1 h zurück → Rückkehr-Dialog, „Weiter“ schließt |

## Besonderheiten

- Specs importieren Domänencode über den Alias `@app/*` (Playwright liest die `paths` aus `tsconfig.json`); keine Spiellogik in `e2e/` nachbauen. Nur Spielstand-Felder setzen, die keine Regel berühren (Onboarding, Zeiten).
- Ändern sich Bot, Balance oder Generator, kann der erzeugte Stand anders ausfallen. Die Tests verlassen sich nur auf: Restvorrat über 1 Mio., mindestens ein erreichbares Ziel (sonst wirft `advancedGame`), alle Freischaltungen.
- Nur auf Test-IDs, Rollen und URLs warten (`expect(...)` mit Auto-Retry), keine festen Wartezeiten. Käufe loggen nichts; Log-Einträge entstehen über Aufbruch, Ankunft, Funde, Adaptionen.
- `npm run e2e` baut erst (`ng build`, Basis `/`), dann `playwright test`; lokal nutzt Playwright einen schon laufenden Server auf 4300 weiter. Einmalig `npx playwright install chromium`.
- CI (`.github/workflows/ci.yml`, Job `verify`): nach Build und SPA-Fallback `npx playwright install --with-deps chromium`, `npx playwright test` mit `E2E_BASE_PATH=/IdleSwarm/` gegen genau den Pages-Build; bei Fehlern `playwright-report/` und `test-results/` als Artefakt (`actions/upload-artifact@v7`, 7 Tage). Das Deployment hängt an `verify`.
- `ng lint` prüft nur `src/` (angular.json); `e2e/` und `playwright.config.ts` mit `npx eslint e2e playwright.config.ts` prüfen. Prettier prüft sie über `format:check`.
- Ausgaben `test-results/` und `playwright-report/` stehen in `.gitignore` und `.prettierignore`.
