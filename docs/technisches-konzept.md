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
    data-access/platform/       # CLOCK, ANIMATION_FRAME
  balance/
    domain/constants.ts, formulas.ts, targets.ts (geplant)
  engine/
    domain/models/game-state.model.ts   # Zusammensetzung aus den Fachdomänen
    domain/models/game-event.model.ts   # GameEvent, StepResult
    domain/game-state-logic.ts, commands-logic.ts, step-logic.ts, random-logic.ts
    domain/runner-logic.ts, cycle-metrics-logic.ts, bot-logic.ts, catch-up (geplant)
    data-access/game-store/, game-loop/, game-core/   # provideGameCore(), Ereignis-Log
  swarm/
    domain/models/units.model.ts, transport-priority.model.ts
    domain/units-logic.ts, brood-logic.ts, transport-logic.ts, sacrifice-logic.ts
  site/
    domain/models/site.model.ts, map.model.ts, travel.model.ts, auto-move.model.ts, site-event.model.ts
    domain/data/sites-era1.data.ts, collect-logic.ts, generator-logic.ts, map-logic.ts
    domain/combat-logic.ts, move-logic.ts, strategy-logic.ts, auto-move-logic.ts
    ui/site-type-labels/        # Namen der Futterstellentypen für HUD, Log und Umgebung
  persistence/
    domain/serialize-logic.ts, slots-logic.ts, migrations/
    data-access/persistence/    # PersistenceService, KEY_VALUE_STORE
  hud/
    domain/sacrifice-count-logic.ts   # Eingabeprüfung „Drohnen opfern“
    feature/hud.routes.ts, hud/hud.page.ts, state/hud.facade.ts, state/hud.utils.ts
    ui/buy-button/, feeding-site/, hud-meter/, event-log/, form-sacrifice-drones/
  sonar/                        # Umgebung /umgebung (lazy): SVG-Sonar-Karte (AP 1.2.8), darunter die Zielliste
    domain/auto-threshold-logic.ts    # Eingabeprüfung der Schwelle
    domain/sonar-map-logic.ts         # Geometrie der Sonar-Karte (Maßstab, Route, Reiselinie)
    feature/sonar.routes.ts, sonar/sonar.page.ts, state/sonar.facade.ts, state/sonar.utils.ts
    ui/sonar-map/, target-list/, target-detail/, form-move-settings/, sonar-labels/, models/
  model/                        # Modell-Seite (lazy)
    feature/model.routes.ts, model/model.page.ts, state/model.facade.ts, state/model.guards.ts
    ui/form-model-params/, form-stall-threshold/, model-charts/, model-metrics/, model-stalls/, echart/, bot-labels/
    data-access/sim/            # SimService, sim.worker.ts, Protokoll
    domain/bots/, models/, params-logic.ts, model-params-logic.ts, reduce-result-logic.ts, stall-logic.ts …
  # geplant
  shell/                        # Ebenen-Layout, Modus/Kamera (K2)
  scene/                        # Canvas-Renderer
  genome/, finds/, settings/
