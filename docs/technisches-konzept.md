# IdleSwarm · Technisches Konzept

> Stand: 18.11.2026 · Gehört zu: [Projektplan](projektplan.md), [Produktplanung](produktplanung.md) · UI-Referenz: [Mockup K2](mockups/k2-zoom.html)

## 1. Rahmenbedingungen

| Thema | Festlegung |
|---|---|
| Spielart | Einzelspieler-Idle-Spiel im Browser, kein Multiplayer |
| Backend | **keines**: Logik, Speicherung und Offline-Fortschritt laufen vollständig im Client |
| Plattformen | Desktop-Browser und Mobile (aktuelle Chrome-, Safari-, Firefox- und Edge-Versionen), Hoch- und Querformat |
| Hosting | statisch über GitHub Pages (`algoristic/IdleSwarm`) |
| Sprache | Deutsch; Texte zentral in Datendateien, damit eine spätere Übersetzung möglich bleibt |

## 2. Technologie-Stack

| Bereich | Wahl | Begründung |
|---|---|---|
| Framework | **Angular** (aktuelle Version, mind. 21), standalone Components, **zoneless**, **Signals** | Dem Entwickler vertraut, dadurch gut nachvollziehbar; Signals passen zu einem sich ständig ändernden Spielzustand; zoneless vermeidet Change-Detection-Last durch den 60-fps-Renderloop |
| Sprache | TypeScript, `strict` | Typsichere Spieldaten und Formeln |
| Große Zahlen | **`break_infinity.js`** (Decimal), gekapselt hinter eigenem Typ `Num` | Idle-Zahlen sprengen spätestens ab AS2 den Bereich von `number` (~1,8·10³⁰⁸); schnell, in Idle-Spielen verbreitet; der Wrapper erlaubt späteren Tausch |
| Rendering Szene | **Canvas 2D** | Wie im Mockup; ausreichend für einige hundert Sprites mit Glow |
| Rendering Karte & Genom | **SVG** in Angular-Templates | Interaktive Knoten, Klickflächen und Styling über CSS; im Mockup erprobt |
| Übergänge | **CSS** (transform, clip-path, filter, opacity) | `@angular/animations` ist veraltet; die K2-Übergänge sind ohnehin CSS-Übergänge |
| Diagramme (Modell-Seite) | **Apache ECharts**, über eine eigene dünne Wrapper-Komponente | Log-Achsen, Zoom, Markierungen, viele Datenpunkte; kein Versionszwang durch Drittanbieter-Wrapper |
| Unit-Tests | **Vitest** | Standard-Testrunner im aktuellen Angular-CLI, schnell, gut für reine TS-Logik |
| E2E-Tests | **Playwright** | Desktop- und Mobile-Viewports, Touch-Emulation |
| Code-Qualität | ESLint (angular-eslint), Prettier | |
| CI/CD | GitHub Actions → GitHub Pages | Lint, Test, Build bei jedem Push; Deploy von `main` |
| PWA | `@angular/pwa` (Service Worker, Manifest) | Installierbar und offline startbar (AP 1.5.6) |

### Angular: Vor- und Nachteile

| Pro | Contra (bewertet) |
|---|---|
| Vertrautes Framework, dadurch Code für den Entwickler nachvollziehbar | Größeres Bundle (~100 KB gzip mehr als z. B. Preact). **Unkritisch** für ein Spiel, das einmal geladen wird und dann gecacht ist |
| Klare Struktur (DI, Services, Routing), CLI, Tests und Build aus einer Hand | Mehr Boilerplate pro Komponente. **Akzeptabel**, die Spiellogik liegt ohnehin in reinem TS |
| Signals: feingranulare Updates des HUD ohne manuelles DOM-Management | Der Canvas-Loop darf keine Change Detection auslösen. **Gelöst** durch zoneless und Rendering außerhalb des Template-Systems |
| Lazy Routes: Modell-Seite belastet das Spiel-Bundle nicht | Animationsmodul veraltet. **Kein Problem**, K2 nutzt CSS-Übergänge |

Es gibt keinen Grund, der gegen Angular spricht. Entscheidend ist die Trennung: Die gesamte Spiellogik liegt in `core/` und kennt Angular nicht. Sie ist damit testbar, auf der Modell-Seite wiederverwendbar und bei Bedarf portierbar.

