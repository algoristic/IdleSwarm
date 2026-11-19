---
paths:
  - "src/app/scene/**"
---

# Szene (Canvas der Welt-Ebene)

Die Szene (AP 1.4.2, US-08.02, TK §8.2, ADR-006) zeichnet die Welt-Ebene der K2-Shell als Canvas 2D nach [Mockup K2-K](../../docs/mockups/k2-kurzgesagt.html) (Abschnitt „Szene“, `frame()`): Hintergrundverlauf, Lichtkegel, Hügel, Plankton, Futterstelle (Wärmezonen, Schatten, drei Klumpen, Blasen), Agenten (Drohnen pendeln und tragen auf dem Rückweg Nahrung, Soldaten patrouillieren als Dreiecke, Königinnen kreisen mit Krönchen), Ertragsteilchen; darüber Ereigniszahlen als DOM-Elemente.

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `scene/domain/models/scene.model.ts` | `UnitCounts`, `SceneAgent`, `SceneAgents` (Agenten mit eigenem visuellem RNG, `pruneAtMs`), `AgentPose`, `Plankton`, `SceneParticle`, `SceneFrame` (alles, was der Renderer je Frame braucht) |
| `scene/domain/scene-budget-logic.ts` | `SPRITE_BUDGET` 300, `SPRITE_BUDGET_MOBILE` 150, `MOBILE_MAX_WIDTH` 768; `spriteBudget(width, coarsePointer)` (mobil bei Breite < 768 px oder `pointer: coarse`), `unitCounts` (Num → ganze Zahl, gekappt), `spriteCounts` (bis zum Budget 1:1, darüber proportional nach größten Resten, jeder vorhandene Typ ≥ 1, Summe = Budget) |
| `scene/domain/scene-agent-logic.ts` | Bewegungsmodell als reine Funktionen der Zeit: `SCENE_SEED`, `createSceneAgents`, `syncAgents` (ergänzt neue Agenten mit Einblenden, die jüngsten überzähligen blenden in `AGENT_FADE_MS` aus und fallen danach heraus; übrige bleiben unverändert), `activeAgentCounts`, `dronePendulum` (Hinweg ohne Last bis `DRONE_INNER_RADIUS`, Rückweg mit Last), `agentPose` (Ellipse `ORBIT_Y_SCALE`, Laufrichtung, unterwegs ohne Last), `agentOpacity` |
| `scene/domain/scene-effects-logic.ts` | Plankton (`createPlankton`, `planktonPoint` mit Drift), Ertragsteilchen (`yieldParticleRate`: logarithmisch in der Nahrung/s, gedeckelt auf `YIELD_PARTICLE_MAX_RATE`, halbiert bei reduzierter Bewegung; `yieldParticles`: zustandslos aus Zeit, Rate und Seed), Blasen (`bubble`) |
| `scene/domain/scene-geometry-logic.ts` | `MAX_PIXEL_RATIO` 2 (`scenePixelRatio`), `sceneScale` (kleinere Viewport-Seite / 700, mindestens 0,5), `siteAppearance` (Klumpen nach Vorratsanteil kleiner und blasser, Untergrenzen `SITE_MIN_SCALE`, `SITE_MIN_OPACITY`), `sitePulse` |
| `scene/ui/scene-canvas/scene-palette.ts` | `ScenePalette`, `readScenePalette(style)`: liest alle Szene-Farben einmal aus den `--sw-scene-*`/`--sw-unit-*`-Tokens |
| `scene/ui/scene-canvas/scene-sprites.ts` | `createSceneSprites(palette, resolution, createCanvas)`: Sprites je Typ im Flat-Stil (Kugel aus Grund, Körper, Glanzlicht, Kern; kein `shadowBlur`), in Geräte-Pixeln vorgerendert |
| `scene/ui/scene-canvas/scene-renderer.ts` | `SceneRenderer.create(canvas, palette, createCanvas)` (ohne 2D-Kontext `null`), `draw(nowMs, frame)`: passt Canvas, Sprites, Hügel und den Schein der Futterstelle (Sprite statt Verlauf je Frame) bei Größen- oder DPR-Wechsel an; Himmel, Lichtkegel und Hügel liegen in einem vorgerenderten Hintergrundbild, das erst neu entsteht, wenn ein Kegel um `BACKDROP_SWAY_STEP` (0,5 CSS-px) geschwankt ist (AP 1.4.6, Profiling); gleicht die Agenten an `frame.sprites` an; Agenten und Teilchen nur per `drawImage`. Ursprung der Szene-Koordinaten ist die Viewport-Mitte (Fixpunkt der Kamera) |
| `scene/feature/state/scene.facade.ts` | `SceneFacade`: `frame` (nur im Render-Takt gelesen), `popups`, `reducedMotion` (aus `MotionPreferenceService`, Regeldatei `shared`), `now()` (`CLOCK.monotonic`), `onRender(cb)` (über `GameLoop.onRender`); Viewport über `VIEWPORT`, DPR und Zeiger über `SCENE_DISPLAY` |
| `scene/feature/state/scene.utils.ts`, `scene.model.ts`, `scene.tokens.ts`, `scene.providers.ts` | `toSceneFrame` (Budget, Reise, Vorratsanteil, Ertragsrate aus `foodPerSecond` mit `stateModifiers`), `toScenePopups` (Log-Einträge nach dem Start der Szene: `arrived` mit DNA > 0 → „+x DNA“, `found` → „Fund!“, höchstens `SCENE_POPUP_MAX`); `SceneSource`, `ScenePopupView`; `SCENE_DISPLAY`; `provideSceneState()` (an der Shell-Route) |
| `scene/feature/scene-world/` | `SceneWorldComponent` (`app-scene-world`): Canvas und Ereigniszahlen; startet den Renderer in `afterNextRender`, meldet ihn über `DestroyRef` ab |