```

Jede Fachdomäne definiert ihren Teil des Zustands und ihre Regeln; `engine/domain` setzt `GameState`, `applyCommand`/`apply` und `step` daraus zusammen. Eine `domain`-Schicht in einer Oberflächen-Domäne (`hud/domain`, `sonar/domain`) enthält nur reine Eingabeprüfung ohne Spielregeln, damit Formular-Schemas in `ui` sie nutzen können.

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
- **Abgeleitete Werte** (Raten, Preise, Einnehmbarkeit) werden nicht im State gespeichert. Sie entstehen über reine Funktionen in `balance/domain` und werden in den Facades als `computed()`-Viewmodels gekapselt. Komponenten lesen nur diese Viewmodels.
- **Ereignisse:** `applyCommand` und `step` liefern `StepResult` = `{ state, events }`. Die Ereignisse (`GameEvent`, seit M1.2 `departed`, `arrived`, `siteDepleted`) sind Codes mit IDs, Rohwerten und der Spielzeit `playedMs`; die Texte setzt die Oberfläche. `apply` ist die Kurzform ohne Ereignisse. Später lesen auch Effekte und die Rückkehr-Zusammenfassung sie (Einheit gefallen, Fund).
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

Save-Version 3 enthält `version`, `seed`, `rngState`, `time`, `era`, `res`, `units`, `site`, `bought`, `map`, `travel`, `auto` und `priority` ([Game-Design §5](game-design.md#5-spielstand-version-3)). Die Reichweite steht nicht im Zustand, sie wird abgeleitet. `pheromones`, `genome`, `finds`, `stats` und `settings` sind Entwurf und kommen mit den jeweiligen Mechaniken über Migrationen.

IDs in `data/` (Einheiten, Adaptionen, Futterstellentypen, Funde) sind **stabil**. Spielstände speichern nur IDs, keine Texte oder Werte.

**Ausblick auf mehrere Standorte:** `site` ist genau eine Futterstelle. Ab AS3 arbeitet der Schwarm an mehreren Standorten, ab AS4 an Gebieten und Fronten, ab AS5 über Systeme hinweg. Dafür wird `site` zu einer Liste und per Migration umgestellt. M1.2 bleibt bei einem Standort, schreibt seine Regeln aber möglichst so, dass sie je Standort arbeiten.

## 4. Simulation

| Aspekt | Lösung |
|---|---|
| Logik-Takt | fest **10 Hz** (`dt` = 100 ms), unabhängig von der Framerate; Akkumulator-Pattern im GameLoop |
| Rendering | `requestAnimationFrame`, liest nur den State; pausiert bei `document.hidden` |
| Eingaben | Kommandos wie Käufe werden sofort angewendet, nicht erst im nächsten Tick |
| Determinismus | Zufall nur über den seeded RNG im State (z. B. mulberry32). Gleicher Seed + gleiche Kommandos an gleicher Position zwischen den Ticks ⇒ gleiches Ergebnis. Grundlage für Tests, Modell-Seite und gegen Save-Scumming |
| Offline-Catch-up | Beim Laden wird `Δt = now − lastSaved` (gedeckelt, Start 24 h) nachgeholt. Das geschieht in **adaptiven Schritten**: große Schritte (z. B. 10 s), die an Ereignisgrenzen (Futterstelle leer, Nahrung reicht für Brut, Auto-Weiterziehen) verkürzt werden. Die Teilung an Ankunft und vorhergesagtem Auto-Auslöser gibt es schon: `nextSplitMs` in `engine/domain/step-split-logic.ts`, heute vom Headless-Runner genutzt. Ergebnis ≈ Echtzeit-Simulation; ein Test sichert die Toleranz ab |
| Hintergrund-Tab | Browser drosseln Timer, daher erkennt der GameLoop große Zeitsprünge und nutzt dafür ebenfalls den Catch-up |
| Performance-Budget | `step` < 2 ms auf einem Mittelklasse-Smartphone; Catch-up für 24 h < 1 s |

## 5. Mathematisches Modell & Modell-Seite

### 5.1 Grundsatz

Es gibt **eine einzige Quelle der Wahrheit** für Formeln: `balance/domain`. Spiel, Offline-Catch-up, Headless-Runner und Modell-Seite rufen dieselben Funktionen auf. Die Modell-Seite enthält keine Kopie der Spiellogik.

### 5.2 Modellgrößen (Entwurf für spätere Größen)

> Für M1.1 und M1.2 ist die [Game-Design-Spezifikation](game-design.md) maßgeblich, auch für Platz, Kampf (Verluste-Formel `L = S · λ · (B / A)^κ`), DNA-Belohnung (`d_0 · B^δ`), Futterstellen-Generator, Transport und Opfern. Die Tabelle bleibt als Entwurf für spätere Größen stehen (z. B. Pheromone, `M_platz`, `M_angriff`); bei Abweichungen gilt die Spezifikation.

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

`M_*` sind Modifikatoren aus Genom, Funden und Buffs. Sie werden im Effekt-System gesammelt (additive Summen werden zuerst gebildet, dann multipliziert).

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
- Er teilt die Schritte zusätzlich an der Ankunft und am vorhergesagten Auslöser des Auto-Weiterziehens (`V = θ · G`, exakt, weil die Abbaurate im Schritt konstant ist). `step` selbst teilt einen Schritt an der Ankunft ([Game-Design §4.3](game-design.md#43-simulationsschritt)).
- Bots sind nicht übertragbar: Der Worker erzeugt sie aus einer Beschreibung. Vor dem Senden verkleinert er das Ergebnis auf höchstens 2.000 Abtastpunkte und 500 Ereignisse je Art; die Gesamtzahl der Ereignisse bleibt erhalten. Die Futterstellen werden zusammengefasst (Anzahl, Mediane, Kämpfe, DNA) und für Diagramme und Stillstände als Liste mitgeschickt, ab 1.000 Futterstellen gleichmäßig ausgedünnt.
- Bots ab AP 1.1.9: **Aktiv** (entscheidet häufig und kauft das Beste), **Idle** (schaut alle 5 min vorbei und kauft alles Bezahlbare). Seit AP 1.2.7 schalten beide bei ihrer ersten Entscheidung das Auto-Weiterziehen ein (`CommandPlan.enableAutoMove`) und ziehen damit weiter. Seit AP 1.2.9 zusätzlich, beide im Takt von „Aktiv“ und mit Auto-Weiterziehen: **Drohnen-lastig** (kauft Königinnen und Drohnen wie „Aktiv“, keine Soldaten; Mitnahme „Drohnen zuerst“, Strategie „Geringster Widerstand“) und **Soldaten-lastig** (kauft die günstigere von Soldat und Königin, keine Drohnen; Mitnahme „Soldaten zuerst“, Strategie „Kampfgehärtet“). Ihre Einstellungen setzen sie bei der ersten Entscheidung (`CommandPlan.setTransportPriority`, `setStrategy`).
- Die Pacing-Zielbänder ([Projektplan §3.5](projektplan.md#35-pacing-ziele-vorläufig)) gelten nur für **Aktiv** und **Idle**. **Drohnen-lastig** und **Soldaten-lastig** sind Analyse-Bots ohne Zielband. Die Wartezeit-Kennzahlen bleiben spielbezogen (weder Königin noch Drohne bezahlbar, [Game-Design §6](game-design.md#6-messwerte-v1)), auch für die Analyse-Bots.
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
| Amortisation je Upgrade | Kosten ÷ zusätzlicher Ertrag/s |
| Freischalt-Zeitpunkte | Wann wird welche Mechanik erstmals relevant |

### 5.5 Aufbau der Modell-Seite

```
┌ Parameter ─────┐ ┌ Diagramme ──────────────────────────────────────┐
│ Seed           │ │ [Ressourcen] [Raten] [Entscheidungen] [Zyklen…] │
│ Dauer 1h…7d    │ │                                                 │
│ Bots ☑☑☐☐      │ │  ▁▂▃▅▇  log ▾  Zoom                             │
│ Konstanten …   │ │  Markierungen: ▲ Kauf ◆ leer ● Weitergezogen    │
│ [Basislauf] [▶]│ ├ Stillstände (Schwelle 60 min) ──────────────────┤
│ [JSON export]  │ │ je Bot: Kein Kampfziel · Kein Aufbruch          │
│                │ ├ Kennzahlen ─────────────────────────────────────┤
│                │ │ je Bot: Käufe, Wartezeit, Futterstellen, …      │
└────────────────┘ └─────────────────────────────────────────────────┘
```

- Erreichbar unter `/modell`. Im Produktiv-Build ist die Seite nur mit `?dev` erreichbar und nicht verlinkt.
- **Reiter in M1.1:** Ressourcen (Nahrung, Vorrat, Einheiten), Raten (Nahrung/s, Netto/s, Eier/min) und Entscheidungen (Zeit bis zum nächsten Kauf je Einheit und gesamt). Seit AP 1.2.9 je Futterstelle: „Dauer je Futterstelle“ (Reise und Aufenthalt gestapelt) und „Soldaten vor/nach Einnahme“, ohne Markierungen, mit eigenem Zoom über die Futterstellen (seit M1.2), der nicht an die Facade geht. Upgrades folgen ab AP 1.3.7.
- **Kennzahlen je Bot:** erster Kauf, Kauflücken und längste Wartezeit der ersten 30 min, erste Futterstelle, Anzahl und Median der Futterstellen, Median der Reisezeit, Einnahmen mit Kampf, DNA gesamt, längste Strecke ohne Kampfziel, längster Aufenthalt an einer Futterstelle, längste Strecke ohne Kauf, Verdopplungszeit, Anteil Wartezeit, Käufe gesamt und Rechendauer.
- **Stillstände (seit AP 1.2.9):** Warnungen je Bot für „Kein Kampfziel“ (keine Einnahme eines Ziels mit Abwehr > 0, also keine DNA) und „Kein Aufbruch“, beide mit derselben Schwelle (Standard 60 min). Die Schwelle ist ein Analyse-Parameter der Modell-Seite, keine Konstante in `BalanceParams`; eine Änderung wertet das vorhandene Ergebnis rein neu aus und startet keinen Lauf.
- **Bots:** Standardmäßig laufen „Aktiv“ und „Idle“; „Drohnen-lastig“ und „Soldaten-lastig“ werden zugeschaltet.
- **Vergleich:** Ein gespeicherter Basislauf und der aktuelle Lauf liegen übereinander.
- **Zielbänder (ab AP 1.3.7):** Die Pacing-Ziele aus dem [Projektplan](projektplan.md#35-pacing-ziele-vorläufig) liegen dann als Konfiguration in `balance/domain/targets.ts` und werden als Flächen angezeigt, nur für die Bots „Aktiv“ und „Idle“ (§5.3). Verletzungen landen in einer Warnliste.

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

- Spieldaten enthalten keine Texte. Texte entstehen in `feature` bzw. `ui` über `$localize` und sind über die stabile ID verknüpft ([ADR-011](adr/011-i18n-localize.md)).
- Die Positionen im radialen Genom (Winkel, Radius) gehören zu den UI-Daten in `genome/ui`, nicht in `genome/domain`.

## 7. Persistenz

| Aspekt | Lösung |
|---|---|
| Speicherort | `localStorage`, Schlüssel `idleswarm.save`; zusätzlich ein Backup-Slot des vorletzten Stands und der Slot `idleswarm.save.unreadable`: Ein unlesbarer Primär-Stand wird beim nächsten Speichern dorthin verschoben statt überschrieben |
| Format | JSON → komprimiert (`lz-string`) → Base64; `Num` als String serialisiert |
| Autosave | alle 30 s (einstellbar), bei `visibilitychange` (hidden) und `pagehide` |
| Versionierung | Feld `version`; beim Laden läuft die Migrationskette aus der Registry `MIGRATIONS` in `migrations/migrations-logic.ts` (aktuell Version 3, mit den Migrationen 1→2 und 2→3; beide setzen den Spielstand bis auf Seed, RNG-Zustand und Zeiten auf die Startwerte) |
| Robustheit | Validierung beim Laden. Bei einem Fehler wird der Backup-Slot geladen und der Spieler informiert |
| Export/Import | derselbe String zum Kopieren; Import validiert und migriert |
| Später | Cloud-Sync optional (Querschnittsthema), ohne Änderung am Format |

## 8. Rendering & Umsetzung von K2

### 8.1 Ebenen und Kamera

Die Umsetzung folgt [`docs/mockups/k2-kurzgesagt.html`](mockups/k2-kurzgesagt.html) (`setMode`, `applyCamera`). Ebenen, Kamera und Bedienung sind dieselben wie in [K2](mockups/k2-zoom.html); K2-K legt die Grafik fest (§8.6).

| Ebene | Inhalt | Technik |
|---|---|---|
| `#sonar` (z = 1) | Umgebung / Weiterziehen | SVG, startet mit `scale(6)` und `opacity: 0` |
| `#world` (z = 2) | Schwarm-Szene | Canvas; im Kartenmodus per `scale` und `clip-path: circle()` zum Punkt verkleinert |
| `#genome` (z = 3) | Zellkern mit radialem Genom | SVG; im Genommodus wird die Welt vergrößert, `blur` und abgedunkelt |

