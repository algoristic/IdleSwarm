# IdleSwarm – Produktspezifikation

| | |
| --- | --- |
| Arbeitstitel | IdleSwarm |
| Dokumentstand | 25. November 2026, Version 5 |
| Grundlage | Konzept „IdleSwarm – Konzept für ein Idle Game“ und Prototyp des Zeitalters Winzlinge (Version 5) |
| Umfang | MVP: Zeitalter Winzlinge (Phase 1). Organismen (Phase 2) als Konzeptstand, nicht Teil des MVP |
| Gegenstand | Spielmechaniken und Funktionen |

Anforderungen tragen eine Kennung (z. B. `P1-ERN-01`) und eine Verbindlichkeit: **Muss** ist für den MVP verpflichtend, **Soll** ist erwünscht, **Kann** ist optional. Für Anforderungen an Inhalte außerhalb des MVP (1.4) gilt die Verbindlichkeit erst, wenn sie in den Umfang aufgenommen werden. Zahlenwerte stammen, wo nicht anders vermerkt, aus dem Prototyp und sind Startwerte für das Balancing. Werte, die noch nicht feststehen, sind mit **[offen]** markiert und in Abschnitt 9 gesammelt.

---

## 1. Produktüberblick

### 1.1 Vision

IdleSwarm ist ein Idle Game, in dem ein insektenartiger Schwarm vom winzigen Krabbler bis zur galaxiefressenden Macht wächst. Jede Stelle mit Nahrung ist endlich: Der Schwarm frisst sie leer und muss weiterreisen.

Motor ist eine Kette von Einheiten, in der jede Stufe die Stufe darunter vermehrt. Nahrung entsteht nicht aus dem Nichts, sondern wird aus endlichen Stellen geerntet. Daraus entsteht neben dem Kaufen eine zweite Spielachse: **Wann bricht der Schwarm auf, wohin reist er, und was lässt er zurück?**

### 1.2 Zielgruppe und Plattform

- Spielerinnen und Spieler von Idle- und Incremental-Games, die neben Zahlenwachstum Entscheidungen und Timing schätzen.
- Plattform: Browser, mobile first. Ausgelegt auf Smartphones im Hochformat; auf Tablet und Desktop ebenfalls spielbar.
- Das Spiel muss sowohl aktiv (häufige Eingriffe) als auch passiv (lange Abwesenheit) tragfähig sein.

### 1.3 Ziele des MVP

Der MVP umfasst nur das Zeitalter Winzlinge und soll eine Frage beantworten: **Machen das Ernten, Erschöpfen und Reisen auf Dauer Spaß?** Erst wenn das gesichert ist, wird das Zeitalter Organismen ausgearbeitet.

Erfolgskriterien:

1. Aktive Testspieler markieren Fundstücke und nehmen dafür Umwege in Kauf.
2. Testspieler verstehen, warum und wohin der Schwarm weiterzieht, ohne die zugrunde liegende Formel zu kennen.
3. Testspieler spielen das Zeitalter Winzlinge freiwillig bis zur Zielstelle.

### 1.4 Nicht Teil des MVP

- Das Zeitalter Organismen (Phase 2) mit Soldaten, Einnahme, Fähigkeiten, Schwärmen, Mutationen, Evolutionssprung, Erbe und Anlagen. Abschnitt 5 hält den Konzeptstand fest; die Ausarbeitung folgt separat, sobald der MVP mit Phase 1 Spaß macht.
- Die Zeitalter Herrschaft an Land (Phase 3) und In den Weltraum (Phase 4).
- Ableger, frei festlegbare Reiserouten, Jahreszeiten.
- Erfolge, Statistiken für Spieler, Cloud-Speicher.

---

## 2. Begriffe

Die Begriffe gelten für alle Zeitalter. Wo ein Zeitalter eigene Namen verwendet, stehen sie in 2.9.

### 2.1 Struktur

