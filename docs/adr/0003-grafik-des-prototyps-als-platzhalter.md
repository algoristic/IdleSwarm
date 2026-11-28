# ADR 0003: Grafik des Prototyps als Platzhalter

- **Status:** angenommen
- **Datum:** 28.11.2026
- **Gültig bis:** AP 13. Mit dem Prototyp entfallen alle ADRs, die Abweichungen von ihm festhalten, auch diese.

## Kontext

Der eingefrorene Prototyp ist die Referenz für Regeln, Spielwerte und Darstellung. Die Asset-Bibliothek (AP 6) hat seine Grafik 1:1 übernommen. Danach wurden Fressling und Brutling neu gestaltet: Der Fressling ist ein Pantoffeltierchen, der Brutling eine Amöbe. Dabei hat sich gezeigt, dass die Grafik des Prototyps kein Ziel ist, sondern ein Entwurf. Weitere Assets sollen nach demselben Muster folgen, ohne dass jede Neugestaltung eine eigene Entscheidung braucht.

Anders die Bedienung: Wie sich das Spiel bedienen lässt, ist im Prototyp erprobt und soll erhalten bleiben.

## Entscheidung

- **Grafische Assets sind Platzhalter.** Dazu gehören alles, was das Spiel illustriert:
  - Einheiten und ihre Bewegung,
  - die Schwarm-Szene,
  - Futterstellen und Fundstücke,
  - Hintergründe und Drift,
  - die Zeichnung von Karte und Neuron,
  - Einheiten- und Stellensymbole.

  Sie dürfen jederzeit neu gestaltet werden, ohne eigene ADR. Leitlinie ist der Kurzgesagt-Stil der ganzen App: flache Flächen, Randring im eigenen Farbton, Schattenseite unten rechts, Licht von oben links, Leuchtsaum, keine Gesichter.
- **Was die Grafik zeigt, bleibt erhalten.** Eine Neugestaltung darf das Aussehen ändern, aber keine Information verlieren: Einheit und Stufe, Füllstand und ausgetrocknete Stellen, Zone, Ziel und Auto-Ziel, Reichweite, Rang und Bezahlbarkeit. Jede Einheit behält ihren Farbton, damit sie in Schwarm, Kette und Liste wiedererkannt wird.
- **Bedienelemente werden so nah wie möglich übernommen.** Dazu gehören:
  - HUD, Kontextzeilen, Chips, Ansichtswahl, Menüknopf, Blätter, Dialoge, Toasts, Knöpfe und Listen samt Aufbau, Texten, Reihenfolge und Verhalten,
  - in Karte und Neuron die Beschriftungen, Kosten, Ränge und Klickflächen.

  Abweichungen davon brauchen weiterhin eine ADR, wie bisher ADR 0002 zu den Farben.
- **Die Technik bleibt verbindlich:**
  - Farben stehen in der Palette (`art-palette.ts`, ADR 0002); ihre Werte dürfen sich mit der Grafik ändern.
  - Reine Zeichenfunktionen liegen in `*.utils.ts`.
  - SVG-Teilkomponenten haben die Form `g[app-…]`.
  - Bewegung lässt sich mit `motion` abschalten.
  - Der Dev-Katalog zeigt jedes Asset.
- **Neugestaltungen werden festgehalten:** Was ein Asset zeigt und wie es sich bewegt, steht in `.claude/rules/game.md`. Neue Assets werden im Katalog geprüft, voll und reduziert.

## Bisherige Neugestaltungen

### Fressling als Pantoffeltierchen, Brutling als Amöbe

Beide Einheiten zeichnen vier Stellen: der Schwarm-Canvas (bis zu 48 Fresslinge und 8 Brutlinge), der Mini-Schwarm der Karte, der Ketten-Knoten und das Einheiten-Icon. Der Canvas rastert die übrigen Einheiten einmal zu einem Bild. SMIL-Animationen laufen in einem gerasterten Bild nicht, und beide Einzeller haben mehrere unabhängige Takte.

