# IdleSwarm – Produktspezifikation

| | |
| --- | --- |
| Arbeitstitel | IdleSwarm |
| Dokumentstand | 24. November 2026, Version 3 |
| Grundlage | Konzept „IdleSwarm – Konzept für ein Idle Game“ und Prototyp des Zeitalters Winzlinge (Version 5) |
| Umfang | MVP: Zeitalter Winzlinge (Phase 1) und Organismen (Phase 2) einschließlich Evolutionssprung |
| Gegenstand | Spielmechaniken und Funktionen |

Anforderungen tragen eine Kennung (z. B. `P1-ERN-01`) und eine Verbindlichkeit: **Muss** ist für den MVP verpflichtend, **Soll** ist erwünscht, **Kann** ist optional. Zahlenwerte stammen, wo nicht anders vermerkt, aus dem Prototyp und sind Startwerte für das Balancing. Werte, die noch nicht feststehen, sind mit **[offen]** markiert und in Abschnitt 9 gesammelt.

---

## 1. Produktüberblick

### 1.1 Vision

IdleSwarm ist ein Idle Game, in dem ein insektenartiger Schwarm vom winzigen Krabbler bis zur galaxiefressenden Macht wächst. Jede Stelle mit Nahrung ist endlich: Der Schwarm frisst sie leer und muss weiterreisen.

Motor ist eine Kette von Einheiten, in der jede Stufe die Stufe darunter vermehrt. Nahrung entsteht nicht aus dem Nichts, sondern wird aus endlichen Stellen geerntet. Daraus entsteht neben dem Kaufen eine zweite Spielachse: **Wann bricht der Schwarm auf, wohin reist er, und was lässt er zurück?**

### 1.2 Zielgruppe und Plattform

- Spielerinnen und Spieler von Idle- und Incremental-Games, die neben Zahlenwachstum Entscheidungen und Timing schätzen.
- Plattform: Browser auf dem Desktop.
- Das Spiel muss sowohl aktiv (häufige Eingriffe) als auch passiv (lange Abwesenheit) tragfähig sein.

### 1.3 Ziele des MVP

Der MVP soll eine Frage beantworten: **Machen das Reisen und Einnehmen auf Dauer Spaß?**

Erfolgskriterien:

1. Testspieler brechen im Zeitalter Winzlinge freiwillig auf, bevor eine Stelle leer ist.
2. Testspieler erkennen, wann sich eine Reise lohnt, ohne die zugrunde liegende Formel zu kennen.
3. Im Zeitalter Organismen entstehen echte Entscheidungen zwischen Aufrüsten und Wachsen, erkennbar an unterschiedlichen Spielstilen.
4. Testspieler setzen das Spiel nach dem ersten Schwärmen fort.

### 1.4 Nicht Teil des MVP

- Die Zeitalter Herrschaft an Land (Phase 3) und In den Weltraum (Phase 4).
- Ableger, frei festlegbare Reiserouten, Jahreszeiten.
- Erfolge, Statistiken für Spieler, Cloud-Speicher, Unterstützung mobiler Geräte.

---

## 2. Begriffe

Die Begriffe gelten für alle Zeitalter. Wo ein Zeitalter eigene Namen verwendet, stehen sie in 2.9.

### 2.1 Struktur

| Begriff | Bedeutung |
| --- | --- |
| Zeitalter | Großer Spielabschnitt mit eigener Kernmechanik, eigener Karte und eigenen Namen. Im MVP: Winzlinge und Organismen. „Phase n“ bezeichnet das n-te Zeitalter und steht nur in Überschriften und Kennungen (`P1-`, `P2-`) |
| Durchlauf | Spielverlauf innerhalb eines Zeitalters vom Start bis zum nächsten Schwärmen oder Evolutionssprung |
| Zone | Abschnitt der Karte eines Zeitalters. Jede Zone hat eine Basisgröße für ihre Stellen und eine Zugangsschwelle |
| Zugangsschwelle | Mindest-Antrieb, ab dem die Stellen einer Zone oder eines Stellentyps erreichbar sind |
| Zielstelle | Besondere Stelle in der letzten Zone eines Zeitalters; nur an ihr ist der Evolutionssprung möglich. Nicht zu verwechseln mit dem Reiseziel |
| Kartenpunkt | Längeneinheit der Karte. Eine Zone ist im Prototyp 260 Kartenpunkte breit |
| Zeitschritt (Δt) | Ein Schritt der Simulation, höchstens 0,25 Sekunden (`TEC-03`) |
| Nachberechnung | Simulation der Abwesenheit beim nächsten Start (`ALL-OFF-02`) |

### 2.2 Stellen

| Begriff | Bedeutung |
| --- | --- |
| Stelle | Ort auf der Karte mit endlichem Nahrungsbestand |
| Startstelle | Stelle, an der ein Durchlauf beginnt |
| Stellentyp | Art einer Stelle (z. B. Algenfilm) mit Typfaktor, Wuchs und Eigenheit |
| Basisgröße | Größe, die eine Zone für ihre Stellen vorgibt, vor Typfaktor und Zufallsfaktor |
| Typfaktor | Faktor eines Stellentyps auf die Basisgröße |
| Eigenheit | Sonderregel eines Stellentyps |
| Bestand (S) | Nahrung, die gerade an einer Stelle liegt |
| Größe (S₀) | Höchster Bestand einer Stelle |
| Wuchs (g) | Rate, mit der der Bestand einer Stelle nachwächst |
| Bekannt | Eine Stelle ist bekannt, sobald sie einmal in der Reichweite des Schwarms lag |
| Erreichbar | Eine Stelle ist erreichbar, wenn der Antrieb mindestens ihre Zugangsschwelle erreicht |
| Ansteuerbar | Eine Stelle ist ansteuerbar, wenn sie bekannt, erreichbar und nicht versiegt ist und ab Organismen ihre Abwehr nicht zu hoch ist (`P2-EIN-07`) |
| Versiegen | Eine Stelle versiegt, wenn ihr Bestand auf 0 fällt oder ihre Eigenheit es vorsieht. Sie wächst nicht mehr nach, ist nicht ansteuerbar und verschwindet kurz nach dem Aufbruch des Schwarms von der Karte (`P1-STE-05`) |

