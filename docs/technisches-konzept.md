# IdleSwarm · Technisches Konzept

> Stand: 19.11.2026 · Gehört zu: [Projektplan](projektplan.md), [Produktplanung](produktplanung.md) · UI-Referenz: [Mockup K2-K · Kurzgesagt-Stil](mockups/k2-kurzgesagt.html)

## 1. Rahmenbedingungen

| Thema | Festlegung |
|---|---|
| Spielart | Einzelspieler-Idle-Spiel im Browser, kein Multiplayer |
| Backend | **keines**: Logik, Speicherung und Offline-Fortschritt laufen vollständig im Client |
| Plattformen | Desktop-Browser und Mobile (aktuelle Chrome-, Safari-, Firefox- und Edge-Versionen), Hoch- und Querformat |
| Hosting | statisch über GitHub Pages (`algoristic/IdleSwarm`) |
| Sprache | Deutsch; Texte über `@angular/localize` mit festen IDs, damit eine spätere Übersetzung möglich bleibt ([ADR-011](adr/011-i18n-localize.md)) |

## 2. Technologie-Stack

| Bereich | Wahl | Begründung |
|---|---|---|
| Framework | **Angular** (aktuelle Version, mind. 21), standalone Components, **zoneless**, **Signals** | Dem Entwickler vertraut, dadurch gut nachvollziehbar; Signals passen zu einem sich ständig ändernden Spielzustand; zoneless vermeidet Change-Detection-Last durch den 60-fps-Renderloop |
| Sprache | TypeScript, `strict` | Typsichere Spieldaten und Formeln |
| Große Zahlen | **`break_infinity.js`** (Decimal), gekapselt hinter eigenem Typ `Num` | Idle-Zahlen sprengen spätestens ab AS2 den Bereich von `number` (~1,8·10³⁰⁸); schnell, in Idle-Spielen verbreitet; der Wrapper erlaubt späteren Tausch |
| Rendering Szene | **Canvas 2D** | Wie im Mockup; ausreichend für einige hundert flach schattierte Sprites |
| Rendering Karte & Genom | **SVG** in Angular-Templates | Interaktive Knoten, Klickflächen und Styling über CSS; im Mockup erprobt |
| Übergänge | **CSS** (transform, clip-path, filter, opacity) | `@angular/animations` ist veraltet; die K2-Übergänge sind ohnehin CSS-Übergänge |
| Styling | **Tailwind CSS v4** mit semantischen `--sw-*`-Tokens; K2-Ebenen und Kamera in Komponenten-CSS ([ADR-010](adr/010-tailwind-tokens.md)) | Viele HUD-Teile, Schubladen und Breakpoints ab M1.4; Farben zentral, Ära-Paletten als Token-Werte |
| State | **Signal-Store** (`GameStore`) mit **Facades** je Feature, kein NgRx ([ADR-009](adr/009-domaenen-schichten-facade.md)) | 10-Hz-Tick, kein Backend; Facades trennen Präsentation und Zustandszugriff |
| Texte | **`@angular/localize`** mit festen IDs, Quellsprache Deutsch; Übersetzung später ([ADR-011](adr/011-i18n-localize.md)) | Logik liefert nur IDs und Codes; spätere Übersetzung ohne zweite Migration |
| Formulare | **Signal Forms** (`@angular/forms/signals`, [ADR-012](adr/012-signal-forms.md)) | Passt zu Signals; Validierung deklarativ im Schema |
| Diagramme (Modell-Seite) | **Apache ECharts**, über eine eigene dünne Wrapper-Komponente | Log-Achsen, Zoom, Markierungen, viele Datenpunkte; kein Versionszwang durch Drittanbieter-Wrapper |
| Unit-Tests | **Vitest** | Standard-Testrunner im aktuellen Angular-CLI, schnell, gut für reine TS-Logik |
| E2E-Tests | **Playwright** | Desktop- und Mobile-Viewports, Touch-Emulation |
| Code-Qualität | ESLint (angular-eslint, `eslint-plugin-import-x`), Prettier | Schichtregeln je Domäne, Determinismus in `domain`/`util`, Importreihenfolge |
| CI/CD | GitHub Actions → GitHub Pages | Lint, Test, Build bei jedem Push; Deploy von `main` |
| PWA | `@angular/pwa` (Service Worker, Manifest) | Installierbar und offline startbar (AP 1.5.6) |

Jede neue Laufzeitabhängigkeit braucht eine ADR. Versionen in `package.json` sind exakt angegeben, ohne `^` oder `~`.

### Angular: Vor- und Nachteile

| Pro | Contra (bewertet) |
|---|---|
| Vertrautes Framework, dadurch Code für den Entwickler nachvollziehbar | Größeres Bundle (~100 KB gzip mehr als z. B. Preact). **Unkritisch** für ein Spiel, das einmal geladen wird und dann gecacht ist |
| Klare Struktur (DI, Services, Routing), CLI, Tests und Build aus einer Hand | Mehr Boilerplate pro Komponente. **Akzeptabel**, die Spiellogik liegt ohnehin in reinem TS |
| Signals: feingranulare Updates des HUD ohne manuelles DOM-Management | Der Canvas-Loop darf keine Change Detection auslösen. **Gelöst** durch zoneless und Rendering außerhalb des Template-Systems |
| Lazy Routes: Modell-Seite belastet das Spiel-Bundle nicht | Animationsmodul veraltet. **Kein Problem**, K2 nutzt CSS-Übergänge |

Es gibt keinen Grund, der gegen Angular spricht. Entscheidend ist die Trennung: Die gesamte Spiellogik liegt in den `domain`-Schichten und kennt Angular nicht. Sie ist damit testbar, auf der Modell-Seite wiederverwendbar und bei Bedarf portierbar.

## 3. Architektur

> Architektur nach [ADR-009](adr/009-domaenen-schichten-facade.md), umgesetzt in AP 1.1.10. Die Regeln im Detail stehen in [`CLAUDE.md`](../CLAUDE.md), die Besonderheiten je Bereich in den Regeldateien unter `.claude/rules/`.

### 3.1 Domänen und Schichten

Code wird zuerst nach Domäne, dann nach Schicht gruppiert: `src/app/<domain>/<layer>/`.

```
┌──────────────────────────────────────────────────────────────┐
│ feature/      Seiten, Smart Components, Facades, Routen, Guards│
│ ui/           Präsentationskomponenten (Inputs/Outputs), Pipes │
├──────────────────────────────────────────────────────────────┤
│ data-access/  GameStore, GameLoop, Persistenz, Worker-Clients  │
├──────────────────────────────────────────────────────────────┤
│ domain/       reines TypeScript, KEINE Angular-Abhängigkeit:   │
│               Modelle, Spieldaten, Regeln, Formeln             │
│ util/         Num, RNG, Formatierung                           │
└──────────────────────────────────────────────────────────────┘
```

| Schicht | darf abhängen von |
|---|---|
| `feature` | feature, ui, data-access, domain, util |
| `ui` | ui, domain, util |
| `data-access` | data-access, domain, util |
| `domain` | domain, util |
| `util` | util |

**Regeln:** Abhängigkeiten zeigen nur nach unten. `domain` und `util` importieren weder `@angular/*` noch `rxjs` und sind deterministisch (kein `Math.random`, `Date`, `crypto`). Komponenten greifen nur über Facades auf den Zustand zu. ESLint (`no-restricted-imports`) erzwingt die Schichten.

### 3.2 Ordnerstruktur

