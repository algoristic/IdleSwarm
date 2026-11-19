# Architektur-Entscheidungen (ADRs)

Die Entscheidungen stammen aus dem [technischen Konzept](../technisches-konzept.md#12-architektur-entscheidungen-adrs). Stand der Umsetzung: 19.11.2026.

| Nr | Entscheidung | Status | Umsetzung |
|---|---|---|---|
| [ADR-001](001-angular-zoneless-core.md) | Angular (zoneless, Signals); Spiellogik in Angular-freiem `core/` | Angenommen; Schichtentabelle ersetzt durch ADR-009 | umgesetzt |
| [ADR-002](002-break-infinity-num.md) | `break_infinity.js` hinter eigenem `Num`-Typ | Angenommen | umgesetzt |
| [ADR-003](003-fester-logik-takt-seeded-rng.md) | Fester Logik-Takt 10 Hz, getrennt vom Rendering; seeded RNG | Angenommen | Kern und GameLoop umgesetzt; RNG im Generator genutzt (M1.2); Catch-up ab AP 1.5.1 |
| [ADR-004](004-unveraenderlicher-state-kommandos.md) | Unveränderlicher State, Kommandos als reine Funktionen | Angenommen | Mechanik, GameStore, Kommandos und Ereignisse von M1.1 und M1.2 umgesetzt (`applyCommand`, Ereignis-Log) |
| [ADR-005](005-speicherformat-localstorage.md) | Komprimiertes JSON in `localStorage`, versioniert mit Migrationskette | Angenommen | `persistence/domain` und Autosave umgesetzt, Spielstand Version 3; Export und Import in AP 1.5.2 |
| [ADR-006](006-rendering-canvas-svg-css.md) | Canvas 2D für die Szene, SVG für Karte und Genom, CSS-Übergänge für K2 | Angenommen | SVG-Sonar-Karte umgesetzt (AP 1.2.8); Genom ab AP 1.3.3, K2-Ebenen und Szene ab M1.4 |
| [ADR-007](007-modell-seite-echarts-balancing.md) | Modell-Seite mit ECharts nutzt dieselbe Logik wie das Spiel; Balancing-Snapshots als Tests | Angenommen | Runner, vier Bots, Modell-Seite, Zyklen und Stillstand umgesetzt (AP 1.2.9); Zielband ab AP 1.3.7, Snapshots ab AP 1.5.5 |
| [ADR-008](008-kein-backend-github-pages.md) | Kein Backend; Hosting auf GitHub Pages | Angenommen | umgesetzt; PWA in AP 1.5.6 |
| [ADR-009](009-domaenen-schichten-facade.md) | Domänen mit Schichten; Signal-Store mit Facades, kein NgRx | Angenommen | umgesetzt (AP 1.1.10); Domäne `sonar` und `site/ui` in M1.2 |
| [ADR-010](010-tailwind-tokens.md) | Tailwind CSS v4 mit semantischen Tokens; K2-Ebenen in Komponenten-CSS | Angenommen | HUD und Modell-Seite umgesetzt (AP 1.1.10); K2-Shell ab M1.4 |
| [ADR-011](011-i18n-localize.md) | Texte über `@angular/localize`; Übersetzung später | Angenommen | umgesetzt (AP 1.1.10); Übersetzung offen |
| [ADR-012](012-signal-forms.md) | Formulare mit Signal Forms (`@angular/forms/signals`) | Angenommen | umgesetzt (AP 1.1.10) |