| Begriff | Bedeutung |
| --- | --- |
| Zeitalter | Großer Spielabschnitt mit eigener Kernmechanik, eigener Karte und eigenen Namen. Im MVP: Winzlinge. „Phase n“ bezeichnet das n-te Zeitalter und steht nur in Überschriften und Kennungen (`P1-`, `P2-`) |
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
| Verfügbare Nahrung | Teil des Bestands, den der Schwarm fressen kann; im Zeitalter Winzlinge der gesamte Bestand, an der Seegraswiese der Bestand oberhalb von 1 % der Größe (`P1-ERN-03`) |
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
| Reichweite | Radius um den Schwarm, in dem Stellen bekannt werden |
| Starre | Zustand, in dem keine Einheiten und keine Brut entstehen |

### 2.6 Reise

| Begriff | Bedeutung |
| --- | --- |
| Reise | Bewegung des Schwarms zu einem Reiseziel; beginnt mit dem Aufbruch, endet mit der Ankunft. Unterwegs ist der Schwarm in Starre |
| Reiseziel | Stelle oder Fundstück, zu dem eine Reise führt |
| Reisetempo (v) | Kartenpunkte pro Sekunde, abhängig von Antrieb und Masse (`P1-REI-02`) |
| Reisezeit (t_Reise) | Dauer einer Reise: Strecke durch Reisetempo |
| Abzugsreife | Bewertung, ob eine andere ansteuerbare Stelle unter Einrechnung der Reisezeit mehr Ernte bringt als die aktuelle |
| Beste Alternative | Ansteuerbare Stelle mit der höchsten erwarteten Durchschnittsernte unter Einrechnung der Reisezeit (`P1-ABZ-02`) |
| Wanderautomatik | Stets aktive Funktion: Ist die aktuelle Stelle abzugsreif oder verlässt der Spieler sie, reist der Schwarm zum markierten Ziel oder, ohne Markierung, zur besten Alternative (`P1-AUT-01`) |
| Markiertes Ziel | Vom Spieler markierte Stelle oder markiertes Fundstück, das die Wanderautomatik beim nächsten Aufbruch ansteuert (`P1-AUT-03`) |

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
| Fundstück | Objekt an einer festen Position einer Zone; der Schwarm sammelt es ein, wenn er dorthin reist, und erhält einen einmaligen Bonus (`P1-FUN-01`) |
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
| 2 | Organismen | Verteidigte Stellen, Soldaten, Einnehmen | Meer: Gezeitenzone bis offenes Meer | Nein, wird separat ausgearbeitet |
| 3 | Herrschaft an Land | Biome mit eigenen Regeln, Spezialisierung | Land | Nein |
| 4 | In den Weltraum | Offen; Reisen von Planet zu Planet, später ganze Sternsysteme | Weltraum | Nein |

### 3.2 Prestige

Prestige ist nicht Teil des MVP. `STR-01` bis `STR-05` beschreiben den Konzeptstand ab dem Zeitalter Organismen; im MVP gilt nur die Sprungbedingung der Winzlinge aus `STR-02` als Ende des Spiels (`STR-06`).

- **`STR-01` (Muss):** Schwärmen ist ab dem Zeitalter Organismen möglich, sobald die Bedingung **[offen]** erfüllt ist. Es beendet den Durchlauf, erzeugt eine neue Karte desselben Zeitalters und gibt Gene. Gekaufte Mutationen bleiben erhalten.
- **`STR-02` (Muss):** Der Evolutionssprung ist möglich, sobald der Schwarm an der Zielstelle des Zeitalters erntet und die Sprungbedingung erfüllt:
  - Winzlinge: mindestens ein Urnest.
  - Organismen: **[offen]**, Vorschlag analog: mindestens eine Schwarmkönigin.
- **`STR-03` (Muss):** Der Evolutionssprung setzt alles außer Erbe und gekauften Anlagen zurück, auch Gene und Mutationen, und startet das nächste Zeitalter.
- **`STR-04` (Muss):** Der Sprung ist freiwillig. Längeres Bleiben nach Erreichen der Zielstelle erhöht das Erbe (`P2-ERB-01`).
- **`STR-05` (Muss):** Das verlassene Zeitalter wirkt als passiver Bonus weiter. Beispiel: Die Anlage Urhunger erhöht im Zeitalter Organismen die Fressleistung abhängig vom Erbe aus dem Zeitalter Winzlinge.
- **`STR-06` (Muss):** Der MVP endet, sobald der Schwarm an der Seegraswiese erntet und die Sprungbedingung der Winzlinge erfüllt (`P1-END-01`). Ein Evolutionssprung ist im MVP nicht möglich; stattdessen gilt `P1-END-03`.

