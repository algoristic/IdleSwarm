# IdleSwarm · Kernschleife v2 · Vorschläge

> Stand: 23.11.2026 · Gehört zu: [Projektplan M1.6](projektplan.md#m16--überarbeitung-ära-i), [Game-Design](game-design.md) · Grundlage für AP 1.6.1 (Konzept Kernschleife v2) und AP 1.6.2 (Begriffe Ära I)

Dieses Dokument sammelt die Vorschläge aus der ersten Runde der Playtest-Schleife (AP 1.5.8). **Entschieden** sind nur die Punkte in [Abschnitt 1](#1-anlass-und-entscheidungen). Alles Übrige ist Vorschlag; die Wahl der Kernschleife trifft der PO in AP 1.6.1, die Begriffe werden in AP 1.6.2 festgelegt. Danach geht das Ergebnis in die [Game-Design-Spezifikation](game-design.md) ein, und dieses Dokument wird nur noch historisch gelesen.

## 1. Anlass und Entscheidungen

Laut PO ist das Gesamtkonzept der Ära I noch nicht stimmig. **Entschieden** (PO, 23.11.2026):

- Das Pheromon-System entfällt komplett.
- Soldaten und Kampf entfallen in Ära I und kommen mit Ära II (AS3). Jede Ära bringt eine grundlegend neue Mechanik.
- „Drohnen opfern“ entfällt; zurückbleibende Drohnen werden beim Aufbruch automatisch zu Nahrung.
- Die Kernschleife verbindet Elemente von [Swarm Simulator](https://www.swarmsim.com/) ([Quellcode](https://github.com/swarmsim/swarm)) mit Ressourcenknappheit und aktivem Weiterziehen, ohne dessen Mechaniken zu kopieren. Das Spiel soll idle laufen können, aber eher Strategie verlangen.
- Die Begriffe der Ära I werden gesichtet, damit sie zur Welt der Einzeller und Mikroben des Meeres passen.

## 2. Folgen der Streichungen

| Streichung | Was mit wegfällt |
|---|---|
| Soldaten | **Hauptquelle der DNA**: Außer Funden kommt DNA nur aus dem Kampf (`d_0 · B^δ`, [Game-Design §4.8](game-design.md#48-kampf)). Ohne Kampf haben Futterstellen keine Abwehr; die Strategien „Geringster Widerstand“ und „Kampfgehärtet“ verlieren ihren Sinn, die Mitnahme-Priorität ebenso. Dazu der Genom-Ast „Kampf“ (5 Knoten), Schwefelpanzer, Autophagie und das Set „Walsturz-Relikte“ (Bonus `combatLoss`) |
| Pheromone | Die Brutrate hängt wieder nur an den Königinnen; „Zweite Drüse“ und eine Freischaltung im Onboarding entfallen |
| Drohnen opfern | Auch **Drohnen → Königin** entfällt, bisher das Mittel gegen Platzmangel beim Aufbruch; der Platz braucht einen anderen Gegenspieler |

Übrig bliebe „Drohnen sammeln, Königinnen brüten, weiterziehen“. Das ist zu dünn; die neue Kernschleife ist deshalb Voraussetzung für alle anderen Arbeitspakete von M1.6.

## 3. Was an Swarm Simulator trägt

1. **Erzeugerketten:** Stufe n erzeugt Stufe n − 1 (polynomielles Wachstum); alle paar Minuten kommt eine neue Stufe hinzu.
2. **Larven als Engpass:** Jede Einheit kostet eine Larve plus Ressourcen, zu **festen** Preisen. Die Verteilung der Larven ist die eigentliche Entscheidung.
3. **Reset-Timing:** Wann sich die Ascension lohnt, ist die strategisch interessanteste Frage.

Kritisch: Swarm Simulator hat im Kern wenig Entscheidungen (meist die beste Stufe kaufen), Strategie entsteht fast nur über das Timing. Genau dort setzen Knappheit und Weiterziehen an.

Die Eier/min sind heute schon ein Larven-Ersatz, werden aber automatisch verbraucht; die Pheromone haben versucht, ihre Verteilung steuerbar zu machen. Ausgebbare Larven lösen das direkter.

## 4. Kombinationen mit dem bisherigen Konzept

### K1 · Teilungskette mit Transportlast

- 3–4 nacheinander freigeschaltete Stufen, z. B. Fresszelle ← Mutterzelle ← Zellverband ← Biofilm. Jede Stufe kostet Nährstoffe und Einheiten der Stufe darunter, zu festen Preisen.
- Futterstellen bleiben endlich, ihre Größe wächst kräftig mit `z` und der Distanz.
- Höhere Stufen brauchen viel Platz. Vor jedem Aufbruch heißt es also: tiefe Kette (schnelles Wachstum) gegen Mitnahme. Zurückbleibende werden zu Nährstoffen.
- DNA aus dem vollständigen Abweiden einer Futterstelle, als Anreiz, nicht zu früh weiterzuziehen.
- Bleibt: Futterstellen, Reise, Platz, Genom, Funde. Fällt weg: Kampf und Mitnahme-Priorität.
- Risiko: „alles mitnehmen“ darf nicht immer richtig sein. Umbau: mittel.

### K2 · Tragfähigkeit statt Vorrat, Reichweite als Fortschritt

- Eine Futterstelle hat einen Nährstoff-Zufluss je Sekunde statt eines endlichen Vorrats. Der Ertrag sättigt mit der Schwarmgröße, die Stelle wird mit der Zeit übernutzt.
- Die Kette wächst wie in Swarm Simulator, das Einkommen ist durch die Futterstelle gedeckelt. Größere Zuflüsse liegen weiter weg: **Reichweite wird die Hauptachse des Fortschritts** (vergleichbar mit Territory und Expansions).
- Idle: Sättigung ist ein stabiler Zustand statt eines Stillstands.
- Risiko: weichere Knappheit; ohne spürbare Übernutzung wird das Weiterziehen optional. Umbau: mittel bis groß, weil der Vorrat überall vorkommt (Funde an Abbau-Schwellen, Restzeit, Auto-Auslöser).

### K3 · Teilungen als Engpass (statt Pheromone)

- Mutterzellen erzeugen „Teilungen“, die sich ansammeln. Jede neue Zelle kostet 1 Teilung plus Nährstoffe zu festem Preis, und der Spieler verteilt sie selbst. Das ersetzt die Pheromone durch eine direkte Entscheidung.
- Futterstellen haben zwei Achsen: Nährstoffvorrat und Teilungsbonus (warme Schlote beschleunigen die Teilung, Matten liefern Masse). Die Zielwahl richtet sich danach, was fehlt.
- Bleibt: fast alles außer Pheromonen, Kampf und Opfern.
- Risiko: allein eher ein Umbau der Ökonomie als eine neue Schleife. Umbau: klein bis mittel; mit K1 kombinierbar.

## 5. Neuentwürfe ohne Rücksicht auf den Bestand

Leitfrage: Wie verbindet man die Mechaniken von Swarm Simulator mit Ressourcenknappheit und aktivem Weiterziehen?

### N1 · Weiderotation

- Feste Karte mit 20–40 Nährgründen, die nach dem Abweiden langsam (logistisch) nachwachsen; zu frühe Rückkehr bringt wenig.
- Eine Erzeugerkette sorgt für Wachstum, der wachsende Schwarm braucht größere Runden und mehr Reichweite.
- Aktiv: Timing der Rückkehr optimieren. Idle: eine Rundtour festlegen, die automatisch läuft; die Idle-Strategie ist der Entwurf einer guten Route.
- Risiko: Routenplanung auf dem Smartphone, Abstimmung von Nachwachsen und Kettenwachstum. Umbau: groß (Karte, Generator, Auto-Weiterziehen).

### N2 · Weiterziehen ist Prestige

- An jeder Futterstelle baut der Schwarm eine **sesshafte** Kette auf (Mutterzellen → Kolonien → Matten). Sie wächst polynomiell und leert den endlichen Vorrat immer schneller.
- Beim Aufbruch bleibt alles Sesshafte zurück und wird zu **Erbgut**, einem dauerhaften Multiplikator, der davon abhängt, wie viel aufgebaut wurde. Nur ein bewegliches Kernvolk aus Schwärmerzellen zieht weiter. Das entspricht echter Biologie: Biofilme setzen zur Ausbreitung bewegliche Zellen frei.
- Kernentscheidung alle 5–15 min: *wann* weiterziehen (abnehmender Grenzertrag, klassisches Reset-Timing) und *wohin* (Futterstellen mit Modifikatoren, ähnlich den Challenges).
- Idle: Auto-Regel „weiterziehen, sobald der Erbgut-Gewinn je Minute fällt“.
- Passt zum Feedback: Zurückbleibende werden verwertet. Reise, Funde und Genom bleiben weitgehend erhalten.
- Risiko: drei Prestige-Schichten (Weiterziehen, große Ascension, Ära). Die Erbgut-Formel muss gedämpft sein (z. B. Wurzel), sonst explodieren die Zahlen. Umbau: mittel bis groß.

### N3 · Drift im Strom

- Der Schwarm treibt in einer Meeresströmung, Nährgründe ziehen wie auf einem Förderband vorbei; das Sonar zeigt die kommenden mit Ankunftszeit.
- Festhalten kostet ATP (Energie, angelehnt an Swarm Simulator), Loslassen ist kostenlos; mit ATP lässt sich gegen den Strom zu reichen, fernen Stellen steuern.
- Knappheit: Alles zieht vorbei, niemand bleibt für immer. Aktiv: vorausplanen. Idle: Regeln fürs automatische Festhalten.
- Risiko: Zeitdruck verträgt sich schlecht mit dem Offline-Spiel, neue Kartendarstellung. Thematisch am stärksten, mechanisch am riskantesten. Umbau: groß.

## 6. Empfehlung und Stand

- **Empfehlung:** N2 mit den Teilungen aus K3. Das Weiterziehen wird selbst die strategische Kernentscheidung, statt dass eine Strategie es per Schwelle automatisiert; Zurückbleibende werden natürlich verwertet; die Biologie passt, und der Übergang zur großen Ascension (Einzeller → Mehrzeller, AS2) wird logisch: aus vielen kleinen Resets wird ein großer.
- **Sichere Alternative** mit kleinerem Umbau: K1 + K3.
- **Stand PO:** Tendenz N2, Entscheidung in AP 1.6.1. Dort wird N2 mit den Teilungen aus K3 noch einmal gesammelt dargestellt und das Konzept der Teilungen genauer erklärt, danach grob auf der Modell-Seite durchgerechnet.

## 7. Begriffe Ära I (Entwurf für AP 1.6.2)

Viele heutige Begriffe stammen aus der Welt der Insekten (Königin, Drohne, Eier, Brutwaben, Pheromone, Drüse) oder großer Tiere (Walsturz, Nesselzellen). Endgültig wird die Liste erst nach der Wahl der Kernschleife, weil deren Stufen Namen brauchen.

| Heute | Vorschlag | Anmerkung |
|---|---|---|
| Königin | Mutterzelle | teilt sich, bietet Platz |
| Drohne | Fresszelle | sammelt |
| Eier/min, Brut | Teilungen/min, Zellteilung | bei K3/N2: „Teilungen“ als Ressource |
| Nahrung | Nährstoffe | |
| Futterstelle | Nährgrund | |
| Walsturz | Meeresschnee (`marine-snow`) | sinkende organische Flocken; neue ID, also Migration |
| Set „Walsturz-Relikte“ | „Meeresschnee-Schätze“: Kieselschale, Kalkplättchen, Strahlentierchen-Gerüst | Badge „Flockenfänger“ statt „Aasfresser“ |
| Dotterreserve, Brutwaben, Ammenzellen | z. B. Glykogenspeicher, Schleimkapsel, Teilungsspindel | hängt vom neuen Genom ab |
| Pheromone, Drüse, Soldat, Abwehr, Kampf, Drohnen opfern | entfallen | |
| Schwarm, Ursuppe, Schlot, Algenmatte, Bakterienrasen, Methanquelle, DNA, Fremde DNA, Genom, Adaption, Knospung, Reichweite, Umgebung, Weiterziehen | bleiben | „Schwarm“ passt, Bakterien schwärmen tatsächlich |

Wo ein Typ gleich bleibt, ändern sich nur die Texte; die IDs bleiben stabil.

## 8. Befunde aus Playtest 1

- **Fragmente zu selten:** Die Bots finden 2–7 Fragmente in 24 h ([Game-Design §6.6](game-design.md#66-messung-m15-werte-v15)), der Schwefelpanzer braucht 5. Ein bestimmtes Fragment hat Gewicht 5 von rund 90, bei etwa einem Fund je Futterstelle. Mögliche Mittel: höhere Gewichte, Garantie nach n Funden ohne Fragment, weniger benötigte Fragmente.
- **Keine Steigerung der Reichweite:** Nur „Chemotaxis“ (Stufe 4, 648 DNA) erhöht sie; „Aktiv“ erreicht sie erst nach Stunden. Das neue Genom braucht eine frühe, wiederholte Steigerung, z. B. einen Ast „Bewegung“ an Stelle von „Kampf“.
- **Platzbedarf:** Dass Drohnen und Soldaten unterschiedlich viel Platz brauchen, war nicht offensichtlich; vorgemerkt für die Soldaten in Ära II (AS3).
- **Oberfläche:** Übergang beim Weiterziehen fehlt (unterwegs zeichnet die Szene keine Futterstelle); Auto-Weiterziehen liegt im eingeklappten Abschnitt „Weiterziehen“, die Strategie-Knöpfe dagegen prominent im Titel; Futterstellen sehen alle gleich aus (Mockups nach der Begriffsrunde, AP 1.6.3). Die Notiz „Im Hintergrund läuft der Schwarm weiter …“ im Genom ist bereits entfernt.
