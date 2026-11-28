# CLAUDE.md

## Git

- Niemals ohne ausdrückliche Anweisung des Nutzers stagen (`git add`, `git stage` o. Ä.) oder committen – auch nicht nach Abschluss einer Aufgabe.
- Änderungen bleiben im Working Tree; nach Änderungen nur berichten, was geändert wurde.
- Eine Erlaubnis zum Stagen/Committen gilt nur für den jeweiligen Auftrag, nicht dauerhaft.
- **Branches:** gearbeitet wird auf Feature-Branches mit Pull Request nach `development` (nur Prüfung); `development` ist der Teststand auf GitHub Pages, `main` der Produktivstand auf dem Server (Merge aus `development`). Pushen und Mergen nur auf Ansage.
- **Version:** Ein normaler Commit ändert die Version nicht. Die Version in `package.json` ändert sich nur auf Ansage des Nutzers (`npm version <patch|minor|major> --no-git-tag-version`, ändert `package.json` und `package-lock.json`). Keine git-Tags.

## Projektkontext

Leere Angular-App (kein Backend, deutsche Oberfläche) und ein Prototyp des Spiels (`public/prototype/index.html`). Architektur-Entscheidungen entstehen bei Bedarf unter `docs/adr/`.

- **Der Code ist der aktuelle Stand.** Es gibt keine Produktspezifikation. Während des Umbaus dokumentiert der Prototyp den Status quo: Regeln, Spielwerte und Darstellung stehen dort, nicht in einem separaten Dokument.
- **Der Prototyp ist eingefroren.** Seit Beginn des Umbaus wird er nicht mehr geändert. Er bleibt die Referenz für Regeln, Spielwerte und Darstellung, bis AP 13 ihn entfernt. Der Umbauplan mit Status steht in `docs/plan-angular-umbau.md`.
- Nächste Schritte werden im Gespräch mit Claude geplant. Nachfragen, bevor auf einem Punkt aufgebaut wird, der noch nicht entschieden ist.
- Jede neue Laufzeitabhängigkeit braucht eine ADR.
- Widersprechen sich diese Datei und der umgebende Code, nachfragen statt raten. Beim Bearbeiten bleibt eine Datei in sich einheitlich; nichts Unbeteiligtes umbauen. Vorhandene Dienste, Tokens, Pipes und Helfer wiederverwenden, bevor neue entstehen.

## Lint-Regeln

Die Code-Konventionen erzwingt ESLint (`eslint.config.js`, eigene Regeln in `tools/eslint-rules/`): Schichten und Domänenrichtung, Importe, Signal-APIs, `inject()` und erlaubte Tokens je Schicht, Metadaten- und Member-Reihenfolge, Datei- und Klassennamen, Modifier, kein `enum`, i18n-IDs, Tailwind-Klassen, Test-IDs, Methodenaufrufe in Templates, Effects, Guards, Worker-Importe, Plattformzugriffe, Formatierung über `shared/util` u. a. Dazu prüft `npm run check` (`tools/checks/`) exakte Versionen in `package.json` und das Komponenten-CSS. **Was ESLint meldet, ist Regel; die Meldung erklärt sie.** Passt eine Regel nicht, nachfragen. Eine neue Konvention wird möglichst als Lint-Regel umgesetzt, nicht als Text.

- Inline-Konfiguration wirkt nicht (`noInlineConfig`): `eslint-disable`-Kommentare bleiben wirkungslos und lassen den Lint scheitern (`maxWarnings: 0` in `angular.json`), `@ts-ignore`, `@ts-expect-error` und `@ts-nocheck` sind verboten. Eine echte Ausnahme ist ein sichtbarer Block in `eslint.config.js`.
- Der Projekt-Hook `.claude/hooks/protect-lint-config.sh` (`.claude/settings.json`) verlangt die Zustimmung des Nutzers, bevor Claude `eslint.config.js`, `tools/eslint-rules/`, `tools/checks/`, `angular.json`, `package.json`, die CI-Workflows oder den Hook selbst ändert. Bash-Befehle erkennt er per Muster, nicht lückenlos.

## Regeldateien

Was nicht als Lint-Regel geht, steht je Bereich in pfadbezogenen Regeldateien `.claude/rules/<bereich>.md` (Frontmatter `paths`). Claude Code lädt eine Regeldatei automatisch, sobald eine passende Datei gelesen oder bearbeitet wird.