## 3. Architektur

### 3.1 Schichten

```
┌──────────────────────────────────────────────────────────────┐
│ ui/        Angular-Komponenten (HUD, Zoom, Szene, Sonar, Genom)│
│ model/     Modell-Seite (lazy Route /modell)                  │
├──────────────────────────────────────────────────────────────┤
│ game/      Angular-Services: GameStore (Signals), GameLoop,   │
│            Persistence, Input, Settings                       │
├──────────────────────────────────────────────────────────────┤
│ core/      reines TypeScript, KEINE Angular-Abhängigkeit       │
│   state/   GameState-Typen                                    │
│   rules/   Kommandos: (state, cmd) → state                    │
│   sim/     step(state, dt), Offline-Catch-up, Headless-Runner │
│   balance/ alle Formeln und Konstanten                        │
│   data/    Definitionen: Einheiten, Genom, Futterstellen, Funde│
│   save/    Serialisierung, Versionen, Migrationen             │
│   num/     Num-Typ (Decimal-Wrapper), Formatierung            │
│   rng/     seeded RNG                                         │
└──────────────────────────────────────────────────────────────┘
```

**Regel:** Abhängigkeiten zeigen nur nach unten. `core/` importiert nichts aus `game/`, `ui/` oder `model/`. Eine ESLint-Regel (`no-restricted-imports`) erzwingt das.

### 3.2 Ordnerstruktur

```
src/app/
  core/
    state/game-state.ts
    rules/commands.ts           # Kommando-Typen + apply()
    rules/units.ts, migrate.ts, combat.ts, genome.ts, pheromones.ts, finds.ts
    sim/step.ts, catch-up.ts, runner.ts, bots/
    balance/constants.ts, formulas.ts
    data/units.ts, genome-era1.ts, sites-era1.ts, finds-era1.ts, texts.de.ts
    save/serialize.ts, slots.ts, migrations/
    num/num.ts, format.ts
    rng/rng.ts
  game/
    game-store.service.ts
    game-loop.service.ts
    persistence.service.ts
    input.service.ts
    settings.service.ts
  ui/
    shell/                      # Ebenen-Layout, Modus/Kamera
    scene/                      # Canvas-Renderer
    sonar/                      # SVG-Karte + Detailpanel
    genome/                     # SVG-Genom + Detailpanel
    hud/                        # Ressourcen, Titel, Aktionsleiste, Zoom-Leiste, Log, Ära
    drawers/                    # Pheromone, Funde
    dialogs/                    # Rückkehr-Zusammenfassung, Einstellungen, Export
  model/                        # Modell-Seite (lazy)
    model-page.component.ts
    charts/echart.component.ts
    panels/parameters, bots, warnings
```

### 3.3 Datenfluss

```
Eingabe (Klick, Taste, Pinch)
   │
   ▼
GameStore.dispatch(cmd) ──► core/rules: apply(state, cmd) ──► neuer State
                                                                │
GameLoop (fester Takt) ──► core/sim: step(state, dt) ───────────┤
                                                                ▼
                                       GameStore.state = signal(State)
                                                                │
                              computed()-Signals (Raten, Preise, Status)
                                                                │
                                     ┌──────────────────────────┴───────────┐
                                     ▼                                      ▼
                         HUD/Sonar/Genom (Templates)          Szene (Canvas liest State im rAF)
```