- **Umsetzungsstand:** Die SVG-Sonar-Karte gibt es seit AP 1.2.8 als Komponente oben auf `/umgebung` (SVG im Angular-Template, keine neue Abhängigkeit; Geometrie rein in `sonar/domain`). Die Zielliste bleibt bis M1.4 darunter als tippbare, barrierearme Alternative. Ebenen, Kamera und Moduswechsel folgen ab AP 1.4.1.
- Der Modus ist ein Signal im GameStore (`'map' | 'scene' | 'gen'`). Die Shell-Komponente setzt `data-mode` am Container, CSS übernimmt die Übergänge.
- Zoom-Leiste, Titel je Modus und Detailpanels hängen am Modus-Signal.

### 8.2 Szene (Canvas)

- **Agenten-Budget:** maximal ~300 Sprites (mobil ~150). Bei mehr Einheiten steht ein Sprite für `n` Einheiten, die Verteilung auf die Typen bleibt proportional.
- **DPR:** Die Canvas-Größe wird mit `devicePixelRatio` skaliert (gedeckelt auf 2).
- Einheiten sind flach schattierte Zellen aus mehreren Flächen (Körper, Cel-Schatten als Sichel, Kern). Damit das pro Frame billig bleibt, werden Sprites je Typ vorgerendert (Offscreen-Canvas) und nur kopiert.
- Ertrags-Partikel und Ereigniszahlen, etwa bei Einnahmen oder Funden: Partikel im Canvas, Zahlen als DOM-Elemente.

