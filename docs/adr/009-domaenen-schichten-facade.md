# ADR-009: Domänen mit Schichten, Signal-Store mit Facades

**Status:** Angenommen
**Datum:** 2026-11-18
**Ersetzt:** die Schichtentabelle aus [ADR-001](001-angular-zoneless-core.md)

## Kontext

Bisher ist der Code nach technischen Schichten geordnet: `core/` (reines TypeScript), `game/` (Angular-Services), `ui/` und `model/` ([Konzept §3](../technisches-konzept.md#3-architektur)). Das reicht für M1.1, skaliert aber schlecht:

- Ab M1.2 kommen Futterstellen-Generator, Kampf, Weiterziehen, Sonar, Genom, Pheromone und Funde hinzu. `core/` würde zu einem großen Ordner ohne fachliche Grenzen.
- Ab AS3 arbeitet der Schwarm an mehreren Standorten, ab AS4 an Fronten. Fachliche Grenzen machen solche Erweiterungen überschaubar.
- Komponenten wie `BuyButton` injizieren heute den `GameStoreService` direkt und rechnen ihre Anzeige selbst aus. Präsentation und Zustandszugriff sind vermischt.

Als Vorbild dient die Architektur aus PortfoliGo (Domäne × Schicht, Facades, NgRx). Dort hält NgRx nur gedrosselte Projektionen einer Engine, die im Web Worker läuft.

## Entscheidung

- Code wird **nach Domäne, dann nach Schicht** gruppiert: `src/app/<domain>/<feature|ui|data-access|domain|util>/…`. Die Abhängigkeitsregeln je Schicht stehen in [`CLAUDE.md` §1](../../CLAUDE.md#1-architektur-domänen-und-schichten); ESLint erzwingt sie.
- `domain` und `util` bleiben Angular-frei und deterministisch (Kern von ADR-001 und ADR-003).
- **Fachdomänen plus Engine:** Jede Fachdomäne (`swarm`, `site`, später `sonar`, `genome`, `finds` …) definiert ihren Teil des Zustands und ihre Regeln. `engine/domain` setzt `GameState`, `apply` und `step` daraus zusammen. `balance/domain` bleibt die einzige Quelle für Formeln und Konstanten (ADR-007).
- **State bleibt ein Signal-Store** (`GameStore` in `engine/data-access`). Es gibt **kein NgRx**.
- **Signals statt RxJS:** Eigene Logik und eigener Zustand verwenden nur Signals. RxJS kommt nur an Angular-Schnittstellen vor, die Observables liefern, und wird dort per `toSignal()` umgewandelt. In `domain` und `util` ist RxJS ganz verboten.
- **Facades** sind der einzige Zugang für Komponenten. Sie stellen Viewmodels als `computed` bereit und bieten Befehle an, die Kommandos absetzen.
- `ui`-Komponenten sind rein präsentational (Inputs/Outputs).

### Umsetzungsstand

**Umgesetzt** in [AP 1.1.10](../projektplan.md#m11--kernschleife--modell):

- Domänen `shared`, `balance`, `engine`, `swarm`, `site`, `persistence`, `hud` und `model` unter [`src/app/`](../../src/app/). Die Typen `Units` und `Site` liegen in `swarm/domain` bzw. `site/domain`, `engine/domain` setzt daraus `GameState` zusammen.
- [`GameStore`](../../src/app/engine/data-access/game-store/game-store.service.ts), [`GameLoop`](../../src/app/engine/data-access/game-loop/game-loop.service.ts) und [`PersistenceService`](../../src/app/persistence/data-access/persistence/persistence.service.ts) stellt [`provideGameCore()`](../../src/app/engine/data-access/game-core/game-core.providers.ts) einmal bereit. Uhr und `requestAnimationFrame` liegen hinter den Tokens `CLOCK` und `ANIMATION_FRAME` ([`shared/data-access`](../../src/app/shared/data-access/platform/platform.tokens.ts)).
- [`HudFacade`](../../src/app/hud/feature/state/hud.facade.ts) mit dem reinen Viewmodel `toHudView`; `BuyButtonComponent`, `FeedingSiteComponent` und `HudMeterComponent` sind präsentational.
- [`ModelFacade`](../../src/app/model/feature/state/model.facade.ts) mit `SimService`, Basislauf, Zoom und entprelltem Auto-Lauf; der Worker endet mit der Seite.
- [`eslint.config.js`](../../eslint.config.js): Schichtregeln je Domäne, Fremd-Domänen nur über `@app/…`, Determinismus in `domain`/`util`, `import-x/order` und Klassensuffixe `Page`/`Component`.

**Umgesetzt** in M1.2 (AP 1.2.1–1.2.7):

- Neue Domäne `sonar` mit der lazy Route `/umgebung` ([`SonarFacade`](../../src/app/sonar/feature/state/sonar.facade.ts), reines Viewmodel `toSonarView`, präsentationale Zielliste, Detailpanel und Einstellungsformular). Die Regeln für Generator, Kampf, Weiterziehen und Strategien liegen in `site/domain`, Transport und Opfern in `swarm/domain`; `engine/domain` setzt sie in `applyCommand` und `step` zusammen.
- `site/ui` ([`site-type-labels`](../../src/app/site/ui/site-type-labels/site-type-labels.ts)): Namen der Futterstellentypen, die HUD, Log und Umgebung gemeinsam nutzen.
- `domain`-Schicht in Oberflächen-Domänen nur für reine Eingabeprüfung: [`hud/domain/sacrifice-count-logic.ts`](../../src/app/hud/domain/sacrifice-count-logic.ts) und [`sonar/domain/auto-threshold-logic.ts`](../../src/app/sonar/domain/auto-threshold-logic.ts); die Formular-Schemas in `ui` nutzen sie.

**Umgesetzt** in M1.3 (AP 1.3.1–1.3.7):

- Neue Fachdomänen `genome` (Knoten, einzigartige Adaptionen, `evolve`; lazy Route `/genom` mit [`GenomeFacade`](../../src/app/genome/feature/state/genome.facade.ts) und reinem Viewmodel `toGenomeView`) und `finds` (Fundtabelle, Ziehung, Buffs, Sammlung, Badges; nur `domain` und `ui`). Pheromone liegen in `swarm/domain`, das Effekt-System in `balance/domain`; `engine/domain` setzt die Effekte aller Quellen in [`modifiers-logic.ts`](../../src/app/engine/domain/modifiers-logic.ts) zusammen.
- `finds/domain` nutzt `genome/domain` zur Laufzeit, `genome/domain` nutzt `finds/domain` nur über Typen; so entsteht kein Laufzeitzyklus zwischen den beiden Fachdomänen.
- Das HUD zeigt Pheromone und Funde über präsentationale Panels; die `HudFacade` bekommt dafür nur Kommandos (`setPheromones`, `strengthenGland`).

## Konsequenzen

- Fachliche Grenzen sind im Ordnerbaum sichtbar; neue Mechaniken bekommen eine eigene Domäne statt eines weiteren Ordners in `core/`.
- Präsentationskomponenten lassen sich ohne Spielzustand testen und auf der Modell-Seite oder in späteren Ären wiederverwenden.
- Viewmodels sind reine Funktionen und damit ohne Angular testbar.
- Negativ: mehr Dateien und Ordner je Feature (Facade, Providers, Viewmodel).
- Negativ: Querimporte zwischen Fachdomänen in `domain` sind unvermeidbar (z. B. Kampf braucht Einheiten und Futterstelle). Sie laufen über den Alias und bleiben dadurch sichtbar; Zyklen werden aufgelöst, indem gemeinsame Teile nach `engine/domain` oder `balance/domain` wandern.
- Negativ: Der Umbau kostet einmalig 2–3 PT.

## Verworfene Alternativen

- **NgRx wie in PortfoliGo:** Der Spielzustand ändert sich 10× pro Sekunde (ADR-003). Ohne Engine im Worker würde jeder Tick eine Action auslösen, alle Selektoren neu berechnen und die DevTools fluten. Ohne Backend gibt es kaum asynchrone Abläufe, für die Effects ihren Nutzen hätten. NgRx brächte viel Boilerplate ohne Gewinn.
- **NgRx nur für App-Zustand (Einstellungen, Navigation):** zwei State-Konzepte nebeneinander für sehr wenig Zustand.
- **Engine im Web Worker wie PortfoliGo:** erst sinnvoll, wenn die Simulation den Haupt-Thread messbar belastet (Risiko ab AS3, Projektplan §5). Die Angular-freie `domain`-Schicht hält diesen Weg offen.
- **Grobe Domänen** (alle Regeln in `game/domain`): weniger Querimporte, aber `game/domain` wüchse wie heute `core/`.
- **Schichten beibehalten:** behebt die Vermischung in den Komponenten nicht und skaliert schlecht über die Ären.