### 3.3 Spielablauf

1. **Ernten:** Die Sammler ernten die verfügbare Nahrung der aktuellen Stelle in den Vorrat.
2. **Wachsen:** Vorrat, Brut und Einheiten der Stufe darunter kaufen neue Einheiten; höhere Stufen vermehren die niedrigeren von selbst.
3. **Erschöpfen:** Der Bestand sinkt; ein großer Schwarm leert eine Stelle in Sekunden.
4. **Entdecken:** Stellen innerhalb der Reichweite werden bekannt.
5. **Aufbrechen:** Ist die Stelle abzugsreif oder verlässt der Spieler sie, bricht die Wanderautomatik zum markierten Ziel oder zur besten Alternative auf; unterwegs ist der Schwarm in Starre.
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
- **`P1-ERN-03` (Muss):** Der Schwarm frisst jede Stelle vollständig leer; eine Fressgrenze gibt es im Zeitalter Winzlinge nicht. Ausnahme ist die Seegraswiese, deren Bestand nie unter 1 % der Größe fällt (`P1-STE-03`). Wer eine Stelle schonen will, verlässt sie vorher (`P1-AUT-04`); der Restbestand wächst dann nach. *(Eine wählbare Fressgrenze kann ab dem Zeitalter Organismen zusammen mit der Mutationsgruppe Hirte wieder aufgenommen werden.)*

### 4.6 Vorrat und Kapazität

- **`P1-VOR-01` (Muss):** Bis zur Kapazität C kommt die Ernte vollständig im Vorrat an.
- **`P1-VOR-02` (Muss):** Oberhalb der Kapazität kommt nur der Anteil C/V der Ernte an. Exakt integriert: Der Teil der Ernte oberhalb der Kapazität erhöht V² um 2 · C · Ernte.
- **`P1-VOR-03` (Muss):** Es gibt keine harte Obergrenze. Kein Kauf ist durch die Kapazität ausgeschlossen.
- **`P1-VOR-04` (Muss):** Es gibt keinen Unterhalt. Einheiten verbrauchen keinen Vorrat.

### 4.7 Starre

- **`P1-STR-01` (Muss):** Der Schwarm ist in Starre, wenn mindestens eine Bedingung zutrifft:
  - Er ist unterwegs.
  - Er befindet sich an keiner Stelle.
  - Die verfügbare Nahrung der aktuellen Stelle deckt den Appetit eines Zeitschritts nicht mehr (Stelle leer). Hat der Schwarm keine Sammler, gilt dies nur, wenn keine Nahrung verfügbar ist.
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
| Toter Krebs | 10 | – | Bestand sinkt zusätzlich um 0,3 % des aktuellen Bestands pro Sekunde (exponentiell, nach etwa 25 Minuten unter 1 %); unter 1 % der Größe versiegt er |
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

- **`P1-KAR-02` (Muss):** Die Karte wird für jedes neue Spiel zufällig erzeugt: je Zone drei Algenfilme, ein Toter Krebs und ein Meeresschnee, dazu die Seegraswiese am Ende von Zone 3. Planktonwolken entstehen nur als neue Stellen (`P1-STE-07`), weil sie auf der Startkarte versiegen würden, bevor der Schwarm ihre Zone erreicht. Die Startstelle liegt am Rand von Zone 0.
- **`P1-KAR-03` (Muss):** Eine Stelle wird bekannt, sobald ihr Abstand zum Schwarm höchstens die Reichweite beträgt. Bekannte Stellen bleiben bekannt, bis sie verschwinden.
- **`P1-KAR-04` (Muss):** Eine Stelle ist erreichbar, wenn der Antrieb mindestens ihre Zugangsschwelle erreicht. Die Zugangsschwelle einer Stelle ist die ihrer Zone oder, falls höher, die ihres Typs.

### 4.10 Reise

