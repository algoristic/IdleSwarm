# ADR-010: Tailwind CSS v4 mit semantischen Tokens, K2-Ebenen in Komponenten-CSS

**Status:** Angenommen
**Datum:** 2026-11-18

## Kontext

Heute hat jede Komponente eigenes Plain CSS (rund 560 Zeilen für HUD und Modell-Seite) mit Variablen `--hud-*` in `src/styles.css`. Ab M1.4 kommen viele Oberflächenteile hinzu: HUD im K2-Stil, Schubladen, Detailpanels, Log, Bottom-Sheets und drei Breakpoints ([Konzept §8.4](../technisches-konzept.md#84-responsives-layout)). Dazu kommen die K2-Ebenen mit Kamera-Übergängen (`transform`, `clip-path: circle()`, `filter`), die aus dem Platz berechnete Größe `--ms` und SVG-Animationen ([Mockup K2](../mockups/k2-zoom.html), Grafik nach [K2-K](../mockups/k2-kurzgesagt.html), ADR-006).

Als Vorbild dient PortfoliGo: Tailwind v4, semantische Tokens, keine Arbitrary Values, Komponenten-Styles nur für Sonderfälle.

## Entscheidung

- Styling verwendet **Tailwind CSS v4** (Entwicklungsabhängigkeit, eingebunden über PostCSS im Angular-Build).
- `src/styles.css` ist das einzige globale Stylesheet. Es definiert die **`--sw-*`-Tokens** aus der Palette des UI-Leitbilds ([K2-K](../mockups/k2-kurzgesagt.html)), bildet sie über `@theme inline` auf Tailwind-Farben ab und schaltet die Standardpalette ab. Die bisherigen `--hud-*`-Variablen gehen darin auf.
- Templates verwenden Utilities; Farben nur aus Tokens, **keine Arbitrary Values** für HUD, Panels, Schubladen und Formulare.
- **Ausnahme K2:** Ebenen, Kamera, Moduswechsel, `--ms`, SVG-Animationen und Canvas-Container stehen in Komponenten-CSS, auch mit freien Werten. Wiederkehrende Werte (Dauern, Easing, Schlagschatten, Cel-Schatten) werden zu Tokens. Utilities reagieren auf den Modus über eigene Varianten (`@custom-variant`, z. B. `mode-map:` für `[data-mode=map]`).
- Der Canvas liest Farben aus den Token-Variablen, nicht aus Literalen.
- Details stehen in [`CLAUDE.md` §4](../../CLAUDE.md#4-styling).

### Umsetzungsstand

**Umgesetzt** in [AP 1.1.10](../projektplan.md#m11--kernschleife--modell):

- Tailwind CSS 4.3.5 über [`.postcssrc.json`](../../.postcssrc.json). [`src/styles.css`](../../src/styles.css) definiert die `--sw-*`-Tokens der K2-Palette, die Diagrammfarben `--sw-chart-*`, die Varianten `mode-map:`, `mode-scene:`, `mode-gen:` und `current:` sowie Rasterspalten als Theme-Werte (`grid-cols-stats`, `grid-cols-model` …).
- HUD und Modell-Seite verwenden nur Utilities; es gibt keine Komponenten-CSS-Dateien mehr. Zustände wie die Platzwarnung laufen über `data-*`-Attribute und Varianten (`data-warning:`).
- Die Diagramme der Modell-Seite lesen ihre Farben über das Token `CHART_PALETTE` einmal aus den CSS-Variablen ([`chart-theme.ts`](../../src/app/model/ui/echart/chart-theme.ts)).
- Seit AP 1.3.3 gibt es die Genom-Tokens aus dem Mockup K2-K (`--sw-branch-*`, `--sw-nucleus`, `--sw-membrane`, `--sw-organelle`, `--sw-cell`, `--sw-locked*`, `--sw-cost-muted*`) und die Schriftgröße `--text-2xs`. Die Genom-Ansicht nutzt Utilities; nur Membran, Pulsring und Beschriftungskontur stehen nach der K2-Ausnahme in [`genome-tree.component.css`](../../src/app/genome/ui/genome-tree/genome-tree.component.css), wie Sweep und Routenfluss der Sonar-Karte.

- Seit AP 1.4.3 tragen die Basis-Tokens die Palette von K2-K; die Namen sind geblieben. `--sw-glass` ist eine massive Fläche (gleich `--sw-surface`). Neu sind `--sw-well`, `--sw-ink`, `--sw-primary` (mit `-hover`, `-shade`), `--sw-violet-light`, die Schatten `--sw-drop`, `--sw-shade`, `--sw-panel`, `--sw-button*` (Utilities `shadow-drop`, `shadow-shade`, `inset-shadow-shade`, `shadow-panel`, `shadow-button*`), `--sw-ease-pop` (`ease-pop`) und die Körnung `--sw-grain` mit der Utility `grain`. Koralle, Pink und Violett des Mockups sind als Text zu dunkel; `--sw-danger` und `--sw-magenta` sind leicht aufgehellt, `--sw-violet` ist der helle Ton `--sw-violet-light`. Gleiche Werte verweisen per `var()` aufeinander (`getComputedStyle` liefert sie aufgelöst, auch für Canvas und Diagramme). Die Diagrammfarben `--sw-chart-*` sind unverändert und haben auf allen Flächen mindestens 3:1. Die Schrift Nunito regelt [ADR-013](013-webfont-nunito.md).

**Offen:** Kamera-Bedienung (AP 1.4.4) und HUD-Komponenten im K2-K-Stil (AP 1.4.3, weitere Teile).

## Konsequenzen

- Layout, Abstände und Breakpoints der vielen HUD-Teile ab M1.4 entstehen direkt im Template; Mobile-Varianten (`md:`, `lg:`) bleiben an der Stelle, an der sie wirken.
- Farben sind zentral; eine spätere Ära-Palette (AS3+) ist ein Satz neuer Token-Werte, kein Umbau aller Komponenten.
- Die K2-Ausnahme hält die Kamera-Technik dort, wo sie im Mockup erprobt ist, und vermeidet lange Klassenketten mit freien Werten.
- Negativ: zwei Styling-Orte (Utilities und Komponenten-CSS für K2). Die Grenze ist in `CLAUDE.md` festgelegt.
- Negativ: Angulars Komponenten-Styles sind ungelayert und schlagen Utilities. Deshalb setzt die Host-Klasse das `display`, nie `:host`.
- Negativ: Klassennamen müssen vollständig im Quelltext stehen; zusammengesetzte Namen erkennt Tailwind nicht.

## Verworfene Alternativen

- **Plain CSS wie bisher:** funktioniert, wächst aber mit jeder Komponente und dupliziert Abstände, Breakpoints und Farben.
- **Sass:** bringt Mixins und Variablen, die Tokens und Utilities bereits abdecken; zusätzliche Build-Abhängigkeit.
- **Tailwind ohne K2-Ausnahme:** Kamera-Übergänge mit `clip-path`, Skalierungen und `--ms` wären nur als Arbitrary Values ausdrückbar und schwer lesbar.
- **UI-Framework (Angular Material o. Ä.):** passt nicht zur eigenständigen K2-Optik.
