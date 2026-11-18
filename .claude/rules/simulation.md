---
paths:
  - "src/app/balance/**"
  - "src/app/engine/**"
  - "src/app/swarm/**"
  - "src/app/site/**"
---

# Simulation: balance, engine, swarm, site

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `balance/domain/constants.ts` | `BalanceParams`, `DEFAULT_BALANCE`, `TICK_MS`; einzige Quelle für Konstanten (Game-Design §2.3) |
| `balance/domain/formulas.ts` | alle Formeln: Preise, Raten, Brut, Platz, Restzeiten, `isAffordable` |
| `swarm/domain/models/units.model.ts` | `UNIT_TYPES`, `UnitType`, `Units` |
| `swarm/domain/units-logic.ts`, `brood-logic.ts` | `canBuy`, `buyUnit`; Brut-Teil des Schritts (`applyBrood`) |
| `site/domain/models/site.model.ts`, `data/sites-era1.data.ts` | `Site`; Futterstellentypen mit stabilen IDs |
| `site/domain/site-logic.ts`, `collect-logic.ts` | `renewSite` (Provisorium bis M1.2); Sammel-Teil des Schritts (`applyCollect`) |
| `engine/domain/models/game-state.model.ts` | `GameState`, `STATE_VERSION`; setzt `Units` und `Site` zusammen |
| `engine/domain/game-state-logic.ts` | `createInitialState` |
| `engine/domain/commands-logic.ts` | `Command`-Union und `apply` |
| `engine/domain/step-logic.ts` | `step` (Sammeln vor Brut, Game-Design §4.3), `syncClock`, `GameEvent` |
| `engine/domain/random-logic.ts` | `drawRandom` auf dem `rngState` des Zustands |
| `engine/domain/runner-logic.ts`, `bot-logic.ts` | Headless-Runner `runSimulation`, Kennzahlen; Bot-Schnittstelle, Preis-Cache, `CommandPlan` |
| `engine/data-access/game-store/` | `GameStore` (Signal, `dispatch`, `tick`, `replace`), `createSeed`, `createNewGame` |
| `engine/data-access/game-loop/` | `GameLoop`: fester Takt, Nachholen bis `MAX_TICKS_PER_WAKE`, Render-Takt über `onRender` |
| `engine/data-access/game-core/` | `provideGameCore()` und `initGame` (Laden, Autosave, Takt) |

## Besonderheiten

- Eine neue Mechanik bekommt ihre Regeln in der Fachdomäne (`swarm`, `site`, später `sonar` …). `engine/domain` ruft sie nur in `apply` und `step` auf.
- `balance/domain` importiert aus den Fachdomänen nur Typen (`import type`); die Fachdomänen importieren die Formeln. So entsteht kein Laufzeitzyklus.
- Ein neues Kommando: Variante in `Command` ergänzen und in `apply` behandeln; `assertNever` meldet fehlende Fälle beim Kompilieren.
- Ein neues Feld im `GameState` ändert das Spielstand-Format: Migration in `persistence/domain/migrations/` (siehe Regeldatei `persistence`).
- Die Bots „Aktiv“ und „Idle“ liegen in `model/domain/bots/`, der Runner kennt nur die Schnittstelle aus `bot-logic.ts`.
- `GameStore`, `GameLoop` und `PersistenceService` sind `@Injectable()` ohne `providedIn`; in Tests über `providers: [GameStore, …]` bereitstellen. Uhr und `requestAnimationFrame` kommen über `CLOCK` und `ANIMATION_FRAME`.
- Der Determinismus-Test (`engine/domain/determinism.spec.ts`) und die Leistungstests im Runner-Spec (im Abdeckungslauf übersprungen) müssen grün bleiben.