- **`P1-REI-01` (Muss):** Reisen löst nur die Wanderautomatik aus (`P1-AUT-01`). Reiseziel ist eine ansteuerbare Stelle (bekannt, erreichbar, nicht versiegt) oder ein ansteuerbares Fundstück (`P1-FUN-03`). Eine laufende Reise lässt sich nicht umlenken.
- **`P1-REI-02` (Muss):** Reisetempo in Kartenpunkten pro Sekunde: `v = 20 · max(0,25; √min(1, T/M))`.
- **`P1-REI-03` (Muss):** Mit dem Aufbruch endet die Ernte; unterwegs ist der Schwarm in Starre.
- **`P1-REI-04` (Muss):** Im Zeitalter Winzlinge gibt es keine Reiseverluste.

### 4.11 Abzugsreife, Wanderautomatik und Markierung

- **`P1-ABZ-01` (Muss):** Für jede ansteuerbare Stelle j außer der aktuellen wird die erwartete Durchschnittsernte unter Einrechnung der Reise ermittelt: `Ø_j = A_j / (t_Reise,j + A_j / Appetit)`. A_j ist die verfügbare Nahrung an j bei der Ankunft: Verfall und Versiegen während der Reise werden aus den Eigenheiten eingerechnet (eine Planktonwolke, die vor der Ankunft versiegt, ergibt 0; ein toter Krebs wird um seinen Verfall gemindert), Wuchs während der Reise nicht.
- **`P1-ABZ-02` (Muss):** Die aktuelle Stelle ist abzugsreif, wenn mindestens eine Bedingung zutrifft:
  - Ihre verfügbare Nahrung deckt den Appetit nicht mehr.
  - Der Schwarm befindet sich an keiner Stelle.
  - Die Ernte liegt unter dem höchsten Ø_j.

  Die Stelle mit dem höchsten Ø_j ist die beste Alternative. *Hinweis: Da die Ernte im Zeitalter Winzlinge bis zum Leeren der Stelle dem Appetit entspricht (`P1-ERN-01`), greift die dritte Bedingung praktisch nie; abzugsreif ist eine Stelle hier, wenn sie leer ist. Die Bedingung bleibt für Ernte-Modelle erhalten, bei denen die Ernte mit dem Bestand sinkt.*
- **`P1-AUT-01` (Muss):** Die Wanderautomatik ist immer aktiv und nicht abschaltbar. Ist die aktuelle Stelle abzugsreif oder verlässt der Spieler sie (`P1-AUT-04`), bricht der Schwarm auf: zum markierten Ziel, falls eines besteht, sonst zur besten Alternative. Gibt es kein ansteuerbares Ziel, bleibt der Schwarm.
- **`P1-AUT-02` (Muss):** Die Wanderautomatik wirkt auch während der Nachberechnung (`ALL-OFF-02`), einschließlich eines markierten Ziels.
- **`P1-AUT-03` (Muss):** Der Spieler kann genau ein Ziel markieren: eine ansteuerbare Stelle oder ein ansteuerbares Fundstück. Die Markierung löst keinen Aufbruch aus, sondern bestimmt nur das Ziel des nächsten Aufbruchs. Sie ist auch unterwegs möglich, lässt sich aufheben und erlischt mit der Ankunft am Ziel oder sobald das Ziel nicht mehr ansteuerbar ist. Würde eine markierte Stelle vor der Ankunft versiegen (`P1-ABZ-01`), erhält der Spieler einen Hinweis. Ist nach der Ankunft nichts markiert, wählt die Wanderautomatik das nächste Ziel wieder selbst.
- **`P1-AUT-04` (Muss):** An jeder Stelle kann der Spieler „Stelle verlassen“ auslösen. Der Schwarm bricht dann sofort auf wie in `P1-AUT-01`; der Restbestand bleibt an der Stelle.

### 4.12 Fundstücke