- **Unveränderlicher Zustand:** `apply` und `step` liefern neue Objekte (flache Kopien der geänderten Teile). Das passt zu Signals und macht Tests einfach.
- **Abgeleitete Werte** (Raten, Preise, Einnehmbarkeit) werden nicht im State gespeichert. Sie entstehen über reine Funktionen in `core/balance` und werden in `computed()` gekapselt.
- **Ereignisse** (Einheit gefallen, Fund, Ankunft) gibt `step` als Liste zurück. Das Log, Effekte und die Rückkehr-Zusammenfassung lesen sie.

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
  site: SiteState;              // aktuelle Futterstelle (Typ, Vorrat, Größe …)
  map: { candidates: SiteCandidate[]; route: RoutePoint[]; range: number };
  genome: { owned: string[] };  // IDs der Adaptionen
  finds: { collected: Record<string, number>; badges: string[]; buffs: Buff[] };
  auto: { enabled: boolean; strategy: Strategy; threshold: number; priority: Priority };
  stats: Stats;                 // Summen für Zusammenfassung und Erfolge
  settings: Settings;
}
```

Save-Version 1 enthält nach Entscheidung des Product Owners nur `version`, `seed`, `rngState`, `time`, `era`, `res` und `units`. Der Rest des Entwurfs kommt mit den jeweiligen Mechaniken über Migrationen.

IDs in `data/` (Einheiten, Adaptionen, Futterstellentypen, Funde) sind **stabil**. Spielstände speichern nur IDs, keine Texte oder Werte.

## 4. Simulation

| Aspekt | Lösung |
|---|---|
| Logik-Takt | fest **10 Hz** (`dt` = 100 ms), unabhängig von der Framerate; Akkumulator-Pattern im GameLoop |
| Rendering | `requestAnimationFrame`, liest nur den State; pausiert bei `document.hidden` |
| Klicks | Kommandos werden sofort angewendet, nicht erst im nächsten Tick |
| Determinismus | Zufall nur über den seeded RNG im State (z. B. mulberry32). Gleicher Seed + gleiche Kommandos an gleicher Position zwischen den Ticks ⇒ gleiches Ergebnis. Grundlage für Tests, Modell-Seite und gegen Save-Scumming |
| Offline-Catch-up | Beim Laden wird `Δt = now − lastSaved` (gedeckelt, Start 24 h) nachgeholt. Das geschieht in **adaptiven Schritten**: große Schritte (z. B. 10 s), die an Ereignisgrenzen (Futterstelle leer, Nahrung reicht für Brut, Auto-Weiterziehen) verkürzt werden. Ergebnis ≈ Echtzeit-Simulation; ein Test sichert die Toleranz ab |
| Hintergrund-Tab | Browser drosseln Timer, daher erkennt der GameLoop große Zeitsprünge und nutzt dafür ebenfalls den Catch-up |
| Performance-Budget | `step` < 2 ms auf einem Mittelklasse-Smartphone; Catch-up für 24 h < 1 s |

## 5. Mathematisches Modell & Modell-Seite

### 5.1 Grundsatz

Es gibt **eine einzige Quelle der Wahrheit** für Formeln: `core/balance`. Spiel, Offline-Catch-up, Headless-Runner und Modell-Seite rufen dieselben Funktionen auf. Die Modell-Seite enthält keine Kopie der Spiellogik.

### 5.2 Modellgrößen (Entwurf für spätere Größen)

> Für M1.1 ist die [Game-Design-Spezifikation](game-design.md) maßgeblich. Die Tabelle bleibt als Entwurf für spätere Größen stehen; bei Abweichungen gilt die Spezifikation.

| Größe | Formel (Entwurf) |
|---|---|
| Nahrung/s durch Drohnen | `F_d = min(D · r_d · M_sammeln, Abbau-Grenze des Vorrats)` |
| Klickertrag | `F_k = k_0 · M_klick` |
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
interface Bot { name: string; decide(state: GameState, view: Derived): Command[] }
runSimulation({ seed, params, bot, duration, sampleEvery }): SimResult
// SimResult: Zeitreihen (Ressourcen, Einheiten, Raten), Ereignisse, Kennzahlen
```

- Der Runner läuft im **Web Worker**, damit die Modell-Seite flüssig bleibt; in Vitest läuft er direkt.
- Bots: **Aktiv** (Klicks mit realistischer Rate, kauft das Beste), **Idle** (nur Pheromone und Strategie, schaut alle X h vorbei), **Drohnen-lastig**, **Soldaten-lastig**.
- `params` überschreibt Konstanten aus `core/balance`. So testet die Modell-Seite Varianten, ohne Code zu ändern.

### 5.4 Kennzahlen

