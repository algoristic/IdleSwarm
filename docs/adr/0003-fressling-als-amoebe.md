# ADR 0003: Fressling als Amöbe (Abweichung vom Prototyp)

- **Status:** angenommen
- **Datum:** 28.11.2026
- **Gültig bis:** AP 13. Mit dem Prototyp entfallen alle ADRs, die Abweichungen von ihm festhalten, auch diese.

## Kontext

Die Asset-Bibliothek (AP 6) übernimmt die Darstellung des eingefrorenen Prototyps 1:1. Aus den Einheiten-Entwürfen im Katalog wurde die Amöbe als neuer Fressling gewählt: Kurzgesagt-Stil, ohne Augen und Mund, mit Scheinfüßchen, die wandern. Weitere Einheiten sollen später nach demselben Muster folgen.

Den Fressling zeichnen vier Stellen: der Schwarm-Canvas (bis zu 48 Figuren), der Mini-Schwarm der Karte, der Ketten-Knoten und das Einheiten-Icon. Der Canvas rastert jede Einheit einmal zu einem Bild und zeichnet nur dieses. SMIL-Animationen laufen in einem gerasterten Bild nicht. Die Amöbe hat vier unabhängige Takte: Umriss und Innenplasma 6 s, Kern 8,5 s, Vakuole 3,8 s.

## Entscheidung

- Der Fressling ist die Amöbe, in 5 fest vordefinierten Varianten (`EATER_VARIANTS` in `game/ui/art/unit-sprite/eater.utils.ts`). Jede Variante hat einen eigenen Umriss, eine eigene Lage von Kern und Vakuole und zwei Algen aus je 1–3 Kügelchen, erzeugt mit festen `lcg`-Seeds. Die Variante einer Figur folgt fest aus ihrem Index.
- Im Schwarm-Canvas wird der Fressling je Frame als Vektor gezeichnet (`drawEater`). Die Geometrie und die Takte (`EATER_TIMING`) sind dieselben wie die der SVG-Animation. `SwarmSprite` ist eine Union aus Raster-Sprites (übrige Einheiten, wie im Prototyp) und animierten Sprites.
- Die Karte zeigt die Varianten in reduzierter Darstellung (`detail: 'reduced'`: ohne Leuchtsaum, Algen und Vakuole), weil die Figuren dort klein sind.
- Einheiten-Icon und Ketten-Knoten zeigen immer Variante 0; das Icon statisch.
- Bewegung an der Stelle und auf der Karte: Statt im Bogen zu paddeln, wandert jede Amöbe in Schüben frei durch den Pulk (`eaterCrawl(index, area)`: geschlossener Zufallsweg aus 12 Schüben zu etwa einer Körperlänge, ein Schub je 6 s, Runde 72 s, im Ring um die Schwarmmitte, damit die höheren Einheiten in der Mitte frei bleiben). Im Canvas über `keyframeValue`, auf der Karte über SMIL (`animateTransform`). Der Platz aus dem Prototyp ist der Startpunkt.
- Verformung wie bei einer kriechenden Amöbe statt ringsum laufender Wellen (die lasen sich als Drehen auf der Stelle): Die Front zeigt bei allen Varianten nach +x und damit in Laufrichtung. Vorn greift ein Scheinfüßchen vor (in der Ruhe am längsten, im Schub eingezogen), ein seitliches tastet im Wechsel, Falten laufen an beiden Flanken nach hinten, das Hinterende ist leicht runzelig. Mitten im Schub streckt sich der Körper, Innenplasma, Algen und Kern strömen nach vorn. Ein Umrisstakt ist ein Schub; Bahn und Umriss laufen mit demselben Versatz (auf der Karte über den Input `phase`).
- Licht von oben links in jeder Lage: Der Versatz der Aufhellung wird gegen die Drehung der Figur gedreht, im Canvas nach `ctx.getTransform()`, auf der Karte über `lightValues` der Bahn. Kurzgesagt beleuchtet konsistent; eine mitdrehende Lichtkante verstärkte zudem den Eindruck des Drehens.
- Größe: Im Schwarm-Canvas sind die Fresslinge um 1,35 größer als im Prototyp und stehen weiter auseinander (Abstand 22 an der Stelle, 18 unterwegs statt 17; Schritt 22). Die Amöbe hat weniger Fläche als der runde Fressling des Prototyps und las sich neben den Brütern als Konfetti.
- Auf der Reise zeigt die Front in Reiserichtung; die Verformung läuft als Schwimmzüge weiter.
- Icon und Ketten-Knoten: Listen-Icon quadratisch (`-12 -12 24 24`, 34 × 34 wie die übrigen Einheiten; der flache Rahmen des Prototyps schnitt die Amöbe ab), im Ketten-Knoten größer (`CHAIN_ICON_SCALE.eater` 1,45) und mit `motion` verformt.
- Das Rollen des Prototyps (Stauchen auf 74 % und Kippen um ±3°) entfällt; die Amöbe verformt sich selbst. Das Schwimmen auf der Reise bleibt. Die Formation erzeugt dort die Roll-Werte weiter.
- Farben in `UNIT_SPRITE_COLORS.eater` (ADR 0002).

## Konsequenzen

- Der Abgleich mit dem Prototyp gilt für den Fressling nicht mehr. Die Specs mit Prototyp-Fixtures bleiben für die übrigen Einheiten gültig: `swarm-formation.utils.spec.ts` und `swarm-draw.utils.spec.ts` vergleichen Formation und Frames ohne die Fresslinge (an der Stelle und auf der Reise), `map-swarm.utils.spec.ts` Brüter und Startplätze der Fresslinge. `paddleAngle`, `EASE_OUT`, `paddlerParams` und `heading` sind entfallen.
- Die Kosten je Frame steigen um die Vektorzeichnung von bis zu 48 Figuren mit je zwei Umrissen aus 36 Punkten. Das ist auch auf dem Smartphone unkritisch; prüfen in AP 13 (Leistung).
- Weitere Einheiten können denselben Weg nehmen: Geometrie und Takte in `*.utils.ts`, SVG über SMIL, im Canvas ein animiertes Sprite.

## Verworfene Alternativen

- **Je Variante mehrere Bilder vorab rastern:** Ohne gemeinsames Raster der vier Takte ruckelt die Animation, oder sie braucht sehr viele Bilder. Außerdem bräuchte jede neue Einheit wieder eine eigene Bildfolge.
- **Den alten Fressling behalten und die Amöbe nur im Katalog zeigen:** widerspricht der Wahl aus den Entwürfen.