### 8.3 Eingabe

| Eingabe | Desktop | Mobile |
|---|---|---|
| Moduswechsel | Mausrad (mit Sperre ~900 ms), Tasten `W` / `G` / `Esc`, Zoom-Leiste | Pinch (Schwellwert), Zoom-Leiste, Zurück-Knopf |
| Auswahl | Mausklick auf Ziel, Knoten oder Knopf | Tippen |
| Technik | Pointer Events einheitlich; Pinch aus zwei aktiven Pointern berechnet; `touch-action: none` auf der Spielfläche |

### 8.4 Responsives Layout

| Breite | Anpassung |
|---|---|
| ≥ 1200 px | Layout wie Mockup (Ressourcen links oben, Zoom-Leiste links, Detailpanel rechts) |
| 768–1199 px | Detailpanel schmaler, Log ausgeblendet bzw. einklappbar |
| < 768 px | Detailpanels und Schubladen als **Bottom-Sheets**; Zoom-Leiste als kompakte Leiste; Aktionsleiste unten über volle Breite; Ressourcen als kompakte Zeile oben |

Die Größe von Sonar und Genom wird wie im Mockup aus dem verfügbaren Platz berechnet (`--ms`). Auf Mobile ist das die volle Breite.

### 8.5 Barrierearmut