- **Farben:** Fressling lila, Brutling rosa wie im Prototyp (`UNIT_SPRITE_COLORS`). Ein türkises Pantoffeltierchen ginge auf den grünen Algenstellen unter.
- **Brutling als Amöbe** (`unit-sprite/amoeba.utils.ts`, `drawAmoeba`):
  - 5 Varianten (`AMOEBA_VARIANTS`) mit festen `lcg`-Seeds, gezeichnet ×3 (`AMOEBA_SCALE`).
  - Der Brutling ist wie im Prototyp deutlich größer als der Fressling und kleiner als die Eiträgerin.
  - Rand und Leuchtsaum sind dünner gezeichnet (`AMOEBA_STROKE`), damit sie auf dem Bildschirm so breit bleiben wie beim Fressling.
  - Statt Algen trägt sie 2–3 gelbe Eier mit Glanzpunkt, das Erkennungszeichen des alten Brutlings.
  - **Verformung** wie bei einer kriechenden Amöbe, die Front zeigt nach +x:
    - Vorn greift ein Scheinfüßchen vor; in der Ruhe ist es am längsten, im Schub eingezogen.
    - Ein seitliches Scheinfüßchen tastet im Wechsel.
    - Falten laufen an beiden Flanken nach hinten, das Hinterende ist leicht runzelig.
    - Mitten im Schub streckt sich der Körper; Innenplasma, Kern und Eier strömen nach vorn.
  - **Bewegung:**
    - An der Stelle kriecht sie langsam in kleinen Schleifen um ihren Platz (`amoebaCrawl`: 12 Schübe zu 6 s, Ring ±6 um den Platz).
    - Auf der Karte kriecht sie im Ring 0–10 um die Mitte (Skala .32, der Fressling .5).
    - Auf der Reise bleibt sie bei der Bewegung des Prototyps (`bob`), die Front zeigt nach vorn.
- **Fressling als Pantoffeltierchen** (`unit-sprite/paramecium.utils.ts`, `drawParamecium`):
  - 5 Varianten (`PARAMECIUM_VARIANTS`): schlanker Pantoffel mit stumpfem Vorderende bei +x und spitzerem Hinterende. Die Mundrinne mit Zellmund liegt schräg vorn.
  - Dichte, kurze Wimpern sind nach hinten geneigt; eine metachrone Welle läuft von vorn nach hinten (1,1 s), hinten sitzt ein längerer Wimpernschopf.
  - Der Saum wellt sich wie bei der Amöbe, aber viel schwächer: Eine flache Welle (Tiefe 0,22, etwa 5 % der Breite) läuft an den Flanken nach hinten (3,3 s, drei Wimpernschläge); die Wimpern sitzen auf dem bewegten Rand.
  - Im Inneren: Großkern und Kleinkern, 3–5 Nahrungsvakuolen auf der Zyklose (10 s), zwei pulsierende Vakuolen mit Sternkanälen.
  - Es rollt um die Längsachse (2,4 s): Die Rinne wandert, die Breite pulsiert, und der Weg pendelt seitlich als Schraubenbahn.
  - **Umlaufbahn** (`parameciumSwim`): Es gleitet auf einer glatten, geschlossenen Bahn um die Schwarmmitte, die erst nach 2 oder 3 Umläufen schließt.
    - Richtung und Umläufe sind je Figur zufällig. Der Radius schwingt mit drei Oberwellen, deren Ordnungen nicht im Umlauf aufgehen, über den ganzen Ring; die Winkelgeschwindigkeit schwankt. So kreuzen sich die Bahnen, die Figuren ziehen auseinander und finden sich wieder.
    - Das Tempo wechselt: je Figur 0,75- bis 1,3-mal die Grundgeschwindigkeit (an der Stelle 11, auf der Karte 5,5 Einheiten je Sekunde), dazu sanftes Beschleunigen und Zögern um ±30 %.
    - Ein- bis zweimal je Runde setzt es wie bei der Fluchtreaktion kurz zurück (0,8 s, 1,3 s Grundgeschwindigkeit weit), hält kurz an und schwimmt weiter; das Vorderende zeigt dabei weiter nach vorn.
    - Ein Zufallsweg wie bei der Amöbe ergab Haken, also abrupte Wendungen auf der Stelle. Eine einzige Umlaufbahn mit gleichem Tempo wirkte choreografiert.
    - Auf der Karte läuft die Bahn über `animateMotion` mit `rotate="auto"` und `keyPoints`, im Canvas über dieselbe Bahn, abgetastet nach dem Fortschritt.
  - Im Schwarm-Canvas ist es 1,4-mal so groß wie im Prototyp, mit größerem Abstand (22 an der Stelle, 18 unterwegs statt 17).
  - Auf der Reise schwimmt es im Pulk wie im Prototyp, das Vorderende zeigt nach vorn.