- **`P1-FUN-01` (Muss):** Fundstücke liegen an einer festen Position innerhalb einer Zone und bestehen, bis sie eingesammelt werden oder ihre Zone zurückfällt. Je Zone liegt höchstens ein Fundstück. Bei Spielbeginn liegt in jeder Zone eines.
- **`P1-FUN-02` (Muss):** Vorderste Zonen sind die höchste erreichbare Zone und die Zone davor. Wird ein Fundstück in einer vordersten Zone eingesammelt, entsteht nach einer zufälligen Wartezeit (120 bis 240 s, Zielwert 180 s) ein neues an einer zufälligen Position derselben Zone. Die Wartezeit läuft auch während der Nachberechnung. So liegt dort, wo sich der Schwarm aufhält, regelmäßig ein Fundstück, und es sind höchstens zwei Fundstücke zugleich ansteuerbar.
- **`P1-FUN-07` (Muss):** Wird eine weitere Zone erreichbar, verschwindet das Fundstück der Zone, die dadurch nicht mehr zu den vordersten Zonen gehört; dort entsteht keines mehr. Ein markiertes Fundstück, das so verschwindet, verliert seine Markierung (`P1-AUT-03`). Fundstücke in noch nicht erreichbaren Zonen bleiben als Vorschau sichtbar, sind aber erst ansteuerbar, wenn ihre Zone erreichbar wird.
- **`P1-FUN-03` (Muss):** Fundstücke sind auf der Karte immer sichtbar, auch außerhalb der Reichweite, und ihr Typ ist erkennbar. Ein Fundstück ist ansteuerbar, wenn der Antrieb die Zugangsschwelle seiner Zone erreicht. Der Schwarm sammelt es ein, sobald er an seiner Position ankommt; danach wirkt es und wird entfernt. Die Wanderautomatik steuert Fundstücke nur an, wenn der Spieler sie markiert hat (`P1-AUT-03`). Nach dem Einsammeln befindet sich der Schwarm an keiner Stelle und zieht sofort weiter (`P1-AUT-01`).
- **`P1-FUN-04` (Muss):** Typen, Gewichtung und Wirkung:

| Fundstück | Gewicht | Wirkung |
| --- | --- | --- |
| Fressrausch | 3 | Appetit ×3 für 60 s |
| Legeschub | 3 | Eier-Rate ×5 für 60 s |
| Vermehrungsrausch | 3 | Erzeugung der Kette ×3 für 60 s |
| Rückenwind | 2 | Reisetempo ×4 für 60 s |
| Nahrungsblase | 3 | Sofort Vorrat in Höhe von max(1.000; 180 × Ø-Ernte). Ø-Ernte = Gesamternte der letzten 120 s Spielzeit / 120 s; Reisezeiten und Nachberechnung zählen als Spielzeit, in den ersten 120 s wird über die bisherige Spielzeit gemittelt. Unterliegt nicht der Kapazität |
| Eierballen | 2 | Sofort Eier in Höhe von max(50; 180 × Eier-Rate) |
| Wachstumsschub | 2 | Jede Stufe erhält sofort 120 × die aktuelle Erzeugung der Stufe darüber pro Sekunde (linear: ohne Weiterreichen neu entstehender Einheiten, ohne Berücksichtigung von Starre und ohne Boni anderer Fundstücke) |
| Keimzelle | 1 | Der nächste Rang eines Ausbaus nach Wahl kostet nichts |

- **`P1-FUN-05` (Muss):** Zeitlich begrenzte Wirkungen desselben Typs addieren ihre Restdauer. Mehrere Keimzellen sammeln sich als Gratis-Ränge an.
- **`P1-FUN-06` (Muss):** Fressrausch, Legeschub und Vermehrungsrausch wirken nicht in Starre; ihre Restdauer sinkt nur außerhalb der Starre. Die Restdauer von Rückenwind sinkt nur unterwegs. So verfallen Wirkungen nicht ungenutzt auf dem Weg vom Fundstück zur nächsten Stelle.

### 4.13 Abschluss des Zeitalters

- **`P1-END-01` (Muss):** Die Sprungbedingung der Winzlinge ist erfüllt, sobald der Schwarm an der Seegraswiese erntet und mindestens ein Urnest besitzt. Im MVP ist damit das Ende erreicht (`STR-06`); nach dem MVP wird hier der Evolutionssprung in das Zeitalter Organismen möglich.
- **`P1-END-02` (Muss):** Im Zeitalter Winzlinge gibt es kein Schwärmen.
- **`P1-END-03` (Muss):** Ist die Sprungbedingung erfüllt, erscheint eine Abschlussanzeige mit den Kennzahlen aus `TEC-06` (u. a. Spielzeit, Anzahl der Reisen, eingesammelte Fundstücke). Danach kann der Spieler weiterspielen oder ein neues Spiel beginnen.

