# ADR-006: Canvas 2D für die Szene, SVG für Karte und Genom, CSS-Übergänge

**Status:** Angenommen
**Datum:** 2026-11-18

## Kontext

Die Oberfläche folgt dem Mockup [K2](../mockups/k2-zoom.html) in der Grafik von [K2-K · Kurzgesagt-Stil](../mockups/k2-kurzgesagt.html): drei Ebenen, zwischen denen gezoomt wird. Die Szene zeigt einige hundert flach schattierte Sprites; Karte und Genom bestehen aus interaktiven Knoten ([Konzept §2](../technisches-konzept.md#2-technologie-stack), [§8](../technisches-konzept.md#8-rendering--umsetzung-von-k2)).

## Entscheidung

- **Szene:** Canvas 2D, außerhalb des Template-Systems.
- **Karte und Genom:** SVG in Angular-Templates, mit Klickflächen und Styling über CSS.
- **Übergänge:** CSS (`transform`, `clip-path`, `filter`, `opacity`). Der Modus ist ein Signal im GameStore, die Shell setzt `data-mode` am Container.
- **Budget der Szene:** maximal ~300 Sprites (mobil ~150). Bei mehr Einheiten steht ein Sprite für `n` Einheiten, die Verteilung auf die Typen bleibt proportional.
- `devicePixelRatio` wird auf 2 gedeckelt. Sprites werden vorgerendert und nur kopiert.

### Umsetzungsstand

**Umgesetzt:**

- SVG-Sonar-Karte (AP 1.2.8): [`sonar-map.component.html`](../../src/app/sonar/ui/sonar-map/sonar-map.component.html) zeichnet Distanzringe, Reichweite, Sweep, bisherige Route, Ziele, Route und Reiselinie als SVG im Angular-Template, ohne neue Abhängigkeit. Die Geometrie rechnet [`sonar-map-logic.ts`](../../src/app/sonar/domain/sonar-map-logic.ts) rein und Angular-frei; Ziele sind fokussierbare Knöpfe. Sweep und Routenfluss sind CSS-Animationen in Komponenten-CSS (K2-Ausnahme) und stehen bei `prefers-reduced-motion` still. Die Karte liegt noch auf der Seite `/umgebung`, nicht in einer K2-Ebene.

**Geplant:**

| Teil | Umsetzung |
|---|---|
| SVG-Genom | ab AP 1.3.3 |
| Ebenen, Kamera, CSS-Übergänge | ab AP 1.4.1 |
| Szene-Canvas | ab AP 1.4.2 |

Das Prototyp-HUD aus AP 1.1.6 ist funktional und noch ohne K2-Grafik.

## Konsequenzen

- Die Technik entspricht dem Mockup, das sie bereits erprobt.
- Karte und Genom nutzen Angular-Templates und CSS direkt.
- Der Canvas-Loop löst keine Change Detection aus.
- Negativ: Bei großen Mengen zeigt die Szene nicht mehr jede Einheit einzeln.
- Negativ: `shadowBlur` ist teuer und erzwingt das Vorrendern der Sprites.
- Negativ: `clip-path` und `blur` können auf Smartphones ruckeln. Der Projektplan sieht dafür Profiling in AP 1.4.6, vereinfachte Übergänge als Fallback und `prefers-reduced-motion` vor.
- Negativ: Drei Render-Techniken müssen im Ebenen-Layout zusammenspielen.

## Verworfene Alternativen

- **`@angular/animations`:** veraltet; die K2-Übergänge sind ohnehin CSS-Übergänge.
- **Karte und Genom im Canvas:** Interaktive Knoten, Klickflächen und CSS-Styling müssten selbst nachgebaut werden.