| Kennzahl | Bedeutung |
|---|---|
| Ressourcen, Einheiten und Raten über die Zeit | Wachstumsverlauf (log-Achse) |
| Wachstumsrate | Verdopplungszeit der Nahrungsrate; zeigt, ob Wachstum abflacht oder explodiert |
| **Zeit bis zur nächsten Entscheidung** | Zeit, bis wieder ein sinnvoller Kauf, eine Adaption oder ein Weiterzug möglich ist |
| Anteil Wartezeit | Anteil der Zeit, in der der Aktiv-Bot nichts tun kann |
| Dauer und Ertrag je Futterstelle | Rhythmus der kleinen Ascension |
| Soldaten-Bilanz | Soldaten vor/nach Einnahme, Verluste; erkennt Sackgassen |
| Amortisation je Upgrade | Kosten ÷ zusätzlicher Ertrag/s |
| Freischalt-Zeitpunkte | Wann wird welche Mechanik erstmals relevant |

### 5.5 Aufbau der Modell-Seite

```
┌ Parameter ─────┐ ┌ Diagramme ──────────────────────────────────────┐
│ Seed           │ │ [Ressourcen] [Raten] [Entscheidungen] [Zyklen]  │
│ Dauer 1h…7d    │ │ [Upgrades]                                      │
│ Bots ☑☑☐☐      │ │  ▁▂▃▅▇  log ▾  ─ Zielband ░░                    │
│ Konstanten …   │ │  Markierungen: ▲ Weiterzug ● Adaption ✦ Fund    │
│ [Basislauf] [▶]│ ├ Warnungen ──────────────────────────────────────┤
│ [JSON export]  │ │ ⚠ 00:42 Aktiv: 12 min ohne Entscheidung         │
└────────────────┘ └─────────────────────────────────────────────────┘
```

