---
paths:
  - "src/app/shell/**"
---

# Shell (K2-Ebenen und Kamera)

Die K2-Shell (AP 1.4.1, US-08.01, TK §8.1) setzt Szene, Umgebung und Genom zu einer Zoom-Welt nach [Mockup K2-K](../../docs/mockups/k2-kurzgesagt.html) zusammen (`.layer`, `#sonar`, `#world`, `#genome`, `applyCamera`, `layout`, `setMode`). Modus = Route: `/` Szene (`scene`), `/umgebung` Karte (`map`), `/genom` Genom (`gen`). `/modell` liegt außerhalb der Shell.

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `shell/domain/models/shell-mode.model.ts` | `SHELL_MODES` (`map`, `scene`, `gen` in Zoom-Reihenfolge), `ShellMode`, `ZoomDirection` (`out`/`in`), `ViewportSize`, `WorldCamera`, `WorldCameraStyle` |
| `shell/domain/shell-mode-logic.ts` | `SHELL_MODE_PATHS` (Modus ↔ Pfad), `shellModeFromPath` (Unbekanntes → `scene`), `neighborMode` (Nachbarmodus fürs Mausrad ab AP 1.4.4, `null` am Ende) |
| `shell/domain/shell-camera-logic.ts` | UI-Konstanten der Kamera (keine Spielbalance): `STAGE_SIZE_MIN` 360, `STAGE_HEIGHT_SHARE` 0,86, `STAGE_SIDE_RESERVE` 720, `STAGE_GUTTER` 16, `MAP_CLIP_RADIUS` 300, `MAP_BRIGHTNESS`, `GENOME_SCALE` 2,8, `GENOME_BLUR` 7, `GENOME_BRIGHTNESS` 0,4; `stageSize` (`--ms`), `worldCamera`, `worldCameraStyle` |
| `shell/feature/shell.routes.ts` | `shellRoutes`: Elternroute `''` mit `ShellPage` und den Providers von Shell, Szene, HUD, Sonar und Genom; je Modus eine Kindroute ohne Komponente (`children: []`, `pathMatch: 'full'`). Lazy in `app.routes.ts` |
| `shell/feature/shell/shell.page.{ts,html,css}` | `ShellPage`: `<main class="shell" data-mode>` mit `--ms`; Ebenen Sonar (`SonarLayerComponent`), Welt (`SceneWorldComponent` aus `scene/feature`, Regeldatei `scene`; Kamera als Inline-Stil), Genom (`GenomeLayerComponent`); Overlays `SceneHudComponent`, `SonarOverlayComponent`, `GenomeOverlayComponent` (rechte Spalte, scrollbar); immer sichtbar: Titel, `ResourcesPanelComponent` (oben links), Zoom-Leiste (links), Zurück-Knopf (nicht in der Szene) |
| `shell/feature/state/shell.facade.ts` | `ShellFacade`: `mode` (aus dem Router per `toSignal` auf `NavigationEnd`; Startwert aus `currentNavigation`), `layout` (`ShellLayoutView`), `setMode(mode)` navigiert. Viewport-Größe über `VIEWPORT` (`shared/data-access/platform`), Listener über `DestroyRef` abgemeldet |
| `shell/feature/state/shell.utils.ts`, `shell.model.ts` | `shellModeFromUrl`, `toShellLayout` (rein); `ShellLayoutView` (`stageSize` als CSS-Wert, `world`) |
| `shell/ui/zoom-bar/` | `ZoomBarComponent`: Umgebung/weiterziehen, Schwarm/Futterstelle, Genom/„x DNA“ mit Badge bezahlbarer Adaptionen (ICU für Screenreader); aktiver Eintrag mit `aria-current="page"`; Output `selectedMode` |

## Besonderheiten

- Dieselbe `ShellPage`-Instanz bleibt über alle drei Pfade bestehen (gleiche Elternroute, Kindrouten ohne Komponente), sonst liefen keine CSS-Übergänge. Neue Modi brauchen nur einen Eintrag in `SHELL_MODES` und `SHELL_MODE_PATHS`.
- Ebenen, Kamera und Übergänge stehen nach der K2-Ausnahme (CLAUDE.md §4) in `shell.page.css`; Dauern und Easing als Tokens `--sw-zoom-duration`, `--sw-zoom-fade-duration`, `--sw-ease-zoom`, `--sw-zoom-reduced-duration` in `src/styles.css`. Bei `prefers-reduced-motion: reduce` gibt es keine Kamerafahrt, nur eine kurze Überblendung der Ebenen (Schalter und Feinheiten in AP 1.4.6).
- Kamera der Welt: Szene `scale(1)`; Karte schrumpft die Welt auf die eigene Position der Sonar-Karte (Ausschnitt `MAP_CLIP_RADIUS` mal Skalierung = `HERE_RADIUS` aus `sonar/domain` im Maßstab `--ms`/`MAP_SIZE`), Helligkeit 1,15; Genom `scale(2.8)`, `blur(7px)`, `brightness(0.4)`. `clip-path` hat in allen Modi die Form `circle(r at x y)`, damit es überblendet.
- `--ms` (`stageSize`): Mockup-Formel `max(360, min(h · 0,86, w − 720))`, auf ganze Pixel abgerundet und nie breiter als der Viewport minus 2 · 16 px. Sonar- und Genom-Ebene setzen ihre Bühne auf `--ms` × `--ms`, damit das Zentrum der Karte bzw. des Zellkerns in der Viewport-Mitte liegt; die Legenden ragen darunter.
- Sichtbarkeit je Modus: Overlays über die Varianten `mode-scene:`/`mode-map:`/`mode-gen:` (`opacity-0 pointer-events-none` → `opacity-100 pointer-events-auto`), Ebenen über `.shell[data-mode=…]`. Nicht aktive Ebenen und Overlays tragen zusätzlich `inert` (Tab-Fokus und Screenreader); die Welt ist nur im Genom-Modus inert.
- Die Szene zeichnet die Futterstelle in die Viewport-Mitte; dorthin schrumpft die Kamera im Kartenmodus. Die Welt-Ebene ist `fixed inset-0`, der Canvas füllt sie.
- Die Körnung (`grain`-Utility aus `src/styles.css`, Mockup `body::after`) liegt als `div` mit `z-4` über den Ebenen (z ≤ 3) und unter den Overlays (z = 10).
- Klick auf die Welt im Kartenmodus führt zur Szene zurück (`shell.world.back`, nur im Kartenmodus, `tabindex="-1"`; der Tastaturweg ist der Zurück-Knopf).
- Mausrad, Tasten W/G/Esc und Pointer kommen in AP 1.4.4; die Zoom-Leiste zeigt deshalb noch keine Hinweiszeile.
- Test-IDs: `shell.root`, `shell.layer.{map,scene,gen}`, `shell.overlay.{scene,map,gen}`, `shell.world.back`, `shell.back`, `shell.zoom.{map,scene,gen,gen-dna,gen-count}`.
