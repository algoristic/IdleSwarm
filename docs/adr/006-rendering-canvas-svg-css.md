# ADR-006: Canvas 2D für die Szene, SVG für Karte und Genom, CSS-Übergänge

**Status:** Angenommen
**Datum:** 2026-11-18

## Kontext

Die Oberfläche folgt dem Mockup [K2](../mockups/k2-zoom.html) in der Grafik von [K2-K · Kurzgesagt-Stil](../mockups/k2-kurzgesagt.html): drei Ebenen, zwischen denen gezoomt wird. Die Szene zeigt einige hundert flach schattierte Sprites; Karte und Genom bestehen aus interaktiven Knoten ([Konzept §2](../technisches-konzept.md#2-technologie-stack), [§8](../technisches-konzept.md#8-rendering--umsetzung-von-k2)).

## Entscheidung

- **Szene:** Canvas 2D, außerhalb des Template-Systems.
- **Karte und Genom:** SVG in Angular-Templates, mit Klickflächen und Styling über CSS.
- **Übergänge:** CSS (`transform`, `clip-path`, `filter`, `opacity`). Der Modus ist die Route (`/` Szene, `/umgebung` Karte, `/genom` Genom), die Shell setzt `data-mode` am Container. (Ursprünglich als Signal im GameStore geplant; in M1.4 durch die Route ersetzt, siehe Umsetzungsstand.)
- **Budget der Szene:** maximal ~300 Sprites (mobil ~150). Bei mehr Einheiten steht ein Sprite für `n` Einheiten, die Verteilung auf die Typen bleibt proportional.
- `devicePixelRatio` wird auf 2 gedeckelt. Sprites werden vorgerendert und nur kopiert.

### Umsetzungsstand

**Umgesetzt:**

- SVG-Sonar-Karte (AP 1.2.8): [`sonar-map.component.html`](../../src/app/sonar/ui/sonar-map/sonar-map.component.html) zeichnet Distanzringe, Reichweite, Sweep, bisherige Route, Ziele, Route und Reiselinie als SVG im Angular-Template, ohne neue Abhängigkeit. Die Geometrie rechnet [`sonar-map-logic.ts`](../../src/app/sonar/domain/sonar-map-logic.ts) rein und Angular-frei; Ziele sind fokussierbare Knöpfe. Sweep und Routenfluss sind CSS-Animationen in Komponenten-CSS (K2-Ausnahme) und stehen bei reduzierter Bewegung still. Seit AP 1.4.1 liegt die Karte in der Sonar-Ebene der Shell.
- SVG-Genom (AP 1.3.3): [`genome-tree.component.html`](../../src/app/genome/ui/genome-tree/genome-tree.component.html) zeichnet den radialen Baum im Zellkern (Membran, Organellen, gebogene Äste, Knoten mit Statusdarstellung, Kostenschilder) als SVG im Angular-Template, ohne neue Abhängigkeit. Die Geometrie rechnet [`genome-tree-logic.ts`](../../src/app/genome/domain/genome-tree-logic.ts) rein und Angular-frei, die Positionen stehen als UI-Daten in [`genome-tree.layout.ts`](../../src/app/genome/ui/genome-tree/genome-tree.layout.ts). Knoten sind fokussierbare Knöpfe. Membran-Drehung und Puls verfügbarer Knoten sind CSS-Animationen in Komponenten-CSS (K2-Ausnahme) und stehen bei reduzierter Bewegung still. Seit AP 1.4.1 liegt der Baum in der Genom-Ebene der Shell.
- Ebenen, Kamera und CSS-Übergänge (AP 1.4.1): Domäne `shell` mit [`ShellPage`](../../src/app/shell/feature/shell/shell.page.ts); Ebenen und Kamera stehen in [`shell.page.css`](../../src/app/shell/feature/shell/shell.page.css) (K2-Ausnahme), die Kamerawerte und `--ms` rechnet [`shell-camera-logic.ts`](../../src/app/shell/domain/shell-camera-logic.ts) rein. **Abweichung:** Der Modus ist kein Signal im GameStore, sondern die Route. Die `ShellPage` ist Elternroute von `/`, `/umgebung` und `/genom` (Kindrouten ohne Komponente, damit die Instanz und die Übergänge bestehen bleiben); die [`ShellFacade`](../../src/app/shell/feature/state/shell.facade.ts) leitet den Modus per `toSignal` aus dem Router ab und wechselt per Navigation. So bleibt UI-Zustand aus dem Spielzustand heraus, und Browser-Verlauf und Links funktionieren ohne eigenen Code. Nicht aktive Ebenen sind `inert`.
- Szene-Canvas (AP 1.4.2, 1.4.6): Domäne `scene` mit [`SceneRenderer`](../../src/app/scene/ui/scene-canvas/scene-renderer.ts). Budget 300 Sprites, mobil 150 (Breite < 768 px oder `pointer: coarse`); ein Sprite steht bei mehr Einheiten für `n` Einheiten. DPR auf 2 gedeckelt; Sprites je Typ vorgerendert und nur kopiert, ohne `shadowBlur` (Flat-Stil von K2-K). Himmel, Lichtkegel und Hügel liegen in einem vorgerenderten Hintergrundbild, der Schein der Futterstelle ist ein Sprite. Farben liest der Canvas einmal aus den Tokens, visueller Zufall läuft über einen eigenen seeded RNG der Szene. Ereigniszahlen sind DOM-Elemente.
- Bedienung (AP 1.4.4, 1.4.5): Mausrad, Tasten und Pinch über Pointer Events (mit Touch-Events-Rückfall nach `pointercancel`), rein in `shell/domain` ([TK §8.3](../technisches-konzept.md#83-eingabe)).
- Fallbacks (AP 1.4.6): Bei reduzierter Bewegung gibt es keine Kamerafahrt, nur eine kurze Überblendung der Ebenen; Dauer-Animationen stehen still und pausieren außerdem, solange ihre Ebene inert ist ([TK §8.5](../technisches-konzept.md#85-barrierearmut)).

**Messwerte (AP 1.4.6, Emulation):** Headless-Chromium mit Software-Raster und 4× CPU-Drosselung, 250.000 Drohnen. Smartphone 390 × 844, DPR 2, 150 Sprites: Median und 95-Perzentil 16,7–16,8 ms je Frame, auch während der Moduswechsel mit `clip-path` und `blur` (vor Hintergrund-Cache und Schein-Sprite 95-Perzentil 33,4 ms). Teuer sind Pixelflächen, nicht JavaScript. Desktop 1440 × 900 bleibt im Software-Compositing bei rund 30 fps; Hauptursache ist die Körnung (`mix-blend-mode: overlay`) über der sich ständig ändernden Szene, ohne sie 60 fps ([TK §10](../technisches-konzept.md#10-qualitätssicherung)).

**Offen:** Profiling auf echten Geräten (iOS, Android) und die Körnung auf dem Desktop mit echter GPU.

## Konsequenzen

- Die Technik entspricht dem Mockup, das sie bereits erprobt.
- Karte und Genom nutzen Angular-Templates und CSS direkt.
- Der Canvas-Loop löst keine Change Detection aus.
- Negativ: Bei großen Mengen zeigt die Szene nicht mehr jede Einheit einzeln.
- Negativ: `shadowBlur` ist teuer und erzwingt das Vorrendern der Sprites.
- Negativ: `clip-path` und `blur` können auf Smartphones ruckeln. Der Projektplan sieht dafür Profiling in AP 1.4.6, vereinfachte Übergänge als Fallback und `prefers-reduced-motion` vor. In der Emulation blieben die Moduswechsel flüssig; die Messung auf echten Geräten steht aus.
- Negativ: Drei Render-Techniken müssen im Ebenen-Layout zusammenspielen.

## Verworfene Alternativen

- **`@angular/animations`:** veraltet; die K2-Übergänge sind ohnehin CSS-Übergänge.
- **Karte und Genom im Canvas:** Interaktive Knoten, Klickflächen und CSS-Styling müssten selbst nachgebaut werden.