### 2.3 Ernte

| Begriff | Bedeutung |
| --- | --- |
| Fressgrenze (f) | Vom Spieler gewählter Anteil der Größe, den der Schwarm an einer Stelle übrig lässt |
| Kahlfraß | Fressgrenze 0 %: Der Schwarm frisst die Stelle vollständig leer |
| Verfügbare Nahrung | Teil des Bestands oberhalb der Fressgrenze: `max(0, S − f · S₀)` |
| Fressleistung | Nahrung pro Sekunde, die ein Sammler höchstens erntet (Ausbau Verdauung) |
| Appetit | Höchste Ernte pro Sekunde: Anzahl Sammler × Fressleistung |
| Ernte (H) | Tatsächlich geerntete Nahrung pro Sekunde, höchstens der Appetit und höchstens die verfügbare Nahrung |
| Gesamternte | Menge aller Ernte, je nach Zusammenhang eines Durchlaufs oder eines ganzen Zeitalters |

### 2.4 Ressourcen

| Begriff | Bedeutung |
| --- | --- |
| Nahrung | Was Stellen enthalten und Sammler ernten; geerntet wird sie zu Vorrat |
| Vorrat (V) | Geerntete Nahrung; Hauptwährung für Einheiten, Soldaten und Ausbauten |
| Kapazität (C) | Weiche Obergrenze des Vorrats: Bis zu ihr kommt die Ernte vollständig an, darüber nur noch der Anteil C/V. Kein Kauf ist durch sie ausgeschlossen |
| Brut | Jede neu gekaufte Einheit und jeder Soldat kostet eine Brut |
| Brutrate | Brut, die pro Sekunde entsteht (Ausbau Brutherd) |
| Revier | Ab Organismen; entsteht durch gehaltene Stellen |
| Instinkt | Ab Organismen; bezahlt Fähigkeiten |
| Gene | Ab Organismen; entstehen beim Schwärmen, bezahlen Mutationen |
| Erbe | Entsteht beim Evolutionssprung, bezahlt Anlagen; bleibt dauerhaft erhalten |

### 2.5 Schwarm

| Begriff | Bedeutung |
| --- | --- |
| Kette | Die Stufen der Einheiten eines Zeitalters; jede Stufe ab 2 erzeugt Einheiten der Stufe darunter |
| Einheit | Mitglied einer Stufe der Kette. Soldaten zählen nicht als Einheiten |
| Sammler | Unterste Stufe der Kette; nur Sammler ernten |
| Erzeugung | Einheiten, die eine Stufe der Kette pro Sekunde in der Stufe darunter hervorbringt |
| Masse (M) | Summe der Einzelmassen aller Einheiten und aller Soldaten (Jäger zählen halb); Ausbauten haben keine Masse. Senkt das Reisetempo |
| Antrieb (T) | Entsteht durch den Ausbau für Antrieb (2.9); bestimmt mit der Masse das Reisetempo und ist Voraussetzung für Zugangsschwellen |
| Reichweite | Radius um den Schwarm, in dem Stellen bekannt werden und Fundstücke erscheinen |
| Starre | Zustand, in dem keine Einheiten und keine Brut entstehen |

### 2.6 Reise

| Begriff | Bedeutung |
| --- | --- |
| Reise | Bewegung des Schwarms zu einem Reiseziel; beginnt mit dem Aufbruch, endet mit der Ankunft. Unterwegs ist der Schwarm in Starre |
| Reiseziel | Stelle, zu der eine Reise führt |
| Reisetempo (v) | Kartenpunkte pro Sekunde, abhängig von Antrieb und Masse (`P1-REI-02`) |
| Reisezeit (t_Reise) | Dauer einer Reise: Strecke durch Reisetempo |
| Abzugsreife | Bewertung, ob eine andere ansteuerbare Stelle unter Einrechnung der Reisezeit mehr Ernte bringt als die aktuelle |
| Beste Alternative | Ansteuerbare Stelle mit der höchsten erwarteten Durchschnittsernte unter Einrechnung der Reisezeit (`P1-ABZ-02`) |
| Wanderautomatik | Vom Spieler schaltbare Funktion: Ist die aktuelle Stelle abzugsreif, reist der Schwarm zur besten Alternative |

### 2.7 Kampf und Einnahme (ab Organismen)

| Begriff | Bedeutung |
| --- | --- |
| Soldat | Einzeln gekauftes Mitglied des Schwarms außerhalb der Kette; vermehrt sich nicht, bringt Kampfkraft und Masse |
| Kampfkraft (K) | Summe der Kampfkraftwerte aller Soldaten |
| Abwehr (D) | Widerstand einer Stelle gegen die Einnahme; Ausgangsabwehr D₀ |
| Verteidigte Stelle | Stelle mit Abwehr; sie kann erst nach der Einnahme beerntet werden |
| Belagerung | Zeitraum nach der Ankunft an einer verteidigten Stelle, in dem die Abwehr sinkt; der Schwarm ist dabei in Starre |
| Einnahme | Ende der Belagerung; Soldaten erleiden Verluste, danach ist die Stelle beerntbar |
| Gehaltene Stelle | Eingenommene Stelle, an der der Schwarm erntet; erzeugt Revier |
| Reiseverlust | Verlust an Sammlern auf Reisen (`P2-REI-01`) |
| Gefahrenwert (G) | Gefährlichkeit einer Reisestrecke |
| Schutz (W) | Schutz der Sammler auf Reisen durch Soldaten |

### 2.8 Fortschritt