```
src/app/
  shared/
    util/num/, format/, rng/    # Num, Formatierung (Zahlen, Dauer, Datum), seeded RNG
    ui/pipes/                   # formatNum, formatRate, formatDown, formatDuration …
    data-access/platform/       # CLOCK, ANIMATION_FRAME, VIEWPORT
    data-access/motion-preference/   # MotionPreferenceService: reduzierte Bewegung aus einer Quelle (data-motion)
  balance/
    domain/constants.ts, formulas.ts, targets.ts   # Konstanten, Formeln, Pacing-Zielbänder
    domain/models/effect.model.ts, effects-logic.ts # Effekt-System (Modifikatoren)
  engine/
    domain/models/game-state.model.ts   # Zusammensetzung aus den Fachdomänen
    domain/models/game-event.model.ts   # GameEvent, StepResult
    domain/game-state-logic.ts, commands-logic.ts, step-logic.ts, step-split-logic.ts, random-logic.ts
    domain/modifiers-logic.ts           # stateEffects, stateModifiers: Effekte aller Quellen
    domain/runner-logic.ts, cycle-metrics-logic.ts, bot-logic.ts, catch-up (geplant)
    data-access/game-store/, game-loop/, game-core/   # provideGameCore(), Ereignis-Log, Nachholen im Takt
  swarm/
    domain/models/units.model.ts, transport-priority.model.ts, pheromones.model.ts
    domain/units-logic.ts, brood-logic.ts, transport-logic.ts, sacrifice-logic.ts, pheromone-logic.ts
  site/
    domain/models/site.model.ts, map.model.ts, travel.model.ts, auto-move.model.ts, site-event.model.ts
    domain/data/sites-era1.data.ts, collect-logic.ts, generator-logic.ts, map-logic.ts
    domain/combat-logic.ts, move-logic.ts, strategy-logic.ts, auto-move-logic.ts
    ui/site-type-labels/        # Namen der Futterstellentypen für HUD, Log und Umgebung
  genome/                       # Genom Ära I und Genom-Modus /genom der K2-Shell
    domain/models/genome.model.ts, genome-event.model.ts, data/genome-era1.data.ts
    domain/genome-logic.ts, genome-tree-logic.ts   # Status, evolve, Vorschau; Geometrie des radialen Baums
    feature/genome-layer/, genome-overlay/, state/genome.facade.ts, state/genome.utils.ts   # Ebene (Baum) und Overlay
    ui/genome-tree/, genome-detail/, genome-legend/, genome-labels/, genome-descriptions/, models/
  finds/
    domain/models/finds.model.ts, finds-event.model.ts, collection.model.ts, data/finds-era1.data.ts
    domain/finds-logic.ts, collection-logic.ts     # Ziehung, Buffs, Abbau-Schwellen; Sets, Badges, Schublade
    ui/finds-labels/            # Namen der Funde, Sets und Badges
  persistence/
    domain/serialize-logic.ts, slots-logic.ts, migrations/
    data-access/persistence/    # PersistenceService, KEY_VALUE_STORE
  hud/                          # HUD der Szene (Overlay im Szenen-Modus), Ressourcen und Speicherstatus für alle Modi
    domain/sacrifice-count-logic.ts   # Eingabeprüfung „Drohnen opfern“
    feature/scene-hud/, resources-panel/, save-status/, state/hud.facade.ts, state/hud.utils.ts
    ui/buy-button/, feeding-site/, hud-meter/, event-log/, form-sacrifice-drones/, pheromone-panel/, finds-panel/
  sonar/                        # Kartenmodus /umgebung der K2-Shell: Sonar-Karte in der Ebene, Zielliste und Detailpanel im Overlay
    domain/auto-threshold-logic.ts    # Eingabeprüfung der Schwelle
    domain/sonar-map-logic.ts         # Geometrie der Sonar-Karte (Maßstab, Route, Reiselinie, Beschriftung, Trefferflächen)
    feature/sonar-layer/, sonar-overlay/, state/sonar.facade.ts, state/sonar.utils.ts
    ui/sonar-map/, sonar-title/, move-note/, target-list/, target-detail/, form-move-settings/, sonar-labels/, models/
  shell/                        # K2-Shell (lazy, Elternroute von /, /umgebung, /genom): Ebenen, Kamera, Eingabe
    domain/models/shell-mode.model.ts, shell-mode-logic.ts, shell-camera-logic.ts   # Modus ↔ Pfad, --ms, Kamera
    domain/shell-input-logic.ts, shell-pinch-logic.ts   # Mausrad, Tasten, Pinch (rein)
    feature/shell.routes.ts, shell/shell.page.ts, shell-input/, state/shell.facade.ts, state/shell.utils.ts
    ui/zoom-bar/
  scene/                        # Szene der Welt-Ebene (Canvas 2D)
    domain/scene-budget-logic.ts, scene-agent-logic.ts, scene-effects-logic.ts, scene-geometry-logic.ts
    feature/scene-world/, state/scene.facade.ts, state/scene.utils.ts, state/scene.tokens.ts
    ui/scene-canvas/            # SceneRenderer, vorgerenderte Sprites, Palette aus den Tokens
  model/                        # Modell-Seite (lazy)
    feature/model.routes.ts, model/model.page.ts, state/model.facade.ts, state/model.guards.ts
    ui/form-model-params/, form-stall-threshold/, model-charts/, model-metrics/, model-stalls/, model-pacing/, model-upgrades/, echart/, bot-labels/
    data-access/sim/            # SimService, sim.worker.ts, Protokoll
    domain/bots/, models/, params-logic.ts, model-params-logic.ts, reduce-result-logic.ts, stall-logic.ts,
    domain/progress-logic.ts, pacing-targets-logic.ts, upgrade-logic.ts, dna-flow-logic.ts …
  settings/                     # Einstellungen im Spielstand (seit M1.5)
    domain/models/settings.model.ts, settings-logic.ts
  onboarding/                   # Freischaltungen und Hinweise (seit M1.5)
    domain/models/onboarding.model.ts, onboarding-logic.ts
```

Jede Fachdomäne definiert ihren Teil des Zustands und ihre Regeln; `engine/domain` setzt `GameState`, `applyCommand`/`apply` und `step` daraus zusammen. Eine `domain`-Schicht in einer Oberflächen-Domäne (`hud/domain`, `sonar/domain`) enthält nur reine Eingabeprüfung ohne Spielregeln, damit Formular-Schemas in `ui` sie nutzen können; `sonar/domain` und `genome/domain` enthalten außerdem die reine Geometrie ihrer SVG-Ansicht. `genome` und `finds` sind Fachdomänen mit eigenem Teil des Zustands (`genome`, `finds`), seit M1.5 ebenso `settings` und `onboarding`. `finds/domain` nutzt `genome/domain` zur Laufzeit, umgekehrt nur über Typen, damit kein Laufzeitzyklus entsteht.

Seit M1.4 gibt es die Oberflächen-Domänen `shell` und `scene`, beide ohne eigenen Teil des Zustands. `shell/domain` enthält die reine Modus-, Kamera- und Eingabelogik, `scene/domain` das Bewegungsmodell der Szene als reine Funktionen der Zeit mit eigenem visuellem RNG. Die Shell-Route stellt die Facades von Shell, Szene, HUD, Sonar und Genom bereit; jede Ebene und jedes Overlay injiziert die Facade seiner Domäne, die `ShellPage` selbst nur `ShellFacade` und `HudFacade` (DNA und Zahl verfügbarer Adaptionen für die Zoom-Leiste). Die einzelnen Routen `/umgebung` und `/genom` und das Prototyp-HUD auf `/` sind in der Shell aufgegangen; nur `/modell` liegt außerhalb.

### 3.3 Datenfluss

```
Eingabe (Kauf, Zielwahl, Taste, Pinch)
   │
   ▼
Facade.buy(…) ──► GameStore.dispatch(cmd) ──► engine: applyCommand(state, cmd)─┐
                                                                               │
GameLoop (fester Takt) ──► GameStore.tick(dt) ──► engine: step(state, dt) ─────┤
                                                                               ▼
                                 GameStore.state = signal(State), GameStore.log (Ereignisse)
                                                                               │
                                     Facades: computed()-Viewmodels (Raten, Preise, Status)
                                                                               │
                                              ┌────────────────────────────────┴──────────┐
                                              ▼                                           ▼
                           HUD/Sonar/Genom (Templates, ui-Komponenten)   Szene (Canvas liest State im rAF)
```

- **Unveränderlicher Zustand:** `applyCommand` und `step` liefern neue Objekte (flache Kopien der geänderten Teile). Das passt zu Signals und macht Tests einfach.
- **Abgeleitete Werte** (Raten, Preise, Einnehmbarkeit, seit M1.3 auch alle Modifikatoren aus dem Effekt-System) werden nicht im State gespeichert. Sie entstehen über reine Funktionen in `balance/domain` und werden in den Facades als `computed()`-Viewmodels gekapselt. Komponenten lesen nur diese Viewmodels.
- **Ereignisse:** `applyCommand` und `step` liefern `StepResult` = `{ state, events }`. Die Ereignisse (`GameEvent`, seit M1.2 `departed`, `arrived`, `siteDepleted`, seit M1.3 `evolved` aus `genome` und `found` aus `finds`) sind Codes mit IDs, Rohwerten und der Spielzeit `playedMs`; die Texte setzt die Oberfläche. `apply` ist die Kurzform ohne Ereignisse. Funde hebt das HUD-Log hervor. Später lesen auch Effekte und die Rückkehr-Zusammenfassung sie (Einheit gefallen, Fund).
- **Ereignis-Log:** Der `GameStore` hängt die Ereignisse aus `dispatch` und `tick` an sein Signal `log` an, höchstens 50 Einträge (`LOG_MAX_ENTRIES`), älteste zuerst. Das Log liegt nur im Arbeitsspeicher und gehört nicht zum Spielstand. `load` (Laden, neues Spiel) leert es immer, `replace` (Speichern, Uhrabgleich) nie; die Log-IDs zählen über `load` hinweg weiter.

### 3.4 Zustandsmodell (Entwurf)

```ts
interface GameState {
  version: number;              // Save-Format-Version
  seed: string; rngState: number;
  time: { now: number; lastSaved: number; played: number };
  era: 'ursuppe';               // ab AS3 erweitert
  res: { food: Num; dna: Num };
  units: { queens: Num; drones: Num; soldiers: Num };
  pheromones: { total: number; drones: number; soldiers: number };
  site: { type: SiteTypeId; size: Num; stock: Num };   // aktuelle Futterstelle
  bought: { queens: Num; drones: Num; soldiers: Num };  // Kaufzähler, Grundlage der Preise
  map: { position: Position; candidates: SiteCandidate[]; route: RoutePoint[]; moves: number };
  travel: { target: SiteCandidate; remainingMs: number } | null;
  auto: { enabled: boolean; strategy: StrategyId; threshold: number };
  priority: TransportPriority;  // Mitnahme-Priorität beim Aufbruch
  genome: { owned: string[] };  // IDs der Adaptionen
  finds: { collected: Record<string, number>; badges: string[]; buffs: Buff[] };
  stats: Stats;                 // Summen für Zusammenfassung und Erfolge
  settings: Settings;
}
```