- `prefers-reduced-motion` und eine Einstellung ersetzen Zoom-Übergänge durch Überblendungen, reduzieren Partikel und stoppen Dauer-Animationen (Sonar-Sweep, Membran).
- Alle Aktionen sind per Tastatur erreichbar; sichtbarer Fokus; ARIA-Labels für Icon-Knöpfe.
- Farben sind nicht der einzige Informationsträger (z. B. „✓ einnehmbar“ / „✗ zu stark“ als Text).

### 8.6 Grafikstil (K2-K)

Das UI-Leitbild ist [Mockup K2-K · Kurzgesagt-Stil](mockups/k2-kurzgesagt.html). Es ersetzt die Neon-Optik von [K2](mockups/k2-zoom.html), Ebenen und Bedienung bleiben gleich.

- **Flächen statt Leuchten:** satte, konturlose Farbflächen auf tiefem Blauviolett; kein Glow (`shadowBlur`, `drop-shadow`-Leuchten).
- **Schatten:** Cel-Schatten als Sichel auf Zellen und Knoten; Panels und Knöpfe als massive, abgerundete Flächen mit flachem Schlagschatten (`--drop`, `--shade` im Mockup).
- **Tiefe:** Lichtkegel und Hügel in Luftperspektive in der Szene; leichte Körnung als Overlay über den Ebenen, unter dem HUD.
- **Typografie:** abgerundete, kräftige Sans-Serif (im Mockup Nunito mit Systemschriften als Fallback). Ob eine Webfont eingebunden wird, entscheidet AP 1.4.3.
- **Palette:** Die Farben des Mockups (`:root`) werden zu `--sw-*`-Tokens in `src/styles.css` ([ADR-010](adr/010-tailwind-tokens.md)); Textkontrast ≥ 4,5:1 bleibt Pflicht.

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
| Offline-Catch-up | Test: Catch-up vs. Echtzeit-Simulation innerhalb einer Toleranz |
| Saves | Test je Migration mit eingefrorenen Beispiel-Spielständen |
| Balancing | Snapshot-Tests der Kennzahlen (Abschnitt 5.6) |
| UI | Komponententests nur für Komponenten und Seiten mit eigener Logik (z. B. Formular-Parsing); rein darstellende Komponenten deckt der E2E-Smoke ab |
| E2E | Playwright-Smoke: Start, Kauf, Moduswechsel, Weiterziehen; Viewports Desktop und Smartphone |
| Performance | Messung in AP 1.4.6 auf echtem Smartphone: 60 fps in der Szene, Moduswechsel ohne Ruckeln |
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