| Begriff | Bedeutung |
| --- | --- |
| Ausbau | Verbesserung in Rängen, gekauft mit Vorrat oder Revier; gilt für den laufenden Durchlauf |
| Rang (l) | Ausbaustand eines Ausbaus, beginnend bei 0 |
| Fundstück | Zeitlich begrenzt erscheinendes Objekt auf der Karte, das durch eine Spieleraktion eingesammelt wird und einen einmaligen Bonus gibt |
| Fähigkeit | Ab Organismen; mit Instinkt ausgelöster Effekt |
| Mutation | Ab Organismen; mit Genen gekaufter Bonus, gilt für alle weiteren Durchläufe des Zeitalters |
| Anlage | Mit Erbe gekaufter Bonus, gilt dauerhaft für alle folgenden Zeitalter |
| Schwärmen | Kleines Prestige: neuer Durchlauf im selben Zeitalter, gibt Gene |
| Evolutionssprung | Großes Prestige: Wechsel ins nächste Zeitalter, gibt Erbe |
| Sprungbedingung | Voraussetzung für den Evolutionssprung zusätzlich zur Ernte an der Zielstelle (`STR-02`) |

### 2.9 Namen je Zeitalter

| Allgemeiner Begriff | Winzlinge (Phase 1) | Organismen (Phase 2) |
| --- | --- | --- |
| Sammler (Stufe 1) | Fressling | Weider |
| Stufe 2 | Brutling | Brüter |
| Stufe 3 | Eiträgerin | Brutmutter |
| Stufe 4 | Gelege | Nest |
| Stufe 5 | Brutklumpen | Großnest |
| Stufe 6 | Urnest | Schwarmkönigin |
| Brut | Eier | Larven |
| Brutrate | Eier-Rate | Larven-Rate |
| Ausbau für Brutrate | Brutherd | Brutherd |
| Ausbau für Fressleistung | Verdauung | Verdauung |
| Ausbau für Antrieb | Geißeln | Flossen |
| Ausbau für Kapazität | Kropf | Fettkörper |
| Zielstelle | Seegraswiese | Kelpwald |

---

## 3. Spielstruktur

### 3.1 Zeitalter

| Nr. | Zeitalter | Neue Kernmechanik | Schauplatz | MVP |
| --- | --- | --- | --- | --- |
| 1 | Winzlinge | Ernten, Erschöpfen, Reisen | Küste: Wassertropfen bis Flachwasser | Ja, als Einführung von 2 bis 3 Stunden |
| 2 | Organismen | Verteidigte Stellen, Soldaten, Einnehmen | Meer: Gezeitenzone bis offenes Meer | Ja |
| 3 | Herrschaft an Land | Biome mit eigenen Regeln, Spezialisierung | Land | Nein |
| 4 | In den Weltraum | Offen; Reisen von Planet zu Planet, später ganze Sternsysteme | Weltraum | Nein |

### 3.2 Prestige

- **`STR-01` (Muss):** Schwärmen ist ab dem Zeitalter Organismen möglich, sobald die Bedingung **[offen]** erfüllt ist. Es beendet den Durchlauf, erzeugt eine neue Karte desselben Zeitalters und gibt Gene. Gekaufte Mutationen bleiben erhalten.
- **`STR-02` (Muss):** Der Evolutionssprung ist möglich, sobald der Schwarm an der Zielstelle des Zeitalters erntet und die Sprungbedingung erfüllt:
  - Winzlinge: mindestens ein Urnest.
  - Organismen: **[offen]**, Vorschlag analog: mindestens eine Schwarmkönigin.
- **`STR-03` (Muss):** Der Evolutionssprung setzt alles außer Erbe und gekauften Anlagen zurück, auch Gene und Mutationen, und startet das nächste Zeitalter.
- **`STR-04` (Muss):** Der Sprung ist freiwillig. Längeres Bleiben nach Erreichen der Zielstelle erhöht das Erbe (`P2-ERB-01`).
- **`STR-05` (Muss):** Das verlassene Zeitalter wirkt als passiver Bonus weiter. Beispiel: Die Anlage Urhunger erhöht im Zeitalter Organismen die Fressleistung abhängig vom Erbe aus dem Zeitalter Winzlinge.
- **`STR-06` (Muss):** Der MVP endet an der Zielstelle des Zeitalters Organismen. Ein Evolutionssprung in das Zeitalter Herrschaft an Land ist nicht möglich.

### 3.3 Spielablauf

1. **Ernten:** Die Sammler ernten die verfügbare Nahrung der aktuellen Stelle in den Vorrat.
2. **Wachsen:** Vorrat, Brut und Einheiten der Stufe darunter kaufen neue Einheiten; höhere Stufen vermehren die niedrigeren von selbst.
3. **Erschöpfen:** Der Bestand sinkt; ein großer Schwarm leert eine Stelle in Sekunden.
4. **Entdecken:** Stellen innerhalb der Reichweite werden bekannt.
5. **Aufbrechen:** Der Spieler oder die Wanderautomatik wählt ein Reiseziel; unterwegs ist der Schwarm in Starre.
6. **Ankommen:** Ernte am Reiseziel. Ab dem Zeitalter Organismen muss eine verteidigte Stelle zuerst eingenommen werden.

---

## 4. Phase 1: Winzlinge

### 4.1 Startzustand

- **`P1-STA-01` (Muss):** Der Schwarm beginnt mit 50 Vorrat, 10 Eiern und 5 Fresslingen an einer Startstelle in Zone 0.

### 4.2 Kette

- **`P1-KET-01` (Muss):** Die Kette hat sechs Stufen:

| Stufe | Einheit | Erzeugt pro Sekunde | Kosten | Masse |
| --- | --- | --- | --- | --- |
| 1 | Fressling (Sammler) | – (erntet 1 Nahrung/s) | 10 Vorrat, 1 Ei | 1 |
| 2 | Brutling | 2 Fresslinge | 500 Vorrat, 1 Ei, 100 Fresslinge | 5 |
| 3 | Eiträgerin | 3 Brutlinge | 20.000 Vorrat, 1 Ei, 1.000 Brutlinge | 30 |
| 4 | Gelege | 4 Eiträgerinnen | 1 Mio. Vorrat, 1 Ei, 1.000 Eiträgerinnen | 200 |
| 5 | Brutklumpen | 5 Gelege | 50 Mio. Vorrat, 1 Ei, 1.000 Gelege | 1.200 |
| 6 | Urnest | 6 Brutklumpen | 2 Mrd. Vorrat, 1 Ei, 1.000 Brutklumpen | 8.000 |

- **`P1-KET-02` (Muss):** Beim Kauf einer höheren Stufe werden die angegebenen Einheiten der Stufe darunter verbraucht.
- **`P1-KET-03` (Muss):** Fressling und Brutling sind von Beginn an kaufbar. Jede weitere Stufe wird kaufbar, sobald mindestens eine Einheit der Stufe darunter vorhanden ist.
- **`P1-KET-04` (Muss):** Der Spieler kann 1 Einheit, 25 % der höchstmöglichen Menge oder die höchstmögliche Menge kaufen. Die höchstmögliche Menge ist durch Vorrat, Eier und Einheiten der Stufe darunter begrenzt.
- **`P1-KET-05` (Muss):** Jede Stufe ab 2 erzeugt fortlaufend Einheiten der Stufe darunter, außer in Starre (`P1-STR-02`).

### 4.3 Ausbauten

- **`P1-AUS-01` (Muss):** Das Zeitalter Winzlinge hat vier Ausbauten, jeweils mit beliebig vielen Rängen l (beginnend bei 0) und bezahlt mit Vorrat:

| Ausbau | Wirkung bei Rang l | Kosten für den nächsten Rang |
| --- | --- | --- |
| Brutherd | Eier-Rate 1,7^l Eier pro Sekunde | 30 · 3^l |
| Verdauung | Fressleistung 1,5^l | 300 · 5^l |
| Geißeln | Antrieb 50 · 1,8^l | 125 · 2,2^l |
| Kropf | Kapazität 2.000 · 1,5^l | 80 · 1,55^l |

- **`P1-AUS-02` (Muss):** Ausbauten sind keine Einheiten der Kette. Sie haben keine Masse und kosten keine Eier.
- **`P1-AUS-03` (Muss):** Die Reichweite ist kein eigener Ausbau. Sie beträgt 140 Kartenpunkte und wächst je 3 Ränge Geißeln um 70 Kartenpunkte: `Reichweite = 140 + 70 · ⌊l_Geißeln / 3⌋`.
- **`P1-AUS-04` (Soll):** Mehrlinge je Stufe der Kette: Jeder Kauf dieser Stufe bringt zusätzliche Einheiten ohne Kosten mit. Wirkung und Kosten **[offen]**. *(Im Konzept vorgesehen, im Prototyp nicht umgesetzt.)*
- **`P1-AUS-05` (Soll):** Produktion je Stufe der Kette: höhere Erzeugung dieser Stufe. Wirkung und Kosten **[offen]**. *(Im Konzept vorgesehen, im Prototyp nicht umgesetzt.)*

### 4.4 Eier

- **`P1-EIE-01` (Muss):** Eier entstehen fortlaufend mit der Eier-Rate des Brutherds (Rang 0: 1 Ei pro Sekunde), außer in Starre.

### 4.5 Ernte

- **`P1-ERN-01` (Muss):** Der Appetit ist Anzahl Fresslinge × Fressleistung (Ausbau Verdauung). Eine Stelle begrenzt die Ernte pro Sekunde nicht; begrenzt ist nur die Menge.
- **`P1-ERN-02` (Muss):** Pro Zeitschritt wird höchstens die verfügbare Nahrung geerntet: `H = min(Appetit, verfügbare Nahrung / Δt)`. Der Bestand sinkt um die Ernte.
- **`P1-ERN-03` (Muss):** Die Fressgrenze ist durch den Spieler wählbar: 0 %, 10 %, 25 % oder 50 % der Größe. Startwert: 0 % (Kahlfraß).

### 4.6 Vorrat und Kapazität

- **`P1-VOR-01` (Muss):** Bis zur Kapazität C kommt die Ernte vollständig im Vorrat an.
- **`P1-VOR-02` (Muss):** Oberhalb der Kapazität kommt nur der Anteil C/V der Ernte an. Exakt integriert: Der Teil der Ernte oberhalb der Kapazität erhöht V² um 2 · C · Ernte.
- **`P1-VOR-03` (Muss):** Es gibt keine harte Obergrenze. Kein Kauf ist durch die Kapazität ausgeschlossen.
- **`P1-VOR-04` (Muss):** Es gibt keinen Unterhalt. Einheiten verbrauchen keinen Vorrat.

### 4.7 Starre

- **`P1-STR-01` (Muss):** Der Schwarm ist in Starre, wenn mindestens eine Bedingung zutrifft:
  - Er ist unterwegs.
  - Er befindet sich an keiner Stelle.
  - Die verfügbare Nahrung der aktuellen Stelle deckt den Appetit eines Zeitschritts nicht mehr (Stelle leer oder Fressgrenze erreicht). Hat der Schwarm keine Sammler, gilt dies nur, wenn keine Nahrung verfügbar ist.
- **`P1-STR-02` (Muss):** In Starre erzeugt die Kette keine Einheiten und der Brutherd keine Eier. Vorrat, Eier und Einheiten bleiben vollständig erhalten.
- **`P1-STR-03` (Muss):** Im Zeitalter Winzlinge gibt es keinen Hunger-Zustand und keinen Verlust von Einheiten.

### 4.8 Stellen