- Erreichbar unter `/modell`. Im Produktiv-Build ist die Seite nur per Flag erreichbar (z. B. `?dev`) und nicht verlinkt.
- **Vergleich:** Ein gespeicherter Basislauf und der aktuelle Lauf liegen übereinander.
- **Zielbänder:** Die Pacing-Ziele aus dem [Projektplan](projektplan.md#35-pacing-ziele-vorläufig) liegen als Konfiguration in `core/balance/targets.ts` und werden als Flächen angezeigt. Verletzungen landen in der Warnliste.

### 5.6 Balancing als Test

Feste Bot-Läufe (Seed, Dauer) laufen in Vitest. Ihre Kennzahlen werden als Snapshot mit Toleranz verglichen. Ändert eine Anpassung das Pacing ungewollt, schlägt der Test fehl. Gewollte Änderungen aktualisieren den Snapshot bewusst.

## 6. Spieldaten

- **Data-driven** als typisierte TS-Dateien in `core/data/`. Es gibt keine externe Tabelle (anders als Swarm Simulator mit Google Sheets). Typprüfung und Refactoring bleiben so möglich.
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

- Texte liegen getrennt in `texts.de.ts` und sind über die ID verknüpft.
- Die Positionen im radialen Genom (Winkel, Radius) gehören zu den UI-Daten in `ui/genome`, nicht in `core`.

## 7. Persistenz

| Aspekt | Lösung |
|---|---|
| Speicherort | `localStorage`, Schlüssel `idleswarm.save`; zusätzlich ein Backup-Slot des vorletzten Stands und der Slot `idleswarm.save.unreadable`: Ein unlesbarer Primär-Stand wird beim nächsten Speichern dorthin verschoben statt überschrieben |
| Format | JSON → komprimiert (`lz-string`) → Base64; `Num` als String serialisiert |
| Autosave | alle 30 s (einstellbar), bei `visibilitychange` (hidden) und `pagehide` |
| Versionierung | Feld `version`; beim Laden läuft die Migrationskette aus der Registry `MIGRATIONS` in `migrations/index.ts` (noch leer, aktuell Version 1) |
| Robustheit | Validierung beim Laden. Bei einem Fehler wird der Backup-Slot geladen und der Spieler informiert |
| Export/Import | derselbe String zum Kopieren; Import validiert und migriert |
| Später | Cloud-Sync optional (Querschnittsthema), ohne Änderung am Format |

## 8. Rendering & Umsetzung von K2

### 8.1 Ebenen und Kamera

Die Umsetzung folgt [`docs/mockups/k2-zoom.html`](mockups/k2-zoom.html) (`setMode`, `applyCamera`):

| Ebene | Inhalt | Technik |
|---|---|---|
| `#sonar` (z = 1) | Umgebung / Weiterziehen | SVG, startet mit `scale(6)` und `opacity: 0` |
| `#world` (z = 2) | Schwarm-Szene | Canvas; im Kartenmodus per `scale` und `clip-path: circle()` zum Punkt verkleinert |
| `#genome` (z = 3) | Zellkern mit radialem Genom | SVG; im Genommodus wird die Welt vergrößert, `blur` und abgedunkelt |

- Der Modus ist ein Signal im GameStore (`'map' | 'scene' | 'gen'`). Die Shell-Komponente setzt `data-mode` am Container, CSS übernimmt die Übergänge.
- Zoom-Leiste, Titel je Modus und Detailpanels hängen am Modus-Signal.

### 8.2 Szene (Canvas)

- **Agenten-Budget:** maximal ~300 Sprites (mobil ~150). Bei mehr Einheiten steht ein Sprite für `n` Einheiten, die Verteilung auf die Typen bleibt proportional.
- **DPR:** Die Canvas-Größe wird mit `devicePixelRatio` skaliert (gedeckelt auf 2).
- Glow (`shadowBlur`) ist teuer. Deshalb werden Sprites vorgerendert (Offscreen-Canvas) und nur kopiert.
- Klick-Partikel und Floating Numbers: Partikel im Canvas, Zahlen als DOM-Elemente (wie im Mockup).

### 8.3 Eingabe

| Eingabe | Desktop | Mobile |
|---|---|---|
| Moduswechsel | Mausrad (mit Sperre ~900 ms), Tasten `W` / `G` / `Esc`, Zoom-Leiste | Pinch (Schwellwert), Zoom-Leiste, Zurück-Knopf |
| Sammeln | Klick auf Futterstelle | Tippen (Multi-Touch erlaubt) |
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

## 9. Zahlenformatierung

- `Num`-Formatierung in `core/num/format.ts`, deutsch:
  - unter 1 Mio.: ganze Zahlen mit Tausenderpunkt (`1.284`), Raten mit einer Nachkommastelle (`3,2`)
  - ab 1 Mio.: Kurzformen `Mio.`, `Mrd.`, `Bio.`, `Brd.`, `Trio.`, `Trd.` (< 1e24)
  - danach wissenschaftliche Notation (`1,23e45`)
  - Kurzformen und wissenschaftliche Notation: zwei Nachkommastellen, kaufmännisches Runden mit Übertrag
- Einstellbar: Kurzformen / wissenschaftlich / technisch.

## 10. Qualitätssicherung

| Ebene | Maßnahme |
|---|---|
| Core | Unit-Tests mit Vitest für alle Regeln und Formeln; Ziel ≥ 85 % Abdeckung in `core/` |
| Determinismus | Test: gleicher Seed + gleiche Kommandos ⇒ identischer State |
| Offline-Catch-up | Test: Catch-up vs. Echtzeit-Simulation innerhalb einer Toleranz |
| Saves | Test je Migration mit eingefrorenen Beispiel-Spielständen |
| Balancing | Snapshot-Tests der Kennzahlen (Abschnitt 5.6) |
| UI | Komponententests für zentrale Komponenten (Kaufknopf, Detailpanels) |
| E2E | Playwright-Smoke: Start, Klick, Kauf, Moduswechsel, Weiterziehen; Viewports Desktop und Smartphone |
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
| ADR-001 | Angular (zoneless, Signals) als Framework; Spiellogik in Angular-freiem `core/` |
| ADR-002 | `break_infinity.js` hinter eigenem `Num`-Typ |
| ADR-003 | Fester Logik-Takt 10 Hz, getrennt vom Rendering; seeded RNG |
| ADR-004 | Unveränderlicher State, Kommandos als reine Funktionen |
| ADR-005 | Speicherformat: komprimiertes JSON in `localStorage`, versioniert mit Migrationskette |
| ADR-006 | Canvas 2D für die Szene, SVG für Karte und Genom, CSS-Übergänge für K2 |
| ADR-007 | Modell-Seite mit ECharts nutzt dieselbe Logik wie das Spiel; Balancing-Snapshots als Tests |
| ADR-008 | Kein Backend; Hosting auf GitHub Pages |
