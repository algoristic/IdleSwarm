# Architektur-Entscheidungen (ADRs)

Die Entscheidungen stammen aus dem [technischen Konzept](../technisches-konzept.md#12-architektur-entscheidungen-adrs). Stand der Umsetzung: 18.11.2026.

| Nr | Entscheidung | Status | Umsetzung |
|---|---|---|---|
| [ADR-001](001-angular-zoneless-core.md) | Angular (zoneless, Signals); Spiellogik in Angular-freiem `core/` | Angenommen | umgesetzt |
| [ADR-002](002-break-infinity-num.md) | `break_infinity.js` hinter eigenem `Num`-Typ | Angenommen | umgesetzt |
| [ADR-003](003-fester-logik-takt-seeded-rng.md) | Fester Logik-Takt 10 Hz, getrennt vom Rendering; seeded RNG | Angenommen | Kern und GameLoop umgesetzt; Catch-up ab AP 1.5.1 |
| [ADR-004](004-unveraenderlicher-state-kommandos.md) | Unveränderlicher State, Kommandos als reine Funktionen | Angenommen | Mechanik, GameStore und Kommandos von M1.1 umgesetzt; Ereignisse ab M1.2 |
| [ADR-005](005-speicherformat-localstorage.md) | Komprimiertes JSON in `localStorage`, versioniert mit Migrationskette | Angenommen | `core/save/` und Autosave umgesetzt; Export und Import in AP 1.5.2 |
| [ADR-006](006-rendering-canvas-svg-css.md) | Canvas 2D für die Szene, SVG für Karte und Genom, CSS-Übergänge für K2 | Angenommen | geplant, ab AP 1.2.8 |
| [ADR-007](007-modell-seite-echarts-balancing.md) | Modell-Seite mit ECharts nutzt dieselbe Logik wie das Spiel; Balancing-Snapshots als Tests | Angenommen | Runner, Bots und Modell-Seite umgesetzt; Zielband ab AP 1.3.7, Snapshots ab AP 1.5.5 |
| [ADR-008](008-kein-backend-github-pages.md) | Kein Backend; Hosting auf GitHub Pages | Angenommen | umgesetzt; PWA in AP 1.5.6 |