- **`P1-STE-01` (Muss):** Jede Stelle hat Typ, Zone, Position, Größe, Bestand und gegebenenfalls Wuchs und Eigenheit.
- **`P1-STE-02` (Muss):** Die Größe einer Stelle ist `Basisgröße der Zone × Typfaktor × Zufallsfaktor`. Basisgröße: `5.000 · 60^Zone` (Zone 0 bis 3). Zufallsfaktor: 0,75 bis 1,25. Die Startstelle ist ein Algenfilm mit Zufallsfaktor 0,6.
- **`P1-STE-03` (Muss):** Stellentypen:

| Typ | Typfaktor | Wuchs g | Eigenheit |
| --- | --- | --- | --- |
| Algenfilm | 1 | 0,01/s | – |
| Planktonwolke | 4 | – | Versiegt 180 s nach ihrem Entstehen |
| Toter Krebs | 10 | – | Bestand sinkt zusätzlich um 0,3 % pro Sekunde; unter 1 % der Größe versiegt er |
| Meeresschnee | 3 | 0,003/s | Verdoppelt die Eier-Rate, solange der Schwarm hier erntet |
| Seegraswiese | 100.000 | 0,004/s | Zielstelle der Winzlinge; Zugangsschwelle: Antrieb 100 Mio.; versiegt nie (Bestand fällt nie unter 1 % der Größe) |

- **`P1-STE-04` (Muss):** Wuchs ist logistisch und wirkt nur, solange Bestand vorhanden ist: `dS/dt = g · S · (1 − S/S₀)` für S > 0.
- **`P1-STE-05` (Muss):** Eine Stelle versiegt, wenn ihr Bestand auf 0 fällt oder ihre Eigenheit es vorsieht; ihr Bestand ist dann 0. Eine versiegte Stelle wächst nie mehr nach und ist nicht ansteuerbar. Sie verschwindet 10 Sekunden nach dem Aufbruch des Schwarms von der Karte; befindet sich der Schwarm beim Versiegen nicht an ihr, 10 Sekunden nach dem Versiegen.
- **`P1-STE-06` (Muss):** Verschwindet das Reiseziel einer laufenden Reise, endet die Reise am aktuellen Ort; der Schwarm befindet sich dann an keiner Stelle (Starre).
- **`P1-STE-07` (Muss):** Neue Stellen entstehen fortlaufend: je Zone etwa alle 25 Sekunden eine, solange dort weniger als 10 nicht versiegte Stellen liegen (ohne Zielstelle). Gewichtung der Typen: Algenfilm 3, Planktonwolke 1, Toter Krebs 1, Meeresschnee 1. Neue Stellen sind zunächst unbekannt.

### 4.9 Karte und Zonen

- **`P1-KAR-01` (Muss):** Die Karte des Zeitalters Winzlinge hat vier Zonen:

| Zone | Name | Zugangsschwelle (Antrieb) |
| --- | --- | --- |
| 0 | Wassertropfen | 0 |
| 1 | Gezeitentümpel | 500 |
| 2 | Felsenbecken | 20.000 |
| 3 | Flachwasser | 1 Mio. |

- **`P1-KAR-02` (Muss):** Die Karte wird für jedes neue Spiel zufällig erzeugt: je Zone drei Algenfilme, eine Planktonwolke, ein Toter Krebs und ein Meeresschnee, dazu die Seegraswiese am Ende von Zone 3. Die Startstelle liegt am Rand von Zone 0.
- **`P1-KAR-03` (Muss):** Eine Stelle wird bekannt, sobald ihr Abstand zum Schwarm höchstens die Reichweite beträgt. Bekannte Stellen bleiben bekannt, bis sie verschwinden.
- **`P1-KAR-04` (Muss):** Eine Stelle ist erreichbar, wenn der Antrieb mindestens ihre Zugangsschwelle erreicht. Die Zugangsschwelle einer Stelle ist die ihrer Zone oder, falls höher, die ihres Typs.

### 4.10 Reise

- **`P1-REI-01` (Muss):** Der Schwarm kann zu jeder ansteuerbaren Stelle (bekannt, erreichbar, nicht versiegt) reisen, sofern er nicht bereits unterwegs ist.
- **`P1-REI-02` (Muss):** Reisetempo in Kartenpunkten pro Sekunde: `v = 20 · max(0,25; √min(1, T/M))`.
- **`P1-REI-03` (Muss):** Mit dem Aufbruch endet die Ernte; unterwegs ist der Schwarm in Starre.
- **`P1-REI-04` (Muss):** Im Zeitalter Winzlinge gibt es keine Reiseverluste.

### 4.11 Abzugsreife und Wanderautomatik

- **`P1-ABZ-01` (Muss):** Für jede ansteuerbare Stelle j außer der aktuellen wird die erwartete Durchschnittsernte unter Einrechnung der Reise ermittelt: `Ø_j = A_j / (t_Reise,j + A_j / Appetit)` mit A_j = verfügbare Nahrung an j.
- **`P1-ABZ-02` (Muss):** Die aktuelle Stelle ist abzugsreif, wenn der Schwarm in Starre ist oder die Ernte unter dem höchsten Ø_j liegt. Die Stelle mit dem höchsten Ø_j ist die beste Alternative.
- **`P1-AUT-01` (Muss):** Die Wanderautomatik ist durch den Spieler ein- und ausschaltbar (Startwert: aus). Ist sie eingeschaltet und die aktuelle Stelle abzugsreif, reist der Schwarm zur besten Alternative.
- **`P1-AUT-02` (Muss):** Die Wanderautomatik wirkt auch während der Nachberechnung (`ALL-OFF-02`).

### 4.12 Fundstücke

- **`P1-FUN-01` (Muss):** Etwa alle 2 bis 3 Minuten (Zielwert 180 s, zufällig gestreut) entsteht ein Fundstück an einer zufälligen Position innerhalb der Reichweite.
- **`P1-FUN-02` (Muss):** Ein Fundstück besteht 30 Sekunden. Es wird durch eine Spieleraktion eingesammelt; danach wirkt es und wird entfernt. Nicht eingesammelte Fundstücke verfallen.
- **`P1-FUN-03` (Muss):** Während der Nachberechnung entstehen keine Fundstücke.
- **`P1-FUN-04` (Muss):** Typen, Gewichtung und Wirkung:

| Fundstück | Gewicht | Wirkung |
| --- | --- | --- |
| Fressrausch | 3 | Appetit ×3 für 60 s |
| Legeschub | 3 | Eier-Rate ×5 für 60 s |
| Vermehrungsrausch | 3 | Erzeugung der Kette ×3 für 60 s |
| Rückenwind | 2 | Reisetempo ×4 für 60 s |
| Nahrungsblase | 3 | Sofort Vorrat in Höhe von max(1.000; 180 × durchschnittliche Ernte der letzten rund 2 Minuten); unterliegt nicht der Kapazität |
| Eierballen | 2 | Sofort Eier in Höhe von max(50; 180 × Eier-Rate) |
| Wachstumsschub | 2 | Sofort so viele Einheiten, wie die Kette in 120 Sekunden erzeugt |
| Keimzelle | 1 | Der nächste Rang eines Ausbaus nach Wahl kostet nichts |

- **`P1-FUN-05` (Muss):** Zeitlich begrenzte Wirkungen desselben Typs addieren ihre Restdauer. Mehrere Keimzellen sammeln sich als Gratis-Ränge an.
- **`P1-FUN-06` (Muss):** Die Wirkungen von Vermehrungsrausch und Legeschub greifen nicht in Starre.

### 4.13 Abschluss des Zeitalters

- **`P1-END-01` (Muss):** Der Evolutionssprung in das Zeitalter Organismen wird möglich, sobald der Schwarm an der Seegraswiese erntet und mindestens ein Urnest besitzt.
- **`P1-END-02` (Muss):** Im Zeitalter Winzlinge gibt es kein Schwärmen.

---

## 5. Phase 2: Organismen

Das Zeitalter Organismen ist im Prototyp nicht umgesetzt. Alle Mechaniken des Zeitalters Winzlinge gelten weiter, sofern hier nichts anderes steht.

### 5.1 Ressourcen

| Ressource | Entsteht durch | Verwendung |
| --- | --- | --- |
| Vorrat | Ernte | Einheiten, Soldaten und Ausbauten |
| Larven (Brut) | Brutherd und Ausbau Ausbreitung | Jede neu gekaufte Einheit und jeder Soldat kostet eine Larve |
| Revier | Gehaltene Stellen (`P2-EIN-04`) | Ausbau Ausbreitung |
| Instinkt | Ausbau Schwarmgeist, Rate und Höchstmenge **[offen]** | Fähigkeiten |
| Gene | Schwärmen | Mutationen |
| Erbe | Evolutionssprung | Anlagen |

### 5.2 Kette und Ausbauten

- **`P2-KET-01` (Muss):** Die Kette hat sechs Stufen: Weider (Sammler) → Brüter → Brutmutter → Nest → Großnest → Schwarmkönigin. Erzeugung, Kosten und Masse folgen dem Muster der Winzlinge auf höherer Skala **[offen]**. Höhere Stufen kosten Einheiten der Stufe darunter.
- **`P2-AUS-01` (Muss):** Ausbauten wie im Zeitalter Winzlinge; der Ausbau für Antrieb heißt Flossen, der für Kapazität Fettkörper.
- **`P2-AUS-02` (Muss):** Zusätzlich: Ausbreitung (kostet Revier, erhöht die Larven-Rate) und Schwarmgeist (erzeugt Instinkt). Werte **[offen]**.

### 5.3 Soldaten

- **`P2-SOL-01` (Muss):** Soldaten werden einzeln gekauft, gehören nicht zur Kette und vermehren sich nicht. Sie zählen zur Masse.

| Soldat | Kampfkraft | Masse | Kosten | Eigenheit |
| --- | --- | --- | --- | --- |
| Beißer | 1 | 2 | 50 Vorrat, 1 Larve | – |
| Stecher | 12 | 15 | 4.000 Vorrat, 1 Larve | – |
| Panzerträger | 150 | 200 | 350.000 Vorrat, 1 Larve | Halbiert die Verluste aller Soldaten |
| Jäger | 2.000 | 800 | 30 Mio. Vorrat, 1 Larve | Zählt für das Reisetempo nur mit halber Masse |
| Koloss | 30.000 | 20.000 | 2,5 Mrd. Vorrat, 1 Larve | – |

### 5.4 Stellen und Zonen

| Typ | Größe | Abwehr | Eigenheit |
| --- | --- | --- | --- |
| Algenmatte | klein | keine | – |
| Muschelbank | mittel | gering | Hoher Wuchs |
| Korallenriff | groß | mittel | Abwehr wächst nach dem Aufbruch des Schwarms nach (`P2-EIN-05`) |
| Quallenschwarm | groß | gering | Bewegt sich selbst über die Karte |
| Walkadaver | sehr groß | hoch | Bestand zerfällt auch ohne Ernte |
| Kelpwald | sehr groß | hoch | Zielstelle der Organismen |

Zonen in dieser Reihenfolge: Gezeitenzone, Lagune, Riff, offenes Meer. Typfaktoren, Basisgrößen, Wuchs und Zugangsschwellen **[offen]**.

### 5.5 Einnehmen