Save-Version 4 (seit AP 1.3.4) enthält `version`, `seed`, `rngState`, `time`, `era`, `res`, `units`, `site`, `bought`, `map`, `travel`, `auto` und `priority` ([Game-Design §5](game-design.md#5-spielstand-version-3)) sowie `pheromones`, `genome` und `finds` ([Game-Design §5.1](game-design.md#51-spielstand-version-4)). Umgesetzt weichen diese drei vom Entwurf oben ab:

```ts
pheromones: { drones: number; soldiers: number; glands: number };   // verteilte Punkte, gekaufte Drüsenpunkte
genome: { owned: GenomeNodeId[] };            // reguläre Knoten in der Reihenfolge der Spieldaten, ohne root
finds: {
  rngState: number;                           // eigener Fund-RNG, aus seed + '#finds'
  total: number;                              // Fundzähler
  collected: Partial<Record<CollectedId, number>>;   // Fragmente und Sammelobjekte
  buffs: { id: BuffId; expiresAtMs: number }[];      // Ablauf in Spielzeit
};
```

Save-Version 5 (seit M1.5, AP 1.5.2–1.5.4) ergänzt `settings` und `onboarding` ([Game-Design §5.2](game-design.md#52-spielstand-version-5)); `settings` ist damit umgesetzt:

```ts
settings: {
  numberFormat: 'short' | 'scientific' | 'engineering';   // NUMBER_FORMATS (settings/domain)
  motion: 'system' | 'full' | 'reduced';                   // MOTION_SETTINGS
  autosaveIntervalMs: number;                              // AUTOSAVE_INTERVALS_MS: 10 s, 30 s, 60 s, 5 min
};
onboarding: {
  unlocked: OnboardingUnlockId[];   // 'pheromones' | 'map' | 'finds' | 'genome', monoton
  seenHints: HintId[];              // 'collect' | 'pheromones' | 'map' | 'finds' | 'genome' | 'auto-move'
};
```

Die Freischaltungen setzt `updateUnlocks` (`onboarding/domain`) am Ende jedes `step` und nach jedem wirksamen Kommando; ohne Änderung bleibt die Referenz des Zustands gleich. Hinweise und Einstellungen ändern nur Kommandos (`updateSettings`, `markHintSeen`, `resetHints`).

Die Reichweite steht nicht im Zustand, sie wird abgeleitet; ebenso `P_ges`, Effekte und Modifikatoren, einzigartige Adaptionen und Badges (sie folgen aus `collected`). `badges` und `stats` sind weiter Entwurf und kommen mit den jeweiligen Mechaniken über Migrationen.

IDs in `data/` (Einheiten, Adaptionen, Futterstellentypen, Funde) sind **stabil**. Spielstände speichern nur IDs, keine Texte oder Werte.

**Ausblick auf mehrere Standorte:** `site` ist genau eine Futterstelle. Ab AS3 arbeitet der Schwarm an mehreren Standorten, ab AS4 an Gebieten und Fronten, ab AS5 über Systeme hinweg. Dafür wird `site` zu einer Liste und per Migration umgestellt. M1.2 bleibt bei einem Standort, schreibt seine Regeln aber möglichst so, dass sie je Standort arbeiten.

## 4. Simulation

| Aspekt | Lösung |
|---|---|
| Logik-Takt | fest **10 Hz** (`dt` = 100 ms), unabhängig von der Framerate; Akkumulator-Pattern im GameLoop |
| Rendering | `requestAnimationFrame`, liest nur den State; pausiert bei `document.hidden` |
| Eingaben | Kommandos wie Käufe werden sofort angewendet, nicht erst im nächsten Tick |
| Determinismus | Zufall nur über den seeded RNG im State (z. B. mulberry32). Gleicher Seed + gleiche Kommandos an gleicher Position zwischen den Ticks ⇒ gleiches Ergebnis. Grundlage für Tests, Modell-Seite und gegen Save-Scumming |
| Offline-Catch-up | Beim Laden wird `Δt = now − lastSaved` nachgeholt, höchstens `T_max` (`maxCatchUpHours`, Start 24 h, in `balance/domain`, über `params` überschreibbar); der Rest verfällt, die Uhr wird abgeglichen. Negatives `Δt` (Uhr zurückgestellt) holt nichts nach. **Umgesetzt (AP 1.5.1):** `catchUp(state, elapsedMs, source, params)` in `engine/domain/catch-up-logic.ts` rechnet in Schritten von 1 s (`CATCH_UP_STEP_MS`), geteilt an `nextSplitMs` (Ankunft, nächste Abbau-Schwelle, nächster Buff-Ablauf, vorhergesagter Auto-Auslöser); `step` teilt selbst exakt an Ankunft, Abbau-Schwellen und Buff-Ablauf. Eine Teilung an „Nahrung reicht für Brut“ ist nicht nötig: Der Übergang selbst erzeugt keinen messbaren Fehler (siehe [§10](#10-qualitätssicherung)). `catchUp` liefert Endzustand, alle Ereignisse und eine Zusammenfassung (`CatchUpSummary`: nachgeholte und verworfene Zeit, Nahrung als Zufluss, Brutkosten und Netto, DNA, geschlüpfte und verlorene Einheiten je Typ, Ankünfte, Aufbrüche, Funde). `PersistenceService` holt nach `GameStore.load` über `GameStore.catchUp` nach; die Ereignisse landen im Log (es bleibt außerhalb des Spielstands, nur im Arbeitsspeicher; PO-Entscheidung M1.5), die Zusammenfassung in `GameStore.lastCatchUp` (quittieren mit `acknowledgeCatchUp`). Ab `RETURN_SUMMARY_MIN_MS` (5 min) Abwesenheit soll die Oberfläche sie zeigen (`isReturnSummaryDue`). Ein zweites Nachholen vor dem Quittieren einer solchen Zusammenfassung wird mit ihr zusammengefasst (`mergeCatchUpSummaries`) |
| Hintergrund-Tab | Browser drosseln Timer, daher erkennt der GameLoop große Zeitsprünge. **Umgesetzt (AP 1.4.6):** Bis 60 s Rückstand je Aufwachen (`MAX_TICKS_PER_WAKE`) läuft der Takt Tick für Tick; größere Rückstände (verborgener Tab, eingefrorene Seite) holt er wie der Headless-Runner in Schritten von 1 s (`CATCH_UP_STEP_MS`) nach, geteilt an `nextSplitMs`, damit Ankunft, Abbau-Schwellen und Auto-Weiterziehen auf die Millisekunde fallen. Seit AP 1.5.1 läuft das über denselben Weg wie der Offline-Fortschritt (`GameStore.catchUp(…, 'background')` → `catchUp`), mit derselben Obergrenze `T_max`; den Rest verwirft der Takt und gleicht die Uhr ab |
| Performance-Budget | `step` < 2 ms auf einem Mittelklasse-Smartphone; Catch-up für 24 h < 1 s |

## 5. Mathematisches Modell & Modell-Seite

### 5.1 Grundsatz

Es gibt **eine einzige Quelle der Wahrheit** für Formeln: `balance/domain`. Spiel, Offline-Catch-up, Headless-Runner und Modell-Seite rufen dieselben Funktionen auf. Die Modell-Seite enthält keine Kopie der Spiellogik.

### 5.2 Modellgrößen (Entwurf für spätere Größen)

> Für M1.1 bis M1.3 ist die [Game-Design-Spezifikation](game-design.md) maßgeblich, auch für Platz, Kampf (Verluste-Formel `L = S · λ · (B / A)^κ`), DNA-Belohnung (`d_0 · B^δ`), Futterstellen-Generator, Transport, Opfern und seit M1.3 Effekt-System, Pheromone, Genom und Funde ([Game-Design §4.13–4.17](game-design.md#413-effekt-system)). Der Pheromon-Entwurf `g = 1 + 0,1 · P_gesamt` unten ist verworfen: Die Brutrate folgt den verteilten Punkten (`f = P_v / P_0`, [Game-Design §4.15](game-design.md#415-pheromone)). Statt `M_platz` und `M_angriff` gibt es die Effektziele `spacePerQueen` und `attackPerSoldier`. Die Tabelle bleibt als Entwurf für spätere Größen stehen; bei Abweichungen gilt die Spezifikation.

| Größe | Formel (Entwurf) |
|---|---|
| Nahrung/s durch Drohnen | `F_d = min(D · r_d · M_sammeln, Abbau-Grenze des Vorrats)` |
| Grundertrag | `F_g = g_0`, zählt mit `F_d` gegen die Abbau-Grenze des Vorrats |
| Brutrate (Eier/min) | `E = Q · e_q · g(P_gesamt) · M_brut`; `g` z. B. `1 + 0,1 · P_gesamt` |
| Verteilung der Brut | `E_d = E · P_d / P_gesamt`, `E_s = E · P_s / P_gesamt`; jede Brut kostet `c_d` bzw. `c_s` Nahrung |
| Kaufpreis (manuell) | `Preis(n) = c_basis · w^n` mit Wachstumsfaktor `w` je Einheit (z. B. 1,07–1,15) |
| Platz | `Platz = Q · p_q · M_platz`, Belegung `D · 1 + S · p_s` |
| Angriff | `A = S · a_s · M_angriff`; einnehmbar, wenn `A ≥ Abwehr` |
| Verluste | `V = S · v(Abwehr / A) · M_verlust` mit `v` fallend bei Überlegenheit |
| DNA-Belohnung | `DNA = d_0 · Abwehr^β` (β < 1) |
| Futterstellen | Größe, Abwehr und Belohnung skalieren mit der Anzahl bisheriger Weiterzüge `z`, z. B. `Größe ∝ s_0 · γ^z` |

`M_*` sind Modifikatoren aus Genom, Funden und Buffs. Sie werden im Effekt-System gesammelt (additive Summen werden zuerst gebildet, dann multipliziert). Umgesetzt seit AP 1.3.1 in `balance/domain/effects-logic.ts` (`combineEffects`) und `engine/domain/modifiers-logic.ts` (`stateModifiers`).

### 5.3 Headless-Runner und Bots

```ts
interface Bot {
  name: string;
  nextActionMs(afterMs: number): number;
  decide(state: GameState, view: BotView): readonly Command[];
}
runSimulation({ seed, bot, durationMs, sampleEveryMs, params?, stepMs?, startTimeMs? }): SimResult
// SimResult: Zeitreihen (Ressourcen, Einheiten, Raten), Ereignisse, Kennzahlen; nur JSON-Werte
```

- Der Runner läuft im **Web Worker**, damit die Modell-Seite flüssig bleibt; in Vitest läuft er direkt.
- `decide` läuft bei `t = 0` und danach zu den Zeiten aus `nextActionMs`. `stepMs` (Standard 1000 ms) begrenzt die Schrittweite; Bot-Aktionen und Abtastpunkte teilen die Schritte zusätzlich, Käufe liegen also exakt auf ihrer Zeit.
- Der Runner wendet Kommandos über `applyCommand` an und übernimmt die Ereignisse aus Kommandos und Schritten (`siteDepleted` → `siteEmpty`, `departed`, `arrived`). Daraus entstehen die Futterstellen der Kennzahlen: Seit AP 1.2.9 dauert eine Futterstelle von der Ankunft bis zum Aufbruch, die Reise dorthin zählt getrennt. Je Futterstelle erfasst der Runner außerdem Ertrag, Abwehr, Kampf, DNA und die Soldaten-Bilanz (vor dem Aufbruch, mitgekommen, bei Ankunft, Verluste, nach der Einnahme). Den Bestand direkt nach dem Kampf rechnet er mit einem eigenen Schritt genau bis zur Ankunft nach, weil der Runner-Schritt erst danach endet.
- Er teilt die Schritte zusätzlich an der Ankunft, an den Abbau-Schwellen der Funde, am Ablauf eines Buffs und am vorhergesagten Auslöser des Auto-Weiterziehens (`V = θ · G`, exakt, weil die Abbaurate im Schritt konstant ist). `step` selbst teilt einen Schritt an der Ankunft, an den Abbau-Schwellen und am Buff-Ablauf ([Game-Design §4.3](game-design.md#43-simulationsschritt), [§4.16](game-design.md#416-funde)).
- **Seit M1.3** meldet der Runner zusätzlich die `SimEvent`s `evolved` (Knoten, Kosten), `found` (Futterstelle, Eintrag, Art, ersetzter Eintrag, DNA, freigeschaltete Adaption, Badge) und `gland` (gekaufter Drüsenpunkt mit der Zahl `k` danach). Die Abtastpunkte (`SimSample`) enthalten DNA-Bestand, DNA aus Kampf, DNA aus Funden und die für das Genom ausgegebene DNA. `runSimulationWithState` liefert neben dem Ergebnis den Endzustand, aus dem die Modell-Seite die Upgrade-Tabelle rechnet.
- **Modifikatoren:** Schritt, Kommandos, Teilung, Bots und Viewmodels holen die Modifikatoren nur über `stateModifiers(state, params)`. Die Funktion merkt sich die letzte Rechnung und vergleicht dafür nur Referenzen (Genom, gefundene Fragmente und Sammelobjekte, `params`, Futterstellentyp, laufende Buffs); das ändert kein Ergebnis und hält den 24-h-Lauf im Zeitbudget.
- Bots sind nicht übertragbar: Der Worker erzeugt sie aus einer Beschreibung. Vor dem Senden verkleinert er das Ergebnis auf höchstens 2.000 Abtastpunkte und 500 Ereignisse je Art; die Gesamtzahl der Ereignisse bleibt erhalten. Die Futterstellen werden zusammengefasst (Anzahl, Mediane, Kämpfe, DNA) und für Diagramme und Stillstände als Liste mitgeschickt, ab 1.000 Futterstellen gleichmäßig ausgedünnt.
- Bots ab AP 1.1.9: **Aktiv** (entscheidet häufig und kauft das Beste), **Idle** (schaut alle 5 min vorbei und kauft alles Bezahlbare). Seit AP 1.2.7 schalten beide bei ihrer ersten Entscheidung das Auto-Weiterziehen ein (`CommandPlan.enableAutoMove`) und ziehen damit weiter. Seit AP 1.2.9 zusätzlich, beide im Takt von „Aktiv“ und mit Auto-Weiterziehen: **Drohnen-lastig** (kauft Königinnen und Drohnen wie „Aktiv“, keine Soldaten; Mitnahme „Drohnen zuerst“, Strategie „Geringster Widerstand“) und **Soldaten-lastig** (kauft die günstigere von Soldat und Königin, keine Drohnen; Mitnahme „Soldaten zuerst“, Strategie „Kampfgehärtet“). Ihre Einstellungen setzen sie bei der ersten Entscheidung (`CommandPlan.setTransportPriority`, `setStrategy`). **Ab M1.3** entwickeln alle vier das Genom (günstigster Knoten der bevorzugten Äste, sonst sparen), kaufen Drüsenpunkte und verteilen die Pheromone auf einen Zielanteil ([Game-Design §6.3](game-design.md#63-bots-ab-m13); `genome-bot-logic.ts`, `pheromone-bot-logic.ts` in `model/domain/bots/`).
- Die Pacing-Zielbänder ([Projektplan §3.5](projektplan.md#35-pacing-ziele-vorläufig)) gelten nur für **Aktiv** und **Idle**. **Drohnen-lastig** und **Soldaten-lastig** sind Analyse-Bots ohne Zielband. Die Wartezeit-Kennzahlen bleiben spielbezogen (weder Königin noch Drohne bezahlbar, [Game-Design §6](game-design.md#6-messwerte-v1)), auch für die Analyse-Bots. Als Kauf zählen dagegen seit M1.3 Einheit, Drüsenpunkt und Adaption (`PURCHASE_EVENT_TYPES` in `runner-logic.ts`; erster Kauf, Kauflücken, Strecke ohne Kauf, Käufe gesamt; entschieden mit M1.3, PO, [Game-Design §6.5](game-design.md#65-messung-m13)).
- `params` überschreibt Konstanten aus `balance/domain`. So testet die Modell-Seite Varianten, ohne Code zu ändern.

### 5.4 Kennzahlen

| Kennzahl | Bedeutung |
|---|---|
| Ressourcen, Einheiten und Raten über die Zeit | Wachstumsverlauf (log-Achse) |
| Wachstumsrate | Verdopplungszeit der Nahrungsrate; zeigt, ob Wachstum abflacht oder explodiert |
| **Zeit bis zur nächsten Entscheidung** | Zeit, bis wieder ein sinnvoller Kauf, eine Adaption oder ein Weiterzug möglich ist |
| Anteil Wartezeit | Anteil der Zeit, in der der Aktiv-Bot nichts tun kann |
| Dauer und Ertrag je Futterstelle | Rhythmus der kleinen Ascension |
| Soldaten-Bilanz | Soldaten vor/nach Einnahme, Verluste; erkennt Sackgassen |
| Stillstand | Strecken über einer Schwelle ohne Einnahme mit Kampf bzw. ohne Aufbruch |
| Amortisation je Upgrade | Kosten ÷ zusätzlicher Ertrag/s; seit AP 1.3.7 in der Upgrade-Tabelle, nur für Nahrungskosten (`model/domain/upgrade-logic.ts`) |
| Freischalt-Zeitpunkte | Wann wird welche Mechanik erstmals relevant; seit AP 1.3.7 erster Drüsenpunkt, erster Fund, erste Adaption, erster Weiterzug, erste Einnahme mit Kampf, Genom komplett und der größte Abstand neuer Optionen in der ersten Stunde (`model/domain/progress-logic.ts`, [Game-Design §6.5](game-design.md#65-messung-m13)) |
| DNA-Fluss | DNA aus Kampf und aus Funden gegen die Ausgaben für das Genom (seit AP 1.3.7) |

### 5.5 Aufbau der Modell-Seite

```
┌ Parameter ─────┐ ┌ Diagramme ──────────────────────────────────────┐
│ Seed           │ │ [Ressourcen] [Raten] [Entscheidungen] [Zyklen…] │
│ Dauer 1h…7d    │ │                                                 │
│ Bots ☑☑☐☐      │ │  ▁▂▃▅▇  log ▾  Zoom                             │
│ Konstanten …   │ │  Markierungen: ▲ Kauf ◆ leer ● Weitergezogen    │
│ [Basislauf] [▶]│ ├ Stillstände (Schwelle 60 min) · Zielbänder ─────┤
│ [JSON export]  │ │ je Bot: Kein Kampfziel · Kein Aufbruch          │
│                │ ├ Kennzahlen ─────────────────────────────────────┤
│                │ │ je Bot: Käufe, Wartezeit, Futterstellen, …      │
└────────────────┘ └─────────────────────────────────────────────────┘
```

- Erreichbar unter `/modell`. Im Produktiv-Build ist die Seite nur mit `?dev` erreichbar und nicht verlinkt.
- **Reiter in M1.1:** Ressourcen (Nahrung, Vorrat, Einheiten), Raten (Nahrung/s, Netto/s, Eier/min) und Entscheidungen (Zeit bis zum nächsten Kauf je Einheit und gesamt). Seit AP 1.2.9 je Futterstelle: „Dauer je Futterstelle“ (Reise und Aufenthalt gestapelt) und „Soldaten vor/nach Einnahme“, ohne Markierungen, mit eigenem Zoom über die Futterstellen (seit M1.2), der nicht an die Facade geht. Seit AP 1.3.7 der Reiter „DNA-Fluss“ (kumulierte Einnahmen aus Kampf und Funden gegen Ausgaben und noch verfügbare Ausgaben für das Genom) und die Markierungen ■ Adaption gekauft, ◇ Fund und ○ Drüsenpunkt.
- **Upgrade-Tabelle (seit AP 1.3.7):** je Bot alle Genom-Knoten, einzigartigen Adaptionen, der nächste Drüsenpunkt sowie Königin und Drohne mit Kosten, „vorher → nachher“, zusätzlicher Nahrung/s und Amortisation, bewertet am Endzustand des Laufs.
- **Kennzahlen je Bot:** erster Kauf, Kauflücken und längste Wartezeit der ersten 30 min, erste Futterstelle, Anzahl und Median der Futterstellen, Median der Reisezeit, Einnahmen mit Kampf, DNA gesamt (Kampf und Funde), längste Strecke ohne Kampfziel, längster Aufenthalt an einer Futterstelle, längste Strecke ohne Kauf, Verdopplungszeit, Anteil Wartezeit, Käufe gesamt (seit M1.3 mit Drüsenpunkten und Adaptionen) und Rechendauer; seit AP 1.3.7 die Progressions-Kennzahlen aus §5.4 (Freischalt-Zeitpunkte, Knoten nach 1 h und am Laufende, DNA aus Kampf und Funden, Funde je Art, einzigartige Adaptionen, Badges, Drüsenpunkte).
- **Stillstände (seit AP 1.2.9):** Warnungen je Bot für „Kein Kampfziel“ (keine Einnahme eines Ziels mit Abwehr > 0, also keine DNA) und „Kein Aufbruch“, beide mit derselben Schwelle (Standard 60 min). Die Schwelle ist ein Analyse-Parameter der Modell-Seite, keine Konstante in `BalanceParams`; eine Änderung wertet das vorhandene Ergebnis rein neu aus und startet keinen Lauf.
- **Bots:** Standardmäßig laufen „Aktiv“ und „Idle“; „Drohnen-lastig“ und „Soldaten-lastig“ werden zugeschaltet.
- **Vergleich:** Ein gespeicherter Basislauf und der aktuelle Lauf liegen übereinander.
- **Zielbänder (seit AP 1.3.7):** Die Pacing-Ziele aus dem [Projektplan](projektplan.md#35-pacing-ziele-vorläufig) liegen als Konfiguration in `balance/domain/targets.ts` und werden als Flächen angezeigt (Reiter „Entscheidungen“ für die ersten 30 min und „Dauer je Futterstelle“), nur für die Bots „Aktiv“ und „Idle“ (§5.3). Verletzungen landen in einer Warnliste je Bot mit Zeitraum bzw. Futterstelle (`model/domain/pacing-targets-logic.ts`). Lesart der Grenzen und Mess-Definitionen: [Game-Design §6.5](game-design.md#65-messung-m13).

### 5.6 Balancing als Test

Feste Bot-Läufe (Seed, Dauer) laufen in Vitest. Ihre Kennzahlen werden als Snapshot mit Toleranz verglichen. Ändert eine Anpassung das Pacing ungewollt, schlägt der Test fehl. Gewollte Änderungen aktualisieren den Snapshot bewusst.

## 6. Spieldaten

- **Data-driven** als typisierte TS-Dateien in der `domain`-Schicht der jeweiligen Fachdomäne (z. B. `swarm/domain/units.data.ts`). Es gibt keine externe Tabelle (anders als Swarm Simulator mit Google Sheets). Typprüfung und Refactoring bleiben so möglich.
- Beispiel:

```ts
export const GENOME_ERA1: GenomeNode[] = [
  { id: 'cilia-1', branch: 'collect', parent: 'root', cost: 0,
    effects: [{ target: 'collectRate', op: 'mul', value: 1.10 }] },
  { id: 'acid-vacuole', branch: 'combat', parent: 'root', cost: 20,
    effects: [{ target: 'attackPerSoldier', op: 'add', value: 0.6 }] },
  { id: 'sulfur-shell', branch: 'unique', parent: 'acid-vacuole',
    unlock: { find: 'sulfur-pearl', count: 5 }, effects: [/* … */] },
];
```

- **Umgesetzt (M1.3):** Anders als im Beispiel oben enthalten die Spieldaten keine Zahlen. Sie sind nur Struktur (IDs, Ast, Stufe, Vorgänger, Anker, Effektziel, Operation, Bedingung, Fundorte, Fundart, Zuordnungen), z. B. `GENOME_NODES` in `genome/domain/data/genome-era1.data.ts` und `FIND_ENTRIES` in `finds/domain/data/finds-era1.data.ts`. Jede Zahl ist ein eigener Schlüssel in `BalanceParams` je ID; die Zuordnung steht in `balance/domain/formulas.ts` (`SITE_TYPE_PARAMS`, `GENOME_NODE_PARAMS`, `UNIQUE_ADAPTATION_PARAMS`, `FIND_ENTRY_PARAMS`, `BADGE_PARAMS`). So sind alle Werte über `params` überschreibbar ([ADR-007](adr/007-modell-seite-echarts-balancing.md), [Game-Design §2.3](game-design.md#23-konstanten)).
- Spieldaten enthalten keine Texte. Texte entstehen in `feature` bzw. `ui` über `$localize` und sind über die stabile ID verknüpft ([ADR-011](adr/011-i18n-localize.md)).
- Die Positionen im radialen Genom (Winkel, Radius) gehören zu den UI-Daten in `genome/ui`, nicht in `genome/domain`; umgesetzt in `genome/ui/genome-tree/genome-tree.layout.ts`.

## 7. Persistenz

| Aspekt | Lösung |
|---|---|
| Speicherort | `localStorage`, Schlüssel `idleswarm.save`; zusätzlich ein Backup-Slot des vorletzten Stands und der Slot `idleswarm.save.unreadable`: Ein unlesbarer Primär-Stand wird beim nächsten Speichern dorthin verschoben statt überschrieben |
| Format | JSON → komprimiert (`lz-string`) → Base64; `Num` als String serialisiert |
| Autosave | alle 30 s (einstellbar), bei `visibilitychange` (hidden) und `pagehide` |
| Versionierung | Feld `version`; beim Laden läuft die Migrationskette aus der Registry `MIGRATIONS` in `migrations/migrations-logic.ts` (aktuell Version 5, mit den Migrationen 1→2, 2→3, 3→4 und 4→5; 1→2 bis 3→4 setzen den Spielstand bis auf Seed, RNG-Zustand und Zeiten auf die Startwerte, 3→4 leitet dazu den Fund-RNG aus dem Seed ab; 4→5 erhält den gesamten Stand und ergänzt Standard-Einstellungen und das schon erreichte Onboarding) |
| Robustheit | Validierung beim Laden. Bei einem Fehler wird der Backup-Slot geladen und der Spieler informiert |
| Export/Import | derselbe String zum Kopieren (`encodeSave`); Import validiert und migriert (`importSave` in `persistence/domain/serialize-logic.ts`: entfernt Leerraum, dann `decodeSave`, Fehler als `SaveError`-Code) |
| Später | Cloud-Sync optional (Querschnittsthema), ohne Änderung am Format |

## 8. Rendering & Umsetzung von K2

### 8.1 Ebenen und Kamera

Die Umsetzung folgt [`docs/mockups/k2-kurzgesagt.html`](mockups/k2-kurzgesagt.html) (`setMode`, `applyCamera`). Ebenen, Kamera und Bedienung sind dieselben wie in [K2](mockups/k2-zoom.html); K2-K legt die Grafik fest (§8.6).

| Ebene | Inhalt | Technik |
|---|---|---|
| `#sonar` (z = 1) | Umgebung / Weiterziehen | SVG, startet mit `scale(6)` und `opacity: 0` |
| `#world` (z = 2) | Schwarm-Szene | Canvas; im Kartenmodus per `scale` und `clip-path: circle()` zum Punkt verkleinert |
| `#genome` (z = 3) | Zellkern mit radialem Genom | SVG; im Genommodus wird die Welt vergrößert, `blur` und abgedunkelt |

- **Umsetzungsstand (AP 1.4.1, M1.4):** Ebenen, Kamera und Moduswechsel sind in der Domäne `shell` umgesetzt (`ShellPage`, Ebenen und Kamera nach der K2-Ausnahme in `shell.page.css`). Die Sonar-Ebene zeigt die SVG-Sonar-Karte (`SonarLayerComponent`, seit AP 1.2.8; Geometrie rein in `sonar/domain`), die Welt-Ebene die Canvas-Szene (`SceneWorldComponent`, §8.2), die Genom-Ebene den SVG-Baum (`GenomeLayerComponent`, seit AP 1.3.3, §8.6). Sonar- und Genom-Ebene setzen ihre Bühne auf `--ms` × `--ms`, damit Kartenzentrum und Zellkern in der Viewport-Mitte liegen. Die Zielliste bleibt im Overlay der Karte als tippbare, barrierearme Alternative zur Karte.
- **Modus = Route:** `/` ist die Szene (`scene`), `/umgebung` die Karte (`map`), `/genom` das Genom (`gen`). Die `ShellPage` ist die gemeinsame Elternroute; die Kindrouten haben keine Komponente, damit dieselbe Instanz bestehen bleibt und die CSS-Übergänge laufen. Die `ShellFacade` leitet den Modus per `toSignal` aus den Router-Ereignissen ab und wechselt ihn per Navigation (`setMode`, `zoom` in den Nachbarmodus). Browser-Verlauf, Lesezeichen und Links wie „Weiterziehen“ funktionieren damit ohne eigenen Zustand; der Modus ist UI-Zustand und gehört nicht in den `GameStore`. Die Shell setzt `data-mode` am Container, CSS übernimmt die Übergänge; Utilities reagieren über die Varianten `mode-map:`, `mode-scene:`, `mode-gen:`. `/modell` liegt außerhalb der Shell.
- **Kamera:** Die Werte stehen als UI-Konstanten in `shell/domain/shell-camera-logic.ts` (`worldCamera`, `worldCameraStyle`). Szene `scale(1)`; die Karte schrumpft die Welt auf die eigene Position der Sonar-Karte (Ausschnitt `clip-path: circle()` mit `MAP_CLIP_RADIUS`, skaliert auf `HERE_RADIUS` der Karte, Helligkeit 1,15); Genom `scale(2.8)`, `blur(7px)`, `brightness(0.4)`. `clip-path` hat in allen Modi die Form `circle(…)`, damit es überblendet. Dauern und Easing sind Tokens (`--sw-zoom-duration`, `--sw-zoom-fade-duration`, `--sw-ease-zoom`, `--sw-zoom-reduced-duration`).
- **`--ms`** (`stageSize`): Mockup-Formel `max(360, min(h · 0,86, w − 720))`, auf ganze Pixel abgerundet und nie breiter als der Viewport minus 2 · 16 px; unter 768 px eigene Formel (§8.4). Die Viewport-Größe liest die `ShellFacade` über das Token `VIEWPORT` (`shared/data-access/platform`).
- **Bedienelemente:** Zoom-Leiste links (`ZoomBarComponent`: Umgebung, Schwarm, Genom mit DNA und Badge bezahlbarer Adaptionen; aktiver Eintrag mit `aria-current="page"`), Knopf „← zurück zum Schwarm“ unten Mitte in Karte und Genom; ein Klick auf die verkleinerte Welt im Kartenmodus führt ebenfalls zur Szene. Ressourcen, Speicherstatus und Zoom-Leiste stehen in allen Modi in der linken Spalte.
- **Overlays je Modus:** Jeder Modus hat ein vollflächiges Overlay über den Ebenen (`SceneHudComponent`, `SonarOverlayComponent`, `GenomeOverlayComponent`), das seine Panels selbst platziert: Titel oben Mitte, Detailpanel rechts, in der Szene dazu Aktionsleiste, Schubladen, Log und Ära-Anzeige. Sichtbar ist nur das Overlay des aktiven Modus (`mode-*:opacity-100`). Nicht aktive Ebenen und Overlays tragen `inert` (kein Tab-Fokus, nicht für Screenreader); die Welt ist nur im Genom-Modus inert, weil sie in der Karte als Punkt anklickbar bleibt. Die Körnung liegt zwischen Ebenen und Overlays.

### 8.2 Szene (Canvas)

- **Umsetzungsstand (AP 1.4.2, 1.4.6):** Domäne `scene`: `SceneWorldComponent` mit Canvas 2D in der Welt-Ebene, `SceneRenderer` in `scene/ui`, das Bewegungsmodell als reine Funktionen der Zeit in `scene/domain`. Die Szene zeichnet Hintergrund, Lichtkegel, Hügel, Plankton, die Futterstelle (Wärmezonen, Klumpen nach Vorratsanteil kleiner und blasser, Blasen), Agenten (Drohnen pendeln und tragen auf dem Rückweg Nahrung, Soldaten patrouillieren, Königinnen kreisen) und Ertragsteilchen; unterwegs keine Futterstelle.
- **Agenten-Budget:** 300 Sprites, mobil 150 (`spriteBudget`). Mobil heißt Breite < 768 px **oder** `pointer: coarse`, damit auch Tablets mit schwacher GPU das kleinere Budget bekommen. Bei mehr Einheiten steht ein Sprite für `n` Einheiten, verteilt nach größten Resten, jeder vorhandene Typ mit mindestens einem Sprite. Ändert sich die Sprite-Zahl, werden Agenten nur ergänzt oder ausgeblendet, nicht neu gewürfelt.
- **Zufall:** Rein visueller Zufall läuft über einen eigenen seeded RNG der Szene (`SCENE_SEED`, `shared/util/rng`), nie über `rngState` des Spielstands. Die Szene ändert keinen Zustand.
- **DPR:** Die Canvas-Größe wird mit `devicePixelRatio` skaliert (gedeckelt auf 2). DPR und Zeigerart kommen über das Token `SCENE_DISPLAY`, die Viewport-Größe über `VIEWPORT`.
- **Sprites:** Einheiten sind flach schattierte Zellen aus mehreren Flächen (Körper, Glanzlicht, Kern; kein `shadowBlur`). Sprites je Typ werden in Geräte-Pixeln vorgerendert und nur per `drawImage` kopiert; bei Größen- oder DPR-Wechsel entstehen sie neu.
- **Hintergrund-Cache (AP 1.4.6):** Himmel, Lichtkegel und Hügel liegen in einem vorgerenderten Bild, das erst neu entsteht, wenn ein Kegel um 0,5 CSS-px geschwankt ist; der Schein der Futterstelle ist ein Sprite statt eines Verlaufs je Frame.
- **Farben:** Der Canvas liest alle Farben einmal beim Start aus den Tokens `--sw-scene-*` und `--sw-unit-*`; im Renderer stehen keine Farbwerte.
- **Render-Takt:** nur über `GameLoop.onRender`; er pausiert bei verborgener Seite (§4). Pro Frame laufen keine Template-Bindungen.
- **Ertragsteilchen und Ereigniszahlen:** Teilchen im Canvas (Rate logarithmisch in der Nahrung/s, gedeckelt), Zahlen („+x DNA“, „Fund!“) als DOM-Elemente mit CSS-Animation; für Screenreader `aria-hidden`, weil das Log dieselben Ereignisse nennt.

### 8.3 Eingabe

| Eingabe | Desktop | Mobile |
|---|---|---|
| Moduswechsel | Mausrad (mit Sperre 900 ms), Tasten `W` / `G` / `Esc`, Zoom-Leiste, Zurück-Knopf | Pinch (Schwellwert), Zoom-Leiste, Zurück-Knopf |
| Auswahl | Mausklick auf Ziel, Knoten oder Knopf | Tippen |
| Technik | Pointer Events einheitlich; Pinch aus zwei aktiven Pointern berechnet; `touch-action: none` auf der Spielfläche |

**Umsetzungsstand (AP 1.4.4, 1.4.5):** Die Eingabelogik ist rein in `shell/domain` (`shell-input-logic.ts`, `shell-pinch-logic.ts`) und wird von der `ShellInputDirective` am Shell-Container verdrahtet. Nur diese Stelle hört auf Rad, Tasten und Pinch, deshalb gibt es keine doppelte Auslösung.

- **Mausrad:** Richtung wie im Mockup (`deltaY > 0` zoomt hinaus Richtung Karte, sonst hinein Richtung Genom). Ein Wechsel je Sperre von 900 ms (`WHEEL_LOCK_MS`); die Sperre startet auch am Ende der Reihe neu. Ausschläge unter 4 px zählen nicht (`WHEEL_MIN_DELTA`), Zeilen- und Seitenmodus werden in Pixel umgerechnet (16 px je Zeile). Kein Wechsel, wenn das Rad über einem Eingabefeld oder einem Panel liegt, das gerade senkrecht scrollen kann (Detailpanels, Schubladen, linke Spalte). Strg+Rad bleibt dem Browser-Zoom.
- **Tasten:** `W` Umgebung, `G` Genom, `Esc` Schwarm; nicht mit Strg/Alt/Meta, nicht bei Tastenwiederholung und nicht aus Eingabefeldern. `Esc` schließt in der Szene zuerst eine offene Schublade. Die Knöpfe der Zoom-Leiste tragen `aria-keyshortcuts`; eine Hinweiszeile nennt Rad und Tasten und ist bei `pointer: coarse` ausgeblendet.
- **Pinch:** Auseinander ab Faktor 1,25 zoomt hinein (Richtung Genom), zusammen ab 0,8 hinaus (Richtung Karte, wie das Mausrad). Je Geste höchstens ein Wechsel, ab drei Fingern gesperrt. Gezählt werden nur Touch-Pointer, die auf der Spielfläche (`.shell__layer`) aufsetzen; Panels scrollen weiter und erlauben dort den Browser-Zoom (kein `user-scalable=no`). Übernimmt der Browser die Geste (`pointercancel`, z. B. wenn ein Finger den Genom-Baum auf dem Smartphone schon verschiebt), speisen bis zum Loslassen passive Touch Events denselben Zustandsautomaten. Klicks während und 400 ms nach einer Mehrfinger-Geste werden verworfen, damit ein Pinch kein Tippen auslöst.
- Pinch ist bisher nur in der Emulation geprüft; die Prüfung auf echten Geräten (iOS, Android) steht aus.

### 8.4 Responsives Layout

| Breite | Anpassung |
|---|---|
| ≥ 1200 px (`desktop:`) | Layout wie Mockup (Ressourcen links oben, Zoom-Leiste links, Detailpanel rechts, Log mit 4 Einträgen) |
| 768–1199 px (`md:max-desktop:`) | Detailpanel schmaler und unter dem Titel; das Log zeigt nur die 2 neuesten Einträge |
| < 768 px (`max-md:`) | Ressourcen als kompakte Kopfzeile oben, darunter eine Moduszeile mit kompakter Zoom-Leiste und „← Schwarm“; Titel je Modus kompakt; Aktionsleiste unten über volle Breite; Detailpanels und Schubladen als **Bottom-Sheets**; Log mit 2 Einträgen, Ära-Anzeige ausgeblendet |

Die Breakpoints sind Tailwinds `md` (768 px) und das eigene Token `--breakpoint-desktop` (75rem = 1200 px) in `src/styles.css`.

Die Größe von Sonar und Genom wird wie im Mockup aus dem verfügbaren Platz berechnet (`--ms`). Auf dem Smartphone ist das die volle Breite abzüglich Rand, höchstens so hoch wie der Platz zwischen Kopfbereich und Aktionsleiste bzw. eingeklapptem Sheet (`min(w − 32, h − 360)`); die Bühne bleibt in der Viewport-Mitte.

**Umsetzungsstand (AP 1.4.5):**

- **Tablet-Log:** Statt ausgeblendet oder einklappbar zeigt das Log unter 1200 px nur die 2 neuesten Einträge. Das ist einfacher und überlappt die Aktionsleiste nicht; die Tabelle oben ist entsprechend angepasst.
- **Bottom-Sheets:** Die Detailpanels von Karte und Genom haben einen Kopf zum Auf- und Zuklappen (`aria-expanded`); eingeklappt zeigen sie nur Kicker, Name und Primäraktion und klappen beim Moduswechsel ein. Die Schubladen der Szene liegen als Sheet über Reitern und Aktionsleiste. Legenden von Karte und Genom stehen hinter einem Knopf „Legende“.
- **Sichere Bereiche:** `viewport-fit=cover` in `src/index.html`; Kopfzeile, Titel, Aktionsleiste und Sheets berücksichtigen `env(safe-area-inset-*)` (K2-Ausnahme).
- **Sonar-Karte:** Schrift mindestens 12 px über den gemessenen Kartenmaßstab, Beschriftungen deterministisch ohne Überlappung platziert, unsichtbare Trefferflächen mindestens 44 px, zwischen Nachbarn an der Mittelsenkrechten geteilt (`sonar/domain/sonar-map-logic.ts`).
- **Genom-Baum:** Auf dem Smartphone ist der Baum mindestens 800 px groß und mit einem Finger verschiebbar (Start auf dem Zellkern), weil 44-px-Trefferflächen ohne Überschneidung und 12-px-Beschriftungen erst ab rund 820 px Platz finden. Die Kostenschilder sind in allen Größen um den Faktor 1,2 gewachsen.
- **Touch-Ziele:** Bedienelemente mindestens 44 px (`min-h-11`). Ausnahme sind die Strategie-Knöpfe im Kartentitel bei feinem Zeiger ab 768 px (`min-h-8`); bei `pointer: coarse` und auf dem Smartphone haben auch sie 44 px.
- **Offen:** Das Querformat auf dem Smartphone ist nicht eigens optimiert.

### 8.5 Barrierearmut

- `prefers-reduced-motion` und eine Einstellung ersetzen Zoom-Übergänge durch Überblendungen, reduzieren Partikel und stoppen Dauer-Animationen (Sonar-Sweep, Membran).
- Alle Aktionen sind per Tastatur erreichbar; sichtbarer Fokus; ARIA-Labels für Icon-Knöpfe.
- Farben sind nicht der einzige Informationsträger (z. B. „✓ einnehmbar“ / „✗ zu stark“ als Text).

**Umsetzungsstand (AP 1.4.6):**

- **Reduzierte Bewegung aus einer Quelle:** Der `MotionPreferenceService` (`shared/data-access/motion-preference`) verbindet `prefers-reduced-motion` (Token `PREFERS_REDUCED_MOTION`, folgt Änderungen zur Laufzeit) mit einem Override und spiegelt das Ergebnis als `data-motion="reduced"` bzw. `"full"` an `<html>`. Utilities nutzen die Variante `motion-reduced:` (vor dem App-Start ersatzweise die Media-Query), Komponenten-CSS `:host-context([data-motion='reduced'])`, Canvas und Logik lesen `reducedMotion` über ihre Facade. Das Attribut sitzt an `<html>`, damit auch `/modell` und spätere Dialoge außerhalb der Shell reagieren. Die Einstellung kommt mit AP 1.5.3 und setzt den Override über `setOverride(boolean | null)`.
- **Wirkung:** Moduswechsel sind eine kurze Überblendung ohne Kamerafahrt. Sonar-Sweep, Routenfluss, Membran-Drehung, Puls verfügbarer Knoten und das Badge der Zoom-Leiste stehen still; Ereigniszahlen und Log-Einträge blenden nur ein und aus. Die Szene halbiert Plankton und Ertragsteilchen, lässt keine Blasen aufsteigen und hält die Lichtkegel an. Die Agenten bewegen sich weiter, weil sie Spielzustand zeigen und keine großen Flächen bewegen.
- **Fokusführung:** Nach jedem Moduswechsel außer dem ersten Laden setzt die Shell den Fokus auf den Titel des neuen Modus (`tabindex="-1"`, benannte Region, ohne Scrollen); eine zusätzliche Live-Ansage gibt es nicht, damit der Screenreader den Modus nicht doppelt nennt. Schubladen nehmen beim Öffnen den Fokus und geben ihn beim Schließen an ihren Reiter zurück. Den sichtbaren Fokus setzt `:focus-visible` global in `src/styles.css`.
- **Dialoge (AP 1.5.1, [ADR-014](adr/014-dialog-nativ.md)):** Modale Dialoge sind das native `<dialog>` mit `showModal()` (`ModalDialogComponent` in `shared/ui/modal-dialog`): Fokusfalle, Esc, `inert` der übrigen Seite und Top-Layer kommen vom Browser, benannt über den Titel (`aria-labelledby`). Esc meldet nur `closed`, offen bleibt der Dialog, bis der Aufrufer `open` zurücknimmt. Auf dem Smartphone ein Bottom-Sheet in voller Breite mit sicherem Bereich unten; bei reduzierter Bewegung nur Überblenden. Solange ein Dialog offen ist, lösen die Tasten der Shell (W, G, Esc) nichts aus. Erster Dialog ist die Rückkehr-Zusammenfassung (US-07.03) ab 5 min Abwesenheit, in allen Modi.
- **Pause:** Dauer-Animationen von Sonar (Sweep, Routenfluss) und Genom (Membran, Puls) pausieren, solange ihre Ebene inert ist (`:host-context([inert])`); der Render-Takt der Szene pausiert bei verborgener Seite, der Logik-Takt holt den Rückstand danach nach (§4, US-09.03).

### 8.6 Grafikstil (K2-K)

Das UI-Leitbild ist [Mockup K2-K · Kurzgesagt-Stil](mockups/k2-kurzgesagt.html). Es ersetzt die Neon-Optik von [K2](mockups/k2-zoom.html), Ebenen und Bedienung bleiben gleich.

- **Flächen statt Leuchten:** satte, konturlose Farbflächen auf tiefem Blauviolett; kein Glow (`shadowBlur`, `drop-shadow`-Leuchten).
- **Schatten:** Cel-Schatten als Sichel auf Zellen und Knoten; Panels und Knöpfe als massive, abgerundete Flächen mit flachem Schlagschatten (`--drop`, `--shade` im Mockup).
- **Tiefe:** Lichtkegel und Hügel in Luftperspektive in der Szene; leichte Körnung als Overlay über den Ebenen, unter dem HUD.
- **Typografie:** abgerundete, kräftige Sans-Serif (im Mockup Nunito mit Systemschriften als Fallback). Seit AP 1.4.3 ist Nunito als variable Webfont (latin, latin-ext) selbst gehostet, mit den Systemschriften des Mockups als Fallback ([ADR-013](adr/013-webfont-nunito.md)).
- **Palette:** Die Farben des Mockups (`:root`) werden zu `--sw-*`-Tokens in `src/styles.css` ([ADR-010](adr/010-tailwind-tokens.md)); Textkontrast ≥ 4,5:1 bleibt Pflicht. Umgesetzt in AP 1.4.3: Die Basis-Tokens tragen die Palette von K2-K. Koralle, Pink und Violett des Mockups erreichen als Text keine 4,5:1; `--sw-danger` und `--sw-magenta` sind deshalb aufgehellt, `--sw-violet` ist der helle Ton `--sw-violet-light`.
- **HUD und Overlays (umgesetzt in AP 1.4.3):** Ressourcen, Titel je Modus, Aktionsleiste, Zoom-Leiste, Schubladen, Log und Ära-Anzeige folgen dem Mockup als massive, abgerundete Panels (`bg-surface`, `shadow-panel`) mit gelbem Primärknopf. Die Körnung ist die Utility `grain` (`mix-blend-mode: overlay`) zwischen Ebenen und Overlays.
- **Genom (umgesetzt in AP 1.3.3):** radialer SVG-Baum im Zellkern nach Mockup K2-K, ohne neue Abhängigkeit. Gewellte Membran, Organellen, gebogene Äste in den Astfarben (Tokens `--sw-branch-*`, `--sw-nucleus`, `--sw-membrane`, `--sw-organelle`, `--sw-cell`, `--sw-locked*`, `--sw-cost-muted*`), Knoten mit Cel-Glanz, Kostenschild und Statusdarstellung; verfügbare Knoten pulsieren. Die Geometrie rechnet `genome/domain/genome-tree-logic.ts` rein, die Positionen stehen als UI-Daten in `genome/ui` (§6). Membran-Drehung und Puls sind CSS-Animationen nach der K2-Ausnahme und stehen bei reduzierter Bewegung still (§8.5). Seit AP 1.4.1 liegt der Baum in der Genom-Ebene der Shell, Titel und Detailpanel im Overlay des Genom-Modus.

## 9. Zahlenformatierung

- `Num`-Formatierung in `shared/util/format.ts`, deutsch (Templates nutzen sie über Pipes):
  - unter 1 Mio.: ganze Zahlen mit Tausenderpunkt (`1.284`), Raten mit einer Nachkommastelle (`3,2`)
  - ab 1 Mio.: Kurzformen `Mio.`, `Mrd.`, `Bio.`, `Brd.`, `Trio.`, `Trd.` (< 1e24)
  - danach wissenschaftliche Notation (`1,23e45`)
  - Kurzformen und wissenschaftliche Notation: zwei Nachkommastellen, kaufmännisches Runden mit Übertrag
- Einstellbar: Kurzformen / wissenschaftlich / technisch.

## 10. Qualitätssicherung

Bis zum Konzept-Meilenstein M5.0 gibt es keinen vollständigen Testplan ([Projektplan §6](projektplan.md#6-vorgehen)). Getestet werden nur die **wesentliche** Logik und die **wesentlichen** E2E-Abläufe; Hauptziel ist, unbeabsichtigte Regressionen zu vermeiden. Strengere Testregeln (z. B. aus PortfoliGo: Oracle-Regel, Mutationstests, Seiten-Tests je Akzeptanzkriterium) werden frühestens im Konzept-Meilenstein M5.0 neu bewertet; bis dahin sind viele Mechaniken noch offen.


| Ebene | Maßnahme |
|---|---|
| Core | Unit-Tests mit Vitest für die wesentlichen Regeln und Formeln; Untergrenze 70 % Abdeckung in den `domain`- und `util`-Schichten als Sicherheitsnetz, kein Ziel |
| Determinismus | Test: gleicher Seed + gleiche Kommandos ⇒ identischer State |
| Offline-Catch-up | Test (`engine/domain/catch-up-logic.spec.ts`, AP 1.5.1): Catch-up gegen 100-ms-Takt aus Bot-Ständen mit Auto-Weiterziehen, Brut und Funden. Gleiche Ereignisfolge, gleiche Route und gleiche Funde; Nahrung, DNA und Einheiten innerhalb 0,5 % (gemessen bis 0,45 % über Stände „Aktiv“ und „Idle“ von 5 min bis 3 h, je 1 h nachgeholt; DNA exakt), mit Kämpfen (Strategie „Kampferprobt“) 2 % (gemessen 1,3 %, die Verluste wachsen mit `(B / A)²`). Die 15 % des Runner-Tests kamen von den Bot-Käufen; offline gibt es keine. Der Restfehler kommt daher, dass frisch geschlüpfte Drohnen im groben Schritt erst ab dem nächsten Schritt sammeln; er wächst mit der Schrittweite, eine Teilung an „Nahrung reicht für Brut“ hilft nicht. **Grenzfall:** Begrenzt die Nahrung die Brut sehr stark (künstlich: 5000 Königinnen, kein Vorrat), wächst der Schwarm exponentiell und der grobe Schritt weicht um rund 7 % ab; in den Bot-Ständen kommt das nicht vor. Zeitbudget: 24 h Catch-up dauerten aus einem Stand nach 1 h „Aktiv“ rund 1,1 s (Vitest, WSL; Ziel [§4](#4-simulation) < 1 s), davon rund 0,9 s in `step` (`Num`-Rechnungen in Sammeln und Brut); der Test prüft 2,5 s |
| Saves | Test je Migration mit eingefrorenen Beispiel-Spielständen |
| Balancing | Snapshot-Tests der Kennzahlen (Abschnitt 5.6) |
| UI | Komponententests nur für Komponenten und Seiten mit eigener Logik (z. B. Formular-Parsing); rein darstellende Komponenten deckt der E2E-Smoke ab |
| E2E | Playwright-Smoke: Start, Kauf, Moduswechsel, Weiterziehen; Viewports Desktop und Smartphone |
| Performance | Ziel: 60 fps in der Szene, Moduswechsel ohne Ruckeln. **Stand AP 1.4.6 (Emulation):** Headless-Chromium mit Software-Raster, 4× CPU-Drosselung, 250.000 Drohnen. Smartphone 390 × 844, DPR 2, 150 Sprites: mit Hintergrund-Cache und Schein-Sprite Median und 95-Perzentil 16,7–16,8 ms je Frame, auch während der Moduswechsel (vorher 95-Perzentil 33,4 ms); teuer sind Pixelflächen, nicht JavaScript (Szene-Skript < 1 % der Samples). **Risiko:** Desktop 1440 × 900 mit 300 Sprites bleibt im Software-Compositing bei rund 30 fps; Hauptursache ist die Körnung (`mix-blend-mode: overlay` über der sich jeden Frame ändernden Szene), ohne Körnung 60 fps. Auf echter GPU zu prüfen. Profiling auf echten Geräten (iOS, Android) steht aus |
| CI-Gates | Lint, Unit-Tests, Build und E2E müssen grün sein, bevor auf `main` deployt wird; das Gate E2E greift erst ab AP 1.5.7, wenn es E2E-Tests gibt |

## 11. Deployment & PWA

- GitHub Actions baut bei Push auf `main` und veröffentlicht auf GitHub Pages (`base-href` = Repository-Name).
- `@angular/pwa`: Service Worker cacht das App-Shell; das Spiel startet offline. Updates werden beim nächsten Start aktiv, mit Hinweis „Neue Version verfügbar“.
- Versionsnummer und Build-Datum stehen in den Einstellungen.

## 12. Architektur-Entscheidungen (ADRs)

Die Entscheidungen sind als einzelne Dateien in [`docs/adr/`](adr/README.md) festgehalten:

| Nr | Entscheidung |
|---|---|
| ADR-001 | Angular (zoneless, Signals) als Framework; Spiellogik Angular-frei (Schichtentabelle ersetzt durch ADR-009) |
| ADR-002 | `break_infinity.js` hinter eigenem `Num`-Typ |
| ADR-003 | Fester Logik-Takt 10 Hz, getrennt vom Rendering; seeded RNG |
| ADR-004 | Unveränderlicher State, Kommandos als reine Funktionen |
| ADR-005 | Speicherformat: komprimiertes JSON in `localStorage`, versioniert mit Migrationskette |
| ADR-006 | Canvas 2D für die Szene, SVG für Karte und Genom, CSS-Übergänge für K2 |
| ADR-007 | Modell-Seite mit ECharts nutzt dieselbe Logik wie das Spiel; Balancing-Snapshots als Tests |
| ADR-008 | Kein Backend; Hosting auf GitHub Pages |
| ADR-009 | Domänen mit Schichten; Signal-Store mit Facades, kein NgRx |
| ADR-010 | Tailwind CSS v4 mit semantischen Tokens; K2-Ebenen in Komponenten-CSS |
| ADR-011 | Texte über `@angular/localize`; Übersetzung später |
| ADR-012 | Formulare mit Signal Forms (`@angular/forms/signals`) |
