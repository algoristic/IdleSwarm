# Architektur-Entscheidungen (ADRs)

Die Entscheidungen stammen aus dem [technischen Konzept](../technisches-konzept.md#12-architektur-entscheidungen-adrs). Stand der Umsetzung: 21.11.2026.

| Nr | Entscheidung | Status | Umsetzung |
|---|---|---|---|
| [ADR-001](001-angular-zoneless-core.md) | Angular (zoneless, Signals); Spiellogik in Angular-freiem `core/` | Angenommen; Schichtentabelle ersetzt durch ADR-009 | umgesetzt |
| [ADR-002](002-break-infinity-num.md) | `break_infinity.js` hinter eigenem `Num`-Typ | Angenommen | umgesetzt |
| [ADR-003](003-fester-logik-takt-seeded-rng.md) | Fester Logik-Takt 10 Hz, getrennt vom Rendering; seeded RNG | Angenommen | Kern und GameLoop umgesetzt; RNG im Generator genutzt (M1.2), zweiter Strom `finds.rngState` für Funde (M1.3); Nachholen im Takt bei verborgenem Tab (AP 1.4.6); Offline-Catch-up mit gemeinsamer Obergrenze 24 h (AP 1.5.1) |
| [ADR-004](004-unveraenderlicher-state-kommandos.md) | Unveränderlicher State, Kommandos als reine Funktionen | Angenommen | Mechanik, GameStore, Kommandos und Ereignisse von M1.1 bis M1.3 umgesetzt (`applyCommand`, Ereignis-Log); Kommandos für Einstellungen und Hinweise, Freischaltungen nach Kommandos (M1.5) |
| [ADR-005](005-speicherformat-localstorage.md) | Komprimiertes JSON in `localStorage`, versioniert mit Migrationskette | Angenommen | `persistence/domain` und Autosave umgesetzt, Spielstand Version 5 (Migration 4→5 erhält den Stand, M1.5); Autosave-Intervall aus den Einstellungen, Export, Import und Zurücksetzen in den Einstellungen umgesetzt (AP 1.5.2, 1.5.3) |
| [ADR-006](006-rendering-canvas-svg-css.md) | Canvas 2D für die Szene, SVG für Karte und Genom, CSS-Übergänge für K2 | Angenommen | SVG-Sonar-Karte (AP 1.2.8), SVG-Genom (AP 1.3.3), K2-Ebenen mit Modus = Route und Canvas-Szene (M1.4) umgesetzt; Profiling auf echten Geräten offen |
| [ADR-007](007-modell-seite-echarts-balancing.md) | Modell-Seite mit ECharts nutzt dieselbe Logik wie das Spiel; Balancing-Snapshots als Tests | Angenommen | Runner, vier Bots, Modell-Seite, Zyklen und Stillstand (AP 1.2.9), Parameter je ID, Zielbänder, Upgrade-Tabelle und DNA-Fluss (M1.3) umgesetzt; Snapshots ab AP 1.5.5 |
| [ADR-008](008-kein-backend-github-pages.md) | Kein Backend; Hosting auf GitHub Pages | Angenommen | umgesetzt; PWA umgesetzt (AP 1.5.6, ADR-015) |
| [ADR-009](009-domaenen-schichten-facade.md) | Domänen mit Schichten; Signal-Store mit Facades, kein NgRx | Angenommen | umgesetzt (AP 1.1.10); Domäne `sonar` und `site/ui` in M1.2, Domänen `genome` und `finds` in M1.3, `shell` und `scene` in M1.4 |
| [ADR-010](010-tailwind-tokens.md) | Tailwind CSS v4 mit semantischen Tokens; K2-Ebenen in Komponenten-CSS | Angenommen | HUD und Modell-Seite umgesetzt (AP 1.1.10), Genom-Tokens (AP 1.3.3), K2-Shell (AP 1.4.1), Palette K2-K (AP 1.4.3), Varianten `desktop:` und `motion-reduced:` (M1.4) |
| [ADR-011](011-i18n-localize.md) | Texte über `@angular/localize`; Übersetzung später | Angenommen | umgesetzt (AP 1.1.10); Übersetzung offen |
| [ADR-012](012-signal-forms.md) | Formulare mit Signal Forms (`@angular/forms/signals`) | Angenommen | umgesetzt (AP 1.1.10) |
| [ADR-013](013-webfont-nunito.md) | Webfont Nunito (variabel, latin + latin-ext) selbst gehostet | Angenommen | umgesetzt (AP 1.4.3); Vorab-Cache im Service Worker (AP 1.5.6) |
| [ADR-014](014-dialog-nativ.md) | Modale Dialoge mit dem nativen `<dialog>` (`showModal()`), keine neue Abhängigkeit | Angenommen | `ModalDialogComponent`, Rückkehr-Zusammenfassung (AP 1.5.1) und Dialog „Einstellungen“ mit Bestätigungen für Import und Zurücksetzen (AP 1.5.2, 1.5.3) umgesetzt |
| [ADR-015](015-pwa-service-worker.md) | PWA mit `@angular/service-worker` (Vorab-Cache, Manifest, Update-Hinweis) | Angenommen | umgesetzt (AP 1.5.6); Offline-Test im Browser offen |