- **`P2-EIN-01` (Muss):** Eine Stelle mit Abwehr kann erst nach ihrer Einnahme beerntet werden. Ausgangsabwehr: `D₀ = 0,05 · S₀^0,8`.
- **`P2-EIN-02` (Muss):** Nach der Ankunft beginnt die Belagerung automatisch. Die Abwehr sinkt mit `κ · K` pro Sekunde (κ = 0,1); die Einnahme dauert also `D / (κ · K)` Sekunden. Während der Belagerung ist der Schwarm in Starre.
- **`P2-EIN-03` (Muss):** Bei der Einnahme verlieren alle Soldatenarten den Anteil `q = min(0,5; 0,2 · D/K)` (D = Abwehr zu Beginn der Belagerung). Panzerträger halbieren q.
- **`P2-EIN-04` (Muss):** Eingenommene Stellen gelten als gehalten, solange der Schwarm an ihnen erntet, und erzeugen dabei Revier. Rate **[offen]**.
- **`P2-EIN-05` (Muss):** Nach dem Aufbruch des Schwarms wächst die Abwehr zurück: `dD/dt = r_D · (D₀ − D)`. r_D **[offen]**.
- **`P2-EIN-06` (Muss):** Stellen greifen den Schwarm nie an. Verluste entstehen nur bei der Einnahme und auf Reisen.
- **`P2-EIN-07` (Muss):** Eine Stelle, deren Abwehr die Kampfkraft um mehr als den Faktor **[offen]** übersteigt, ist nicht ansteuerbar.

### 5.6 Reiseverluste

- **`P2-REI-01` (Muss):** Auf Reisen verlieren nur Sammler Einheiten: `ΔN₁ = N₁ · λ · d · max(0; 1 − W/G)`. d = Reisestrecke in Kartenpunkten. Vorschlag: λ = 1 % je 100 Kartenpunkte. W = Schutz durch Soldaten, Vorschlag: Kampfkraft. G = Gefahrenwert der Strecke, Vorschlag: abhängig von der Zone. Konkrete Werte **[offen]**.
- **`P2-REI-02` (Muss):** Höhere Stufen der Kette und Soldaten gehen auf Reisen nie verloren.

### 5.7 Fähigkeiten

- **`P2-FAE-01` (Muss):** Mindestens vier der folgenden Fähigkeiten sind im MVP enthalten; Instinktkosten und Abklingzeiten **[offen]**:

| Fähigkeit | Wirkung |
| --- | --- |
| Larvenflut | Verdoppelt sofort die vorhandenen Larven |
| Fressgier | Appetit ×2 für 5 Minuten |
| Gewaltmarsch | Halbiert die verbleibende Reisezeit |
| Spiegelschwarm | Vervielfältigt einen Teil der Soldaten |
| Sturmangriff | Kampfkraft ×3 für 2 Minuten |
| Schonzeit | Eine verlassene Stelle wächst eine Stunde lang dreimal so schnell nach |

### 5.8 Schwärmen und Mutationen

- **`P2-SCH-01` (Muss):** Gene beim Schwärmen: `⌊(Gesamternte des Durchlaufs / 10¹²)^0,2 · (1 + 0,5 · z)⌋`, z = Anzahl erreichter Zonen.
- **`P2-SCH-02` (Muss):** Etwa 12 Mutationen in drei Gruppen; Werte und Kosten **[offen]**:
  - Heuschrecke: mehr Ernte, mehr Kampfkraft, schnellere Reisen; dafür wachsen verlassene Stellen langsamer nach.
  - Hirte: mehr Wuchs an verlassenen Stellen, langsamer nachwachsende Abwehr, die Wanderautomatik bevorzugt nachgewachsene Stellen.
  - Neutral: Teil der bekannten Karte bleibt beim Schwärmen erhalten, häufigere Fundstücke, Startvorrat, höhere Instinkt-Höchstmenge.

### 5.9 Evolutionssprung und Erbe

- **`P2-ERB-01` (Muss):** Erbe beim Sprung: `⌊log₁₀(Gesamternte des Zeitalters über alle Durchläufe) − 12⌋ · (1 + 0,1 · t_Z)`, t_Z = Stunden seit Erreichen der Zielstelle.
- **`P2-ERB-02` (Muss):** Mindestens drei Anlagen; Werte und Kosten **[offen]**:
  - Urhunger: höhere Fressleistung, abhängig vom Erbe aus dem Zeitalter Winzlinge.
  - Ur-Instinkt: Instinkt und Fähigkeiten ab Beginn des Zeitalters.
  - Schnellstart: das Zeitalter beginnt mit zusätzlichem Vorrat und ersten Einheiten.

---

## 6. Übergreifende Anforderungen

### 6.1 Speichern und Abwesenheit

- **`ALL-OFF-01` (Muss):** Der Spielstand wird automatisch lokal gespeichert, mindestens alle 10 Sekunden und beim Beenden.
- **`ALL-OFF-02` (Muss):** Beim nächsten Start wird die Abwesenheit nachberechnet, ereignisbasiert oder in festen Zeitschritten. Höchstdauer: 24 Stunden *(Prototyp: 4 Stunden)*.
- **`ALL-OFF-03` (Muss):** Ereignisse während der Nachberechnung werden protokolliert: Ankünfte, versiegte Stellen, Dauer der Starre, Gesamternte.
- **`ALL-OFF-04` (Muss):** Der Spielstand kann exportiert und importiert werden.
- **`ALL-OFF-05` (Muss):** Spielstände älterer Versionen werden ergänzt oder kontrolliert zurückgesetzt, nie unbemerkt beschädigt.

### 6.2 Aktives und passives Spiel

- **`ALL-BAL-01` (Muss):** Aktives Spielen bringt Vorteile (Fundstücke, Ausgeben des Vorrats unterhalb der Kapazität, Wahl des Zeitpunkts). Passives Spielen wird nicht bestraft (weiche Obergrenze, Wanderautomatik, keine Verluste im Zeitalter Winzlinge).
- **`ALL-BAL-02` (Soll):** Ein Spieler, der alle Fundstücke einsammelt, schließt das Zeitalter Winzlinge höchstens etwa doppelt so schnell ab wie einer, der keine einsammelt.

### 6.3 Pacing

| Meilenstein | Zielwert |
| --- | --- |
| Erste Reise | nach 3 bis 5 Minuten |
| Erste Stelle versiegt | in den ersten Minuten |
| Evolutionssprung in das Zeitalter Organismen | nach 2 bis 3 Stunden |
| Erste Einnahme | 10 Minuten nach Beginn des Zeitalters Organismen |
| Erstes Schwärmen | nach 1 bis 2 Tagen im Zeitalter Organismen |
| Zielstelle der Organismen (Ende des MVP) | nach etwa 2 Wochen |