---

## 5. Phase 2: Organismen

Das Zeitalter Organismen ist nicht Teil des MVP (1.4) und im Prototyp nicht umgesetzt. Dieser Abschnitt hält den Konzeptstand fest; er wird separat ausgearbeitet, sobald der MVP mit Phase 1 Spaß macht.

Designziel: Im Zeitalter Organismen trifft der Spieler zum ersten Mal eine strategische Abwägung. Soldaten erschließen größere und ertragreichere Stellen, kosten aber Vorrat und Larven und erhöhen die Masse, bremsen also das Wachstum des Schwarms. Unterschiedliche Spielstile sollen daran erkennbar werden, wie stark ein Spieler aufrüstet. Phase 1 bleibt bewusst schlank und führt keine solche Abwägung ein.

Alle Mechaniken des Zeitalters Winzlinge gelten weiter, sofern hier nichts anderes steht.

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

- **`P2-FAE-01` (Muss):** Mindestens vier der folgenden Fähigkeiten sind im Zeitalter enthalten; Instinktkosten und Abklingzeiten **[offen]**:

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

### 5.10 Pacing

| Meilenstein | Zielwert |
| --- | --- |
| Erste Einnahme | 10 Minuten nach Beginn des Zeitalters Organismen |
| Erstes Schwärmen | nach 1 bis 2 Tagen im Zeitalter Organismen |
| Zielstelle der Organismen | nach etwa 2 Wochen |

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
| Erste Reise | nach 1 bis 3 Minuten bei aktivem Spiel (laufendes Kaufen von Fresslingen); für passives Spiel kein Zielwert |
| Erste Stelle versiegt | in den ersten Minuten |
| Sprungbedingung der Winzlinge erfüllt (Ende des MVP) | nach 2 bis 3 Stunden |

Zielwerte für das Zeitalter Organismen stehen in 5.10.

Simulationsergebnisse des Prototyps (automatischer Spieler, mehrere zufällige Karten): Das Zeitalter Winzlinge dauert mit allen Fundstücken 1,5 bis 2,3 Stunden, ohne Fundstücke 2,3 bis über 6 Stunden. Die Simulation lief noch mit dem früheren Verfahren (Fundstück alle 1,5 bis 2 Minuten in der Reichweite, Einsammeln per Klick ohne Umweg) und enthielt das inzwischen gestrichene Fundstück Frische Strömung. Für ortsfeste Fundstücke (`P1-FUN-01` bis `P1-FUN-03`) steht sie aus; durch die Umwege dürfte ihr Vorteil kleiner ausfallen. Die weiche Obergrenze bringt einem Spieler, der nur alle 30 Minuten eingreift, 1,5- bis 3-mal so viel Ernte wie eine harte Obergrenze. Tests mit Menschen stehen aus.

### 6.4 Konfiguration

- **`ALL-CFG-01` (Muss):** Alle Spielwerte (Einheiten, Stellen, Zonen, Ausbauten, Fundstücke, Fähigkeiten, Formelparameter) liegen in einer Datendatei, sodass das Balancing ohne Codeänderung angepasst werden kann.

---

## 7. Technische Anforderungen