- Vor der Planung einer Änderung die Regeldateien der betroffenen Bereiche lesen.
- Nach der Änderung die Neuerungen dort einarbeiten.
- Ein neuer Bereich bekommt eine eigene Regeldatei und eine Zeile in dieser Tabelle.

| Bereich (Regeldatei) | Pfade | Inhalt |
| --- | --- | --- |
| `shared` (`.claude/rules/shared.md`) | `src/app/shared/**` | Formatierung de-DE (`util/format.ts`) und ihre Pipes, Tokens in `src/styles.css`, generische UI-Elemente (`ui`) |
| `game` (`.claude/rules/game.md`) | `src/app/game/**` | Domänenmodell, Spielstand v1, `GameConfig`, Zufall und `newGame`, Regeln und Zeitschritt, Golden Master (`domain`), Store, Schleife, Spielstand, Nachberechnung (`data-access`), Routen, Facade, Viewmodel und Seiten (`feature`), Präsentationskomponenten, Asset-Bibliothek (`ui/art`, `scene`, `map`, `neuron`: Palette, Zeichenfunktionen, SVG-Komponenten, Canvas-Renderer) und Texte der Spieldaten (`ui`) |
| `dev` (`.claude/rules/dev.md`) | `src/app/dev/**`, `src/app/dev-routes*.ts` | Dateiersetzung der Dev-Routen, Katalog (Routen, Einträge, Suche, Regler, Vorschauen, Katalog-E2E) |
| `components` (`.claude/rules/components.md`) | `*.component.*`, `*.page.*`, `*.directive.ts`, `*.pipe.ts` | Smart und präsentational, Namen von Outputs und Handlern, Templates (`@let`, `track`, Pipes, `data-testid`), Texte und i18n |
| `forms` (`.claude/rules/forms.md`) | `form-*/**`, `dialog-*/**` | Signal Forms: Modell, Schema, Bindung, Absenden, Fehler |
| `dialogs` (`.claude/rules/dialogs.md`) | `dialog-*/**` | Ablage, typisiertes Öffnen, natives `<dialog>` |
| `state` (`.claude/rules/state.md`) | `*/feature/state/**`, `*/data-access/**`, `*.worker.ts` | Facade und Viewmodel, Effects, Providers, Services, Plattform-Tokens, Worker-Protokolle |
| `styling` (`.claude/rules/styling.md`) | `*.html`, `*.css` | Tailwind mit Tokens, Illustrationsfarben, ARIA-Varianten, Host-Styling, Komponenten-CSS |
| `routing` (`.claude/rules/routing.md`) | `*.routes.ts`, `*.guards.ts`, `*.providers.ts`, `main.ts`, `app.*` | lazy Routen, Guard-Fabriken, Bootstrap |
| `testing` (`.claude/rules/testing.md`) | `*.spec.ts`, `e2e/**`, `tools/**/*.spec.*` | Testumfang, Vitest, E2E, Tests der eigenen Lint-Regeln und Prüfskripte |

## Architektur

Code wird zuerst nach Domäne, dann nach Schicht gruppiert: `src/app/<domain>/<layer>/…`. Die App-Wurzel startet und verdrahtet nur. ESLint erzwingt die Abhängigkeiten.

| Schicht | Enthält | darf abhängen von |
| --- | --- | --- |
| `feature` | Routen, Seiten, Smart Components, `state/` (Facade, Providers, Guards, Viewmodel-Typen) | feature, ui, data-access, domain, util |
| `ui` | Präsentationskomponenten, Pipes, Formular-Komponenten, reine Zeichenfunktionen (`*.utils.ts`) | ui, domain, util |
| `data-access` | Stores, Persistenz, Worker-Clients, Plattform-Tokens | data-access, domain, util |
| `domain` | Modelle, Fachdaten, reine Regeln und Formeln (Angular-frei) | domain, util |
| `util` | generische Helfer ohne Fachwissen (Angular-frei) | util |

| Domäne | Inhalt |
| --- | --- |
| `game` | Das ganze Spiel: Regeln, Spielwerte und Zeitschritt (`domain`, eine `*-logic.ts` je Thema), Zustand, Spielschleife und Spielstand (`data-access`), Facade und Spielseite mit den Ansichten Umgebung, Schwarm und Ausbau (`feature`, `ui` in Unterordnern, z. B. `scene`, `map`, `neuron`, `hud`, `chain`) |
| `dev` | Nur im Dev-Build: Katalog, Kalibrierwerkzeuge, Schaltfläche fürs Testtempo; entfällt im Produktiv-Build per Dateiersetzung |
| `shared` | Domänenübergreifendes ohne Fachwissen: Formatierung de-DE (`util`), Pipes und generische UI-Elemente (`ui`) |