Simulationsergebnisse des Prototyps (automatischer Spieler, mehrere zufällige Karten): Das Zeitalter Winzlinge dauert mit allen Fundstücken 1,5 bis 2,3 Stunden, ohne Fundstücke 2,3 bis über 6 Stunden. Die Fundstücke erschienen dabei häufiger als in `P1-FUN-01` vorgesehen (etwa alle 1,5 bis 2 Minuten), und die Simulation enthielt noch das inzwischen gestrichene Fundstück Frische Strömung; mit dem Zielwert dürfte ihr Vorteil kleiner ausfallen. Die weiche Obergrenze bringt einem Spieler, der nur alle 30 Minuten eingreift, 1,5- bis 3-mal so viel Ernte wie eine harte Obergrenze. Tests mit Menschen stehen aus.

### 6.4 Konfiguration

- **`ALL-CFG-01` (Muss):** Alle Spielwerte (Einheiten, Stellen, Zonen, Ausbauten, Fundstücke, Fähigkeiten, Formelparameter) liegen in einer Datendatei, sodass das Balancing ohne Codeänderung angepasst werden kann.

---

## 7. Technische Anforderungen

- **`TEC-01` (Muss):** Browser-Spiel in TypeScript.
- **`TEC-02` (Muss):** Zahlenbereich mindestens bis 10³⁰⁸, mit einer Bibliothek für große Zahlen (z. B. break_infinity.js) erweiterbar.
- **`TEC-03` (Muss):** Die Simulation läuft in festen Zeitschritten von höchstens 0,25 Sekunden oder ereignisbasiert. Geschlossene Formeln reichen nicht aus, weil Stellen erschöpft werden.
- **`TEC-04` (Muss):** Die Spiellogik ist eigenständig ausführbar, damit sie automatisiert simuliert werden kann (Balancing, Regressionstests).
- **`TEC-05` (Soll):** Ein Testmodus beschleunigt die Spielzeit (Prototyp: 1×, 5×, 20×, 100×).
- **`TEC-06` (Soll):** Für Spieltests werden erfasst: Zeitpunkt der ersten Reise, Anzahl der Reisen, versiegte und neu entstandene Stellen, eingesammelte und verfallene Fundstücke, Spielzeit bis zum Evolutionssprung.

---

## 8. Ausblick nach dem MVP

- **Herrschaft an Land (Phase 3):** Biome mit eigenen Regeln. Strand: Stellen entstehen und verschwinden mit den Gezeiten. Wald: viele kleine Stellen, kurze Wege. Wüste: weite Wege, Hitze kostet Vorrat. Gebirge: Pässe, Kälte senkt das Reisetempo. Stadt: große Stellen mit sich anpassender Abwehr. Weitere Kandidaten: Jahreszeiten, Ableger, auf Biome spezialisierte Einheiten.
- **In den Weltraum (Phase 4):** Von Planet zu Planet bis zum leer gefressenen Sonnensystem, dann ganze Sternsysteme, Sternhaufen, Galaxien. Kernmechanik offen; Ideen: Reisen über Generationen, vorausfliegende Sporenschiffe, Sterne als Energiequelle, rivalisierende Schwärme.
- **Weitere Kandidaten:** Ableger (zurückgelassene Teilschwärme, die weiter ernten), frei festlegbare Reiserouten.

---

## 9. Offene Punkte

### 9.1 Offene Designfragen

1. Wie viel Zeit in Starre ist noch spannend und nicht frustrierend?
2. Wie stark darf Erbe das nächste Zeitalter beschleunigen, ohne dessen erste Stunden zu entwerten?
3. Wird die Karte für jeden Durchlauf neu erzeugt, oder gibt es eine feste Welt mit Zufallsstartwert?
4. Was ist die Kernmechanik des Zeitalters In den Weltraum?

### 9.2 Noch festzulegende Werte

| Kennung | Offener Wert |
| --- | --- |
| `STR-01` | Bedingung für das Schwärmen (Vorschlag: Erreichen der Zone Riff) |
| `STR-02` | Sprungbedingung der Organismen (Vorschlag: mindestens eine Schwarmkönigin an der Zielstelle) |
| `P1-AUS-04`, `P1-AUS-05` | Wirkung und Kosten von Mehrlingen und Produktions-Ausbau |
| `P2-KET-01` | Erzeugung, Kosten und Masse der Kette der Organismen |
| `P2-AUS-02` | Werte von Ausbreitung und Schwarmgeist; Instinkt-Rate und -Höchstmenge |
| 5.4 | Typfaktoren, Basisgrößen, Wuchs und Zugangsschwellen der Stellen und Zonen der Organismen |
| `P2-EIN-04`, `P2-EIN-05`, `P2-EIN-07` | Revier-Rate, r_D, Grenze für ansteuerbare Abwehr |
| `P2-REI-01` | λ, W und G der Reiseverluste |
| `P2-FAE-01` | Instinktkosten und Abklingzeiten der Fähigkeiten |
| `P2-SCH-02`, `P2-ERB-02` | Werte und Kosten der Mutationen und Anlagen |

### 9.3 Nächste Schritte

- [x] Prototyp des Zeitalters Winzlinge
- [x] Pacing der Winzlinge per Simulation prüfen
- [ ] Spieltest des Prototyps mit Menschen
- [ ] Balancing anhand der Testergebnisse anpassen
- [ ] Werte aus 9.2 festlegen, beginnend mit der Einnahme
- [ ] Organismen und Evolutionssprung in den Prototyp übernehmen

---

*Grundlage der Abzugsreife: E. L. Charnov, „Optimal foraging, the marginal value theorem“, Theoretical Population Biology, 1976.*