- **`TEC-01` (Muss):** Browser-Spiel in TypeScript.
- **`TEC-02` (Muss):** Zahlenbereich mindestens bis 10³⁰⁸, mit einer Bibliothek für große Zahlen (z. B. break_infinity.js) erweiterbar.
- **`TEC-03` (Muss):** Die Simulation läuft in festen Zeitschritten von höchstens 0,25 Sekunden oder ereignisbasiert. Geschlossene Formeln reichen nicht aus, weil Stellen erschöpft werden.
- **`TEC-04` (Muss):** Die Spiellogik ist eigenständig ausführbar, damit sie automatisiert simuliert werden kann (Balancing, Regressionstests).
- **`TEC-05` (Soll):** Ein Testmodus beschleunigt die Spielzeit (Prototyp: 1×, 5×, 20×, 100×).
- **`TEC-06` (Soll):** Für Spieltests werden erfasst: Zeitpunkt der ersten Reise, Anzahl der Reisen, versiegte und neu entstandene Stellen, eingesammelte Fundstücke, markierte Ziele und Nutzung von „Stelle verlassen“, Anteil der Zeit in Starre (gesamt und je Zone), Spielzeit bis zur Sprungbedingung der Winzlinge. Für die Simulation des Balancings zusätzlich über die Spielzeit: Anteil der Ausgaben je Ausbau, Verhältnis von Vorrat zu Kapazität, Verhältnis von Antrieb zu Masse (Zeit an der Untergrenze des Reisetempos), Anteil der durch Eier begrenzten Käufe und Eier-Rate im Verhältnis zur Kaufrate. Simuliert wird mit mindestens einem aktiven und einem passiven Spielerprofil.
- **`TEC-07` (Muss):** Die Oberfläche ist mobile first: Sie wird zuerst für Smartphones im Hochformat gestaltet und ist dort vollständig per Touch bedienbar, ohne waagrechtes Scrollen der Seite. Keine Funktion setzt Hover, Rechtsklick oder Tastatur voraus.

---

## 8. Ausblick nach dem MVP

- **Organismen (Phase 2):** Konzeptstand in Abschnitt 5; wird separat ausgearbeitet, sobald der MVP mit Phase 1 Spaß macht.
- **Herrschaft an Land (Phase 3):** Biome mit eigenen Regeln. Strand: Stellen entstehen und verschwinden mit den Gezeiten. Wald: viele kleine Stellen, kurze Wege. Wüste: weite Wege, Hitze kostet Vorrat. Gebirge: Pässe, Kälte senkt das Reisetempo. Stadt: große Stellen mit sich anpassender Abwehr. Weitere Kandidaten: Jahreszeiten, Ableger, auf Biome spezialisierte Einheiten, weitere Ressourcen je Biom (Stellen liefern neben Nahrung einen biomtypischen Stoff, z. B. für eigene Ausbauten). Weitere Ressourcen geben auch Stellen mit wenig Nahrung einen Wert und damit der Wanderautomatik eine Ausrichtung, die der Spieler wählt.
- **In den Weltraum (Phase 4):** Von Planet zu Planet bis zum leer gefressenen Sonnensystem, dann ganze Sternsysteme, Sternhaufen, Galaxien. Kernmechanik offen; Ideen: Reisen über Generationen, vorausfliegende Sporenschiffe, Sterne als Energiequelle, rivalisierende Schwärme.
- **Weitere Kandidaten:** Ableger (zurückgelassene Teilschwärme, die weiter ernten), frei festlegbare Reiserouten.

---

## 9. Offene Punkte

### 9.1 Offene Designfragen

MVP (Phase 1):

1. **Entdecken und Kartenform** (`P1-KAR-03`, `P1-STE-07`, `P1-AUT-01`): Die Wanderautomatik steuert nur bekannte Stellen an. Ohne bekanntes, ansteuerbares Ziel bleibt der Schwarm stehen, unter Umständen dauerhaft: wenn neue Stellen außerhalb der Reichweite entstehen oder wenn die Reichweite nicht in eine neu erreichbare Zone hineinreicht. Kandidaten:
   - *Neue Stellen in der Reichweite:* Liegen in der Reichweite weniger als k ansteuerbare Stellen (Startwert 3), entsteht dort eine neue. Mit größerer Reichweite wächst die Auswahl. Bedingungen: Die Obergrenze für neue Stellen bezieht sich auf die Reichweite, nicht nur auf die Zone; die Reichweite reicht beim Erreichen einer Zone in diese hinein (Formel aus `P1-AUS-03` an die Zugangsschwellen anpassen oder neue Stellen bevorzugt in der höchsten erreichbaren Zone innerhalb der Reichweite erzeugen); neue Stellen folgen damit dem Schwarm.
   - *Wissen je Zone:* Alle Stellen erreichbarer Zonen sind bekannt; Reichweite, `P1-AUS-03` und `P1-KAR-03` entfallen.
   - *Erkundungsreise:* Ohne ansteuerbares Ziel oder bei neu erreichbarer Zone zieht der Schwarm zur Mitte der äußersten erreichbaren Zone.

   Die Kartenform (Streifen oder Fläche, Maße, Verteilung der Positionen) wird anhand von UI-Mockups entschieden. Vorschlag: waagrechter Streifen, Zonen je 260 × 120 Kartenpunkte, Positionen gleichverteilt mit Mindestabstand 20 Kartenpunkte.