- Abhängigkeitsrichtung `dev → game → shared`. Jede Fachdomäne definiert ihren Teil des Zustands und ihre Regeln selbst.
- Fachlogik ist reines TypeScript in `domain`. Die Logik kennt keine Texte, nur IDs und Codes; Texte für Nutzer gibt es nur in Angular (`$localize`, Quellsprache Deutsch).
- Ablage: Modelle in `models/<name>.model.ts`, Fachdaten in `data/<name>.data.ts`, Regeln in `<name>-logic.ts`; Services unter `data-access/<name>/` mit `<name>.service.ts`, `<name>-service.providers.ts`, `<name>-service.tokens.ts`, `<name>-service.model.ts`; in `ui` ein Ordner je Komponente, Pipes unter `pipes/<name>/<name>.pipe.ts`; in `feature` `<domain>.routes.ts` und `state/<domain>.{facade,providers,guards,model,utils}.ts`.
- Kein NgRx, kein CDK, keine UI-Frameworks; keine eigenen Kommentare außer für Ausnahmen mit Verweis auf Issue oder ADR. Bezeichner sind Englisch, Kommentare Deutsch.

## Repo-Fakten

- Prettier mit `printWidth` 100 formatiert, nicht die Hand; `docs/`, `CLAUDE.md` und `.claude/` werden nicht formatiert. Importe sortiert `npm run lint -- --fix`.
- Pfad-Alias `@app/*` → `src/app/*`.
- `tools/` enthält Node-Skripte außerhalb der App (`tools/golden-master/generate.mjs`, eigene Lint-Regeln `tools/eslint-rules/`, Prüfskripte `tools/checks/`). Prettier formatiert sie, ESLint prüft nur `src/` und `e2e/`.
- **Exakte Versionen** in `package.json` (prüft `npm run check`); die `.npmrc` setzt `save-exact=true`. Updates sind bewusste Versionssprünge.
- CI (`.github/workflows/ci.yml`) prüft Lint, `npm run check`, Tests der Werkzeuge (`test:tools`), Format, Unit-Tests mit Abdeckung, Build und E2E bei Pull Requests und Pushes auf `main`/`development`; ein Push auf `development` deployt auf GitHub Pages, ein Push auf `main` per SFTP auf den eigenen Server (beide Base-Href `/IdleSwarm/`, Apache-Konfiguration in `deploy/apache/.htaccess`).
- Die Build-Konfiguration richtet sich nach dem Ziel: `production` (ohne Dev-Domäne) bei Push und manuellem Lauf auf `main` und bei Pull Requests nach `main`, sonst `pages` (Produktions-Build mit Dev-Domäne, `npm run build:pages`, Serve-Konfiguration `pages`). E2E läuft gegen genau diesen Build.

## Änderungen prüfen

| Aufgabe | Befehl |
| --- | --- |
| Node wählen | `nvm use` (`.nvmrc`) |
| Dev-Server | `npm start` |
| Unit-Tests | `npm test` |
| Unit-Tests mit Abdeckung (wie CI) | `npm run test:coverage` |
| Ein Spec | `npx ng test --watch=false --include src/app/<pfad>/<name>.spec.ts` |
| Lint (und Fix) | `npm run lint` (`npm run lint -- --fix`) |
| Versionen und Komponenten-CSS | `npm run check` |
| Tests der eigenen Lint-Regeln und Prüfskripte | `npm run test:tools` |
| Format | `npm run format:check`, `npx prettier --write <dateien>` |
| Build (prüft Typen und Budgets) | `npm run build` |
| Build mit Dev-Domäne wie GitHub Pages | `npm run build:pages` |
| E2E (baut, dann Playwright; einmalig `npx playwright install chromium`) | `npm run e2e` |
| E2E mit Katalog (nur gegen den Pages-Build) | `npm run build:pages && E2E_BUILD_CONFIGURATION=pages npx playwright test` |

Vor dem Abschluss einer Aufgabe sind Lint, Format, Tests, Build und E2E grün (CI-Gate).