## Besonderheiten

- Visueller Zufall nur über den eigenen RNG der Szene (`SCENE_SEED`, `shared/util/rng`), nie über `rngState` des Spielstands. Die Szene ändert keinen Zustand.
- Render-Takt nur über `SceneFacade.onRender` → `GameLoop.onRender`; der GameLoop pausiert ihn bei verborgener Seite und ohne Logik-Takt. Kein Template-Binding und keine Change Detection je Frame; der Renderer liest `facade.frame()` außerhalb eines reaktiven Kontexts.
- Farben liest die Komponente einmal beim Start (`getComputedStyle(documentElement)`); im Renderer stehen keine Farbwerte. Neue Szene-Farben sind neue Tokens in `src/styles.css`.
- Sprite-Auflösung = DPR (≤ 2) × Szenenmaßstab; bei Größen- oder DPR-Wechsel rendert der Renderer neu vor.
- Bei mehr Einheiten als Budget steht ein Sprite für mehrere Einheiten. Agenten werden nur bei geänderter Sprite-Zahl angeglichen (`syncAgents`), nicht neu gewürfelt.
- Unterwegs (`travel !== null`) zeichnet die Szene keine Futterstelle und keine Ertragsteilchen; das Plankton driftet seitlich, Drohnen tragen nichts.
- Ereigniszahlen: per CSS animiert (K2-Ausnahme, `scene-world.component.css`), nur im Szenen-Modus sichtbar (`mode-scene:`), bei reduzierter Bewegung (`:host-context([data-motion='reduced'])`) nur Ein- und Ausblenden. Kein Timer: ausgeblendete Elemente bleiben im DOM, bis neuere sie verdrängen. Für Screenreader `aria-hidden`, das Log nennt dieselben Ereignisse.
- Reduzierte Bewegung (AP 1.4.6, US-08.08): `SceneFrame.reducedMotion` halbiert Plankton und Ertragsteilchen, schaltet die aufsteigenden Blasen ab und lässt die Lichtkegel stillstehen. Agenten bewegen sich weiter (gleiche Geschwindigkeit): Sie zeigen Spielzustand (Drohnen tragen Nahrung, Soldaten patrouillieren), sind klein und bewegen keine großen Flächen; eine andere Zeitskala ließe sie beim Umschalten springen. Pulsieren und Wabern der Futterstelle sowie die Plankton-Drift während der Reise bleiben.
- Profiling (AP 1.4.6, Headless-Chromium mit Software-Raster, 4× CPU-Drosselung, 250.000 Drohnen): Teuer sind Pixelflächen, nicht JavaScript (Szene-Skript < 1 % der Samples). Smartphone 390 × 844, DPR 2, 150 Sprites: vorher Median 16,7 ms, 15–50 % der Frames > 17 ms, 95-Perzentil 33,4 ms; mit Hintergrundbild und Schein-Sprite Median und 95-Perzentil 16,7–16,8 ms, Übergänge 95-Perzentil 16,8 ms. Desktop 1440 × 900 (300 Sprites) bleibt im Headless-Software-Compositing bei rund 30 fps, Hauptursache ist die Körnung (`mix-blend-mode: overlay` über der sich jeden Frame ändernden Szene); ohne Körnung 60 fps. Messung auf echten Geräten steht aus.
- Keine Klick-Interaktion mit der Futterstelle; der Kartenmodus-Klick der Shell liegt über dem Canvas.
- jsdom hat kein Canvas: `getContext` liefert `null` (mit Hinweis „Not implemented“ in der Testausgabe), die Szene bleibt dann leer. Der Renderer-Spec nutzt einen Fake-Kontext.
- Test-IDs: `scene.popup.dna`, `scene.popup.find`.
