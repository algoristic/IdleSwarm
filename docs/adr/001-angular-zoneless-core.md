# ADR-001: Angular (zoneless, Signals) mit Angular-freiem `core/`

**Status:** Angenommen, Schichtentabelle ersetzt durch [ADR-009](009-domaenen-schichten-facade.md)
**Datum:** 2026-11-18

## Kontext

IdleSwarm ist ein Einzelspieler-Idle-Spiel im Browser, dessen Zustand sich ständig ändert und dessen Szene mit 60 fps rendern soll ([Konzept §1](../technisches-konzept.md#1-rahmenbedingungen), [§2](../technisches-konzept.md#2-technologie-stack)). Die Spiellogik muss außerdem ohne Oberfläche laufen: in Tests, im Offline-Catch-up und auf der Modell-Seite.

Angular ist dem Entwickler vertraut. Der Code bleibt für ihn dadurch gut nachvollziehbar.

## Entscheidung

- Framework ist **Angular** mit standalone Components, **zoneless** und **Signals**.
- Die gesamte Spiellogik liegt in `core/`, reinem TypeScript ohne Angular-Abhängigkeit.
- Abhängigkeiten zeigen nur nach unten ([Konzept §3.1](../technisches-konzept.md#31-schichten)). [`eslint.config.js`](../../eslint.config.js) erzwingt das mit `no-restricted-imports`.

> **Ersetzt durch [ADR-009](009-domaenen-schichten-facade.md):** Die folgende Schichtentabelle gilt nur noch bis zum Umbau in AP 1.1.10. Danach ist der Code nach Domäne und Schicht geordnet; die Angular-freie Logik liegt in den `domain`- und `util`-Schichten. Angular, zoneless, Signals und die Angular-freie Spiellogik bleiben gültig.


| Schicht | Darf nicht importieren |
|---|---|
| `core/` | `game/`, `ui/`, `model/`, `@angular/*`, `rxjs` |
| `game/` | `ui/`, `model/` |
| `ui/` | `model/` |
| `model/` | `ui/` |

### Umsetzungsstand

**Umgesetzt:**

- Angular 22 ([`package.json`](../../package.json)), Node 24.15.0 ([`.nvmrc`](../../.nvmrc)).
- Standalone: [`App`](../../src/app/app.ts) bindet seine Abhängigkeiten über `imports` ein, es gibt kein `NgModule`.
- Zoneless: `zone.js` ist weder Abhängigkeit noch Polyfill.
- Signals: [`GameStoreService`](../../src/app/game/game-store.service.ts) hält den Zustand in einem Signal, das [HUD](../../src/app/ui/hud/hud-page.ts) leitet seine Anzeige über `computed()` ab.
- Die Schichtenregel ist aktiv, `core/` enthält nur reines TypeScript.

## Konsequenzen

- `core/` ist ohne Angular testbar, auf der Modell-Seite wiederverwendbar und bei Bedarf portierbar.
- Signals erlauben feingranulare HUD-Updates ohne manuelles DOM-Management.
- Lazy Routes halten die Modell-Seite aus dem Spiel-Bundle heraus.
- Negativ: Das Bundle ist rund 100 KB gzip größer als z. B. mit Preact. Das Konzept bewertet das als unkritisch, weil das Spiel einmal geladen wird und dann gecacht ist.
- Negativ: Mehr Boilerplate pro Komponente. Das ist akzeptabel, weil die Spiellogik ohnehin in reinem TS liegt.
- Negativ: Der Canvas-Loop darf keine Change Detection auslösen. Das setzt zoneless und Rendering außerhalb des Template-Systems voraus.
- Negativ: Die ESLint-Regel arbeitet mit Pfadmustern. Ein relativer Import über `..` mit einem gesperrten Pfadteil (`game`, `ui`, `model`) gilt als Verstoß, auch wenn er auf einen gleichnamigen Ordner oder eine Datei in der eigenen Schicht zeigt.

## Verworfene Alternativen

- **Leichteres Framework wie Preact:** kleineres Bundle, aber nicht vertraut. Der Größenvorteil ist für dieses Spiel unkritisch.
- **Change Detection mit Zone.js:** verursacht Last durch den 60-fps-Renderloop, die zoneless vermeidet.
- **Spiellogik in Angular-Services:** wäre nicht ohne Angular testbar und nicht direkt auf der Modell-Seite wiederverwendbar.