- **Licht von oben links in jeder Lage:** Der Versatz der Aufhellung wird gegen die Drehung der Figur gedreht. Im Canvas geschieht das nach `ctx.getTransform()`, auf der Karte über die Lichtwerte der Bahn (`light`).
- **Im Schwarm-Canvas** werden beide je Frame als Vektor gezeichnet. `SwarmSprite` ist eine Union aus Raster-Sprites (übrige Einheiten) und animierten Sprites.
- **Auf der Karte** werden beide reduziert gezeichnet (`detail: 'reduced'`): ohne Leuchtsaum, Glanzpunkte, Nahrung und Vakuolen. Die Wimpern bleiben als Erkennungsmerkmal.
- **Icon und Ketten-Knoten** zeigen Variante 0.
  - Das Listen-Icon des Fresslings ist länglich (`-12.5 -8 25 16`), das des Brutlings ist `-35 -35 70 70`.
  - Im Ketten-Knoten und im Tab sind die Icons auf eine Größe normiert (`CHAIN_ICON_SCALE`); die Größenordnung zeigt nur der Schwarm.
  - Im Ketten-Knoten bewegen sich beide mit `motion`.
- **Versatz der SMIL-Takte:** Gebundene negative `begin`-Werte greifen in Chrome nicht, wenn Angular sie setzt, nachdem das Element im Dokument hängt; alle Instanzen liefen dann im Gleichtakt.
  - Die Direktive `[appSmilBegin]` setzt `begin` zuerst auf `indefinite`, dann auf den Versatz, und startet die Animation mit `beginElement()`.
  - Der Versatz liegt je Animation modulo ihrer Dauer (`smilBegin`).

## Konsequenzen

- **Specs mit Prototyp-Fixtures** sind für die Grafik nur ein Netz gegen ungewollte Änderungen, keine Vorgabe. Wird ein Asset neu gestaltet, fällt es aus dem Vergleich. So vergleichen schon jetzt:
  - `swarm-formation.utils.spec.ts` und `swarm-draw.utils.spec.ts` ohne Fresslinge und ohne die kriechenden Brutlinge an der Stelle,
  - `map-swarm.utils.spec.ts` nur die Startplätze.

  An die Stelle des Vergleichs treten Specs für die Eigenschaften des neuen Assets.
- **Specs der Bedienelemente** gleichen weiter mit dem Prototyp ab.
- **Leistung:** Animierte Vektor-Sprites kosten je Frame mehr als Rasterbilder; bei Fressling und Brutling sind das bis zu 56 Figuren. Das ist auch auf dem Smartphone unkritisch; prüfen in AP 13 (Leistung).
- **Muster für weitere Einheiten:**
  - Geometrie und Takte in `*.utils.ts`,
  - SVG über SMIL mit `[appSmilBegin]`,
  - im Canvas ein animiertes Sprite.

  Gemeinsames (Licht, Zufallsweg, Pulsieren der Vakuolen) liegt in `unit-sprite/figure.utils.ts`.

## Verworfene Alternativen

- **Je Neugestaltung eine eigene ADR:** Grafik ändert sich oft und in kleinen Schritten; die Beschreibung in den Regeldateien reicht.
- **Auch die Grafik so nah wie möglich übernehmen:** Die Figuren des Prototyps sind schlicht. Für Realismus und Lebendigkeit im Kurzgesagt-Stil müssen sie sich ändern dürfen.
- **Je Variante mehrere Bilder vorab rastern (Fressling, Brutling):** Ohne gemeinsames Raster der Takte ruckelt die Animation, oder sie braucht sehr viele Bilder. Außerdem bräuchte jede neue Einheit wieder eine eigene Bildfolge.