2. **Appetit und Starre** (`P1-STR-01`, `P1-KET-05`, `P1-EIE-01`): Die Kette erzeugt nur, solange gefressen wird. Da die Wanderautomatik eine leere Stelle sofort verlässt, entsteht Starre fast nur auf Reisen. Höherer Appetit (Fressrausch, Verdauung, mehr Fresslinge) leert Stellen schneller, verkürzt so die Fresszeit und bremst die Kette, sobald die Nahrung knapper ist als der Appetit. Offen ist damit auch, wie viel Zeit in Starre noch spannend und nicht frustrierend ist. Kandidaten:
   - *Starre abschaffen:* Kette und Brutherd laufen immer, auch unterwegs; das Wachstum begrenzt der Vorrat über die Kaufkosten.
   - *Erzeugung kostet Vorrat:* Jede erzeugte Einheit kostet einen kleinen Teil ihres Kaufpreises; ohne Vorrat steht die Kette. Braucht eine Regel für Rücklage oder Priorität gegenüber Käufen des Spielers.
   - *Unverändert lassen.*

   Prüfung in einer frühen Simulation.
3. **Zeitschritt** (`TEC-03`, `P1-STR-01`, `P1-ERN-02`): Starre und Ernte sind über die Dauer eines Zeitschritts definiert, `TEC-03` erlaubt aber auch kürzere oder ereignisbasierte Schritte; Spiel, Nachberechnung und Simulation können dann voneinander abweichen. Kandidaten: feste Schritte von genau 0,25 s für Spiel, Nachberechnung und Simulation; stufenlose Starre (Erzeugung und Brut skalieren mit Ernte / Appetit). Entfällt, falls die Starre abgeschafft wird (Punkt 2). Klärung zusammen mit Punkt 2.

Nach dem MVP:

4. Wie stark darf Erbe das nächste Zeitalter beschleunigen, ohne dessen erste Stunden zu entwerten?
5. Wird die Karte für jeden Durchlauf neu erzeugt, oder gibt es eine feste Welt mit Zufallsstartwert?
6. Was ist die Kernmechanik des Zeitalters In den Weltraum?

### 9.2 Noch festzulegende Werte

MVP (Phase 1):

| Kennung | Offener Wert |
| --- | --- |
| `P1-AUS-04`, `P1-AUS-05` | Wirkung und Kosten von Mehrlingen und Produktions-Ausbau |

Nach dem MVP (Phase 2):

| Kennung | Offener Wert |
| --- | --- |
| `STR-01` | Bedingung für das Schwärmen (Vorschlag: Erreichen der Zone Riff) |
| `STR-02` | Sprungbedingung der Organismen (Vorschlag: mindestens eine Schwarmkönigin an der Zielstelle) |
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
- [ ] UI-Mockups für die Kartenform, mobile first (9.1, Punkt 1)
- [ ] Frühe Simulation: Appetit und Starre sowie Zeitschritt (9.1, Punkte 2 und 3), Pacing mit ortsfesten Fundstücken und dem Zielwert für die erste Reise, Kennzahlen aus `TEC-06` mit aktivem und passivem Spielerprofil
- [ ] Spieltest des Prototyps mit Menschen
- [ ] Balancing anhand der Simulations- und Testergebnisse anpassen
- [ ] Offene Werte des MVP aus 9.2 festlegen
- [ ] Nach dem MVP: Organismen separat ausarbeiten (Werte aus 9.2, beginnend mit der Einnahme), dann mit dem Evolutionssprung in den Prototyp übernehmen

---

*Grundlage der Abzugsreife: E. L. Charnov, „Optimal foraging, the marginal value theorem“, Theoretical Population Biology, 1976.*
