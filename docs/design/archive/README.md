# Klick-Dummies für Phase 1 (Winzlinge)

Archiviert: sieben spielbare HTML-Entwürfe, um die Kartenform (Produktspezifikation 9.1, Punkt 1; 9.3 „UI-Mockups für die Kartenform“) und die Aufteilung des Bildschirms zu entscheiden. Sie sind Wegwerf-Prototypen, kein Teil der Angular-App, und fallen nicht unter die Code-Regeln aus `CLAUDE.md`.

Start: `docs/design/archive/index.html` im Browser öffnen (kein Server nötig).

## Varianten

| Dummy | Kartenform | Aufbau | Markieren | Frage dahinter |
| --- | --- | --- | --- | --- |
| A `a-streifen.html` | Waagrechter Streifen, 4 × 260 × 120 KP, immer ganz sichtbar | Karte oben, drei Spalten darunter | Auswahl auf der Karte, Button in der Seitenleiste | Trägt der Vorschlag aus 9.1 als klassische Übersicht? |
| B `b-gezeitenkreis.html` | Fläche aus Ringen um den Start, Seegraswiese am Rand | Karte im Zentrum mit HUD, Seitenleisten | Popover an der Stelle; globale Kaufmenge | Fühlt sich eine Fläche nach „Ausbreiten“ an, und bleiben die Wege lesbar? |
| C `c-tiefenschnitt.html` | Senkrechter Streifen mit Beschriftung, Ausschnitt folgt dem Schwarm | Karte links, Tabs rechts, Statusleiste | Ein Klick markiert sofort; Stellenliste | Reicht ein Ausschnitt, wenn die Stellen beschriftet und als Liste verfügbar sind? |
| D `d-leitstand.html` | Kleine Übersichtskarte plus Antriebsleiter | Reiseplan-Tabelle mit Klartext-Erklärung im Zentrum | 🚩 in Tabelle oder Karte | Wird der Abzug verständlich, wenn Ø-Ernte und Begründung offen liegen? |
| E `e-tiefenschichten.html` | Jede Zone eine eigene Ebene (260 × 260 KP); die nächste liegt verschwommen mit Parallaxe darunter | Ebene im Zentrum, Tiefenmesser rechts, ausklappbare Leiste unten | Auswahl auf der Ebene, auch in der tieferen | Weckt die sichtbare, größere Welt darunter den Sog zur nächsten Zone? |
| F `f-zellblick.html` | Ringe (große Ringe), feste Nahsicht, Randpfeile zu Zielen außerhalb | Vollbild, Wachstumsleiste oben, Bedienleiste unten, Ausbauten in der „Brutkammer“ | Auswahl auf der Karte oder am Randpfeil | Reicht eine Nahsicht ohne Übersichtskarte, wenn Randpfeile die Richtung geben? |
| G `g-sichtfeld.html` | Ringe (große Ringe), Ausschnitt um den Schwarm wächst mit der Reichweite, Stellen flächenproportional zum Futter | Sichtfeld mit runder Minimap, Seitenleiste | Auswahl im Sichtfeld | Vermittelt das wachsende Sichtfeld Fortschritt, und hält die Minimap die Orientierung? |

E und F sind an der Zellphase von Spore angelehnt (Kamera am Lebewesen, sichtbare größere Welt in der Tiefe, Wachstumsleiste, Editor-Bildschirm), übernehmen aber kein Aussehen und keine Inhalte des Spiels.

## Testleiste

Jeder Dummy hat rechts unten eine Testleiste:

- **Tempo:** Pause, 1×, 5×, 20×, 100× (`TEC-05`).
- **Abwesend:** simuliert 15 min oder 2 h und zeigt den Rückkehrdialog (`ALL-OFF-02`, `ALL-OFF-03`).
- **Entdecken:** schaltet zwischen den Kandidaten aus 9.1 um: *Reichweite* (Stand der Spezifikation), *je Zone* (alle Stellen erreichbarer Zonen sind bekannt), *neu in Reichweite* (liegen weniger als 3 ansteuerbare Stellen in der Reichweite, entsteht dort höchstens alle 5 s eine neue in der höchsten erreichbaren Zone).
- **Test:** Vorrat ×10 und 1.000 Eier, neue Karte.

## Aufbau

- `shared/sim.js`: vereinfachte Simulation der Regeln aus Abschnitt 4 mit fünf Kartenformen (`strip`, `vertical`, `rings`, `bigRings`, `layers`).
- `shared/ui.js`: Zahlenformat de-DE, Testleiste, Rückkehr- und Abschlussdialog, Panel-Bausteine für E bis G (Kette, Ausbauten, Zielkarte).
- `shared/base.css`: gemeinsame Grundstile; jede Variante setzt eigene Farb-Tokens.

## Vereinfachungen und Abweichungen

- Simuliert wird in festen Schritten von 0,25 s; Starre und „Stelle leer“ beziehen sich auf diesen Schritt.
- Die dritte Bedingung der Abzugsreife (`P1-ABZ-02`) entfällt, weil die Ernte bis zum Leeren dem Appetit entspricht.
- Die Startstelle zählt als einer der drei Algenfilme von Zone 0.
- Ringkarte (B): Zone 0 ist ein Kreis mit Radius 95 KP, die Ringe enden bei 170, 240 und 300 KP. Der Start liegt in der Mitte statt am Rand von Zone 0; die Seegraswiese liegt an zufälliger Stelle am Außenrand.
- Große Ringe (F, G): Zonengrenzen bei 130, 300, 520 und 800 KP, damit die Kamera Platz zum Wandern hat. Wege werden dadurch länger als im Streifen.
- Schichten (E): In der Simulation liegen die Ebenen nebeneinander mit 40 KP Abstand; ein „Abtauchen“ kostet also Reisezeit wie eine Strecke von etwa 300 KP. Eine Stelle der tieferen Ebene wird bekannt, sobald sie in der Reichweite liegt.
- Sichtfeld (G): Der Ausschnitt hat den Radius 1,12 × Reichweite. Die Fläche einer Stelle ist proportional zu ihrem Bestand, bezogen auf die Basisgröße der höchsten erreichbaren Zone; streng proportional über alle Zonen geht nicht, weil die Größen um bis zu zehn Zehnerpotenzen auseinanderliegen. Erreicht der Schwarm eine neue Zone, schrumpfen alle Stellen gleitend um etwa den Faktor 7,7 (√60); Stellen alter Zonen werden zu Krümeln. Radien sind auf 1,4 KP bis 20 % des Sichtradius begrenzt; gekappte Stellen (z. B. die nächste Zone oder die Seegraswiese) tragen einen Doppelring.
- Die Seegraswiese wird erst sichtbar, wenn sie bekannt ist, wie jede andere Stelle.
- Kein Speichern, kein Export oder Import; die Abwesenheit wird nur über die Testleiste simuliert.
- Mehrlinge und Produktions-Ausbau (`P1-AUS-04`, `P1-AUS-05`) fehlen, weil ihre Werte offen sind.
- Texte sind direkt im HTML, nicht über `$localize`.
