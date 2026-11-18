# IdleSwarm · Game-Design-Spezifikation v1

> Stand: 18.11.2026 · Gehört zu: [Projektplan](projektplan.md), [Produktplanung](produktplanung.md), [Technisches Konzept](technisches-konzept.md)

## 1. Geltung

Diese Spezifikation legt Formeln, Startwerte und Kostenkurven für Meilenstein **M1.1 · Kernschleife & Modell** fest. Sie ist die fachliche Vorlage für die Umsetzung in `core/balance`. Für M1.1 hat sie Vorrang vor dem Entwurf im [Technischen Konzept §5.2](technisches-konzept.md#52-modellgrößen-entwurf-für-spätere-größen).

- **Zahlenwerte sind „v1“:** Sie dürfen während M1.1 nachjustiert werden, bis die Bots die [Pacing-Ziele](projektplan.md#35-pacing-ziele-vorläufig) treffen. Formeln und Zielbänder bleiben dabei unverändert.
- **Alle Konstanten sind über Parameter überschreibbar** ([ADR-007](adr/007-modell-seite-echarts-balancing.md)). So testet die Modell-Seite Varianten ohne Codeänderung.
- **Nicht enthalten:** Mechaniken ab M1.2 (siehe [Abschnitt 7](#7-ausblick)).
- **Zielzustand ab AP 1.1.9:** Das Spiel kennt keinen Klick mehr, an seine Stelle tritt der [Grundertrag](#41-grundertrag). Der Code enthält den Klick noch, bis [AP 1.1.9](projektplan.md#m11--kernschleife--modell) umgesetzt ist.

| Thema | Abschnitt | Stories |
|---|---|---|
| Grundertrag und Vorrat | [4.1](#41-grundertrag), [4.5](#45-abgeleitete-werte) | US-01.01–01.03 |
| Sammeln | [4.3](#43-simulationsschritt) | US-01.04 |
| Kauf von Einheiten | [3](#3-kostenkurven), [4.2](#42-manueller-kauf) | US-02.01–02.03 |
| Platz | [4.5](#45-abgeleitete-werte) | US-02.04 |
| Passive Brut | [4.3](#43-simulationsschritt) | US-02.05 |

## 2. Startwerte und Konstanten

### 2.1 Startzustand

| Größe | Startwert |
|---|---|
| Königinnen | 1 |
| Drohnen | 0 |
| Soldaten | 0 |
| Nahrung | 15 |
| DNA | 0 |
| Futterstelle | `vent` (Schlot), Größe 20.000, Vorrat voll (20.000) |
| Kaufzähler `bought` | 0 je Einheitentyp |

### 2.2 Einheiten

| Einheit | Basiskosten `c` | Preisfaktor `w` | Wirkung | Platz |
|---|---|---|---|---|
| Drohne | 10 | 1,07 | sammelt 0,2 Nahrung/s | belegt 1 |
| Soldat | 25 | 1,08 | Angriff 1 | belegt 2 |
| Königin | 60 | 1,20 | 6 Eier/min | bietet 10 |

Jeder Einheitentyp hat eigene Nahrungskosten. Eier/min ist nur eine Rate, keine Ressource.

### 2.3 Konstanten

| Symbol | Konstante | Wert v1 | Bedeutung |
|---|---|---|---|
| `g_0` | `baseFoodRate` | 1,5 | Grundertrag in Nahrung/s; Startwert, wird in AP 1.1.9 gemessen |
| `c_d` | `droneCost` | 10 | Basiskosten Drohne |
| `w_d` | `droneCostGrowth` | 1,07 | Preisfaktor Drohne |
| `r_d` | `droneCollectRate` | 0,2 | Nahrung/s je Drohne |
| `p_d` | `droneSpace` | 1 | Platzbedarf Drohne |
| `c_s` | `soldierCost` | 25 | Basiskosten Soldat |
| `w_s` | `soldierCostGrowth` | 1,08 | Preisfaktor Soldat |
| `a_s` | `soldierAttack` | 1 | Angriff je Soldat |
| `p_s` | `soldierSpace` | 2 | Platzbedarf Soldat |
| `c_q` | `queenCost` | 60 | Basiskosten Königin |
| `w_q` | `queenCostGrowth` | 1,20 | Preisfaktor Königin |
| `e_q` | `queenEggsPerMin` | 6 | Eier/min je Königin |
| `p_q` | `queenSpace` | 10 | Platzangebot je Königin |
| `a` | `broodDroneShare` | 3/4 | Drohnenanteil der Brut (Drohnen : Soldaten = 3 : 1) |
| – | `startFood` | 15 | Nahrung beim Start |
| – | `startQueens` | 1 | Königinnen beim Start |
| – | `siteSize` | 20.000 | Größe der ersten Futterstelle |

Weitere Symbole: `Q`, `D`, `S` sind die Anzahl Königinnen, Drohnen und Soldaten, `N` die Nahrung, `V` der Vorrat der Futterstelle und `dt` die Schrittdauer in Sekunden. Die Modifikatoren `M_sammeln` und `M_brut` sind bis M1.3 gleich 1.

## 3. Kostenkurven

```
Preis = c · w^n
```

`n` ist die Anzahl bisher **manuell gekaufter** Einheiten dieses Typs (Kaufzähler `bought`). Passive Brut erhöht `n` nicht. Ob der Zähler beim Weiterziehen zurückgesetzt wird, entscheidet M1.2.

| n | Drohne | Soldat | Königin |
|---|---|---|---|
| 0 | 10,00 | 25,00 | 60,00 |
| 1 | 10,70 | 27,00 | 72,00 |
| 5 | 14,03 | 36,73 | 149,30 |
| 10 | 19,67 | 53,97 | 371,50 |
| 20 | 38,70 | 116,52 | 2.300,26 |

Die Tabelle ist auf zwei Stellen gerundet. Gerechnet wird mit dem ungerundeten Preis.

## 4. Formeln

Einheitenzahlen sind intern kontinuierlich (`Num`, Bruchteile erlaubt). Die Anzeige rundet ab.

### Wirkungszusammenhänge

Das Diagramm zeigt, wie die Größen in M1.1 zusammenwirken. Abgerundete Knoten sind Vorgänge, eckige Knoten sind Größen. Konstanten und die Modifikatoren `M_sammeln` und `M_brut` sind nicht eingezeichnet.

| Darstellung | Bedeutung |
|---|---|
| durchgezogener Pfeil | Der Vorgang erhöht die Größe. |
| dicker Pfeil | Der Vorgang verbraucht die Größe. |
| gestrichelter Pfeil | Die Größe bestimmt den Wert oder die Stärke des Ziels oder ist seine Bedingung. |
| gestrichelter Rahmen | Die Größe wirkt in M1.1 auf nichts anderes. |

```mermaid
flowchart TB
    grundertrag(["Grundertrag"])
    sammeln(["Sammeln"])
    kauf(["Manueller Kauf"])
    brut(["Passive Brut"])
    neu(["Neue Futterstelle<br/>(Provisorium bis M1.2)"])

    vorrat["Vorrat V"]
    nahrung["Nahrung N"]
    preis["Preis"]
    bought["Kaufzähler bought"]
    koenigin["Königinnen Q"]
    drohne["Drohnen D"]
    soldat["Soldaten S"]
    eier["Eier/min"]
    platzFrei["Platz verfügbar"]
    platzBelegt["Platz belegt"]
    angriff["Gesamtangriff A"]

    vorrat ==> grundertrag
    vorrat ==> sammeln
    grundertrag --> nahrung
    sammeln --> nahrung
    vorrat -.->|"nur bei V = 0"| neu
    neu --> vorrat

    nahrung ==> kauf
    nahrung ==> brut
    bought -.-> preis
    preis -.-> kauf
    kauf --> bought
    kauf --> koenigin
    kauf --> drohne
    kauf --> soldat

    koenigin -.-> eier
    eier -.-> brut
    brut --> drohne
    brut --> soldat
    drohne -.-> sammeln

    koenigin -.-> platzFrei
    drohne -.-> platzBelegt
    soldat -.-> platzBelegt
    soldat -.-> angriff

    classDef ohneWirkung stroke-dasharray: 5 5
    class platzFrei,platzBelegt,angriff ohneWirkung
```

- **Wachstum:** Der Grundertrag trägt den Start. Danach sammeln Drohnen Nahrung, und Nahrung wird über Kauf und Brut zu neuen Drohnen. Königinnen verstärken diese Schleife über die Eier/min.
- **Konkurrenz:** Kauf und Brut verbrauchen dieselbe Nahrung.
- **Grenze:** Grundertrag und Drohnen leeren denselben Vorrat.
- **Noch ohne Wirkung:** Platz und Angriff werden erst mit dem Weiterziehen und dem Kampf in M1.2 wirksam.

### 4.1 Grundertrag

Die Futterstelle liefert je Sekunde den festen Ertrag `g_0`, unabhängig von der Zahl der Einheiten. Er wird im [Simulationsschritt](#43-simulationsschritt) zusammen mit dem Sammeln der Drohnen verrechnet und vom selben Vorrat abgezogen. Bei leerem Vorrat ist er 0.

Der Grundertrag hat zwei Aufgaben: Er trägt den Spielstart, in dem die Brut der ersten Königin mehr Nahrung braucht als wenige Drohnen liefern. Außerdem bleibt der Schwarm handlungsfähig, wenn er weder Drohnen noch Nahrung hat. Ein Klick oder Tap erzeugt keine Nahrung.

### 4.2 Manueller Kauf

Ein Kauf ist nur möglich, wenn `N ≥ Preis`. Er wird sofort angewendet, nicht erst im nächsten Tick:

```
N -= Preis
Einheit += 1
bought(Einheitentyp) += 1
```

Ein Kauf ergibt genau +1 Einheit. **Platz begrenzt weder Kauf noch Brut**, er wird erst beim Weiterziehen (M1.2) wirksam.

### 4.3 Simulationsschritt

Je Schritt der Dauer `dt` laufen nacheinander (1) Grundertrag und Sammeln und (2) Brut. Der Logik-Takt beträgt 10 Hz, also `dt = 0,1` ([Technisches Konzept §4](technisches-konzept.md#4-simulation)).

**(1) Grundertrag und Sammeln**

```
F = min((g_0 + D · r_d · M_sammeln) · dt, V)
N += F
V -= F
```

**(2) Brut**

```
E   = Q · e_q · M_brut              // Eier/min
e   = E / 60 · dt                   // Eier im Schritt
c̄   = a · c_d + (1 − a) · c_s       // mittlere Kosten, v1: 13,75
h   = min(e, N / c̄)                 // geschlüpft
D  += a · h
S  += (1 − a) · h
N  -= h · c̄
```

- Passive Brut kostet die Basiskosten **ohne Preisfaktor**.
- Das Verhältnis Drohnen : Soldaten ist bis M1.3 fest 3 : 1.
- Königinnen schlüpfen nicht passiv, sie werden nur gekauft.
- Fehlt Nahrung, pausiert die Brut anteilig. Nahrung wird nie negativ.

**Beispiel 1** mit `Q = 1`, `D = 10`, `S = 0`, `N = 5`, `V = 1.000`, `dt = 0,1`:

| Schritt | Rechnung | Ergebnis |
|---|---|---|
| Grundertrag und Sammeln | `F = min((1,5 + 10 · 0,2) · 0,1; 1.000) = 0,35` | `N = 5,35`, `V = 999,65` |
| Eier | `e = 6 / 60 · 0,1 = 0,01` | |
| Geschlüpft | `h = min(0,01; 5,35 / 13,75 ≈ 0,389) = 0,01` | `D = 10,0075`, `S = 0,0025` |
| Kosten | `0,01 · 13,75 = 0,1375` | `N = 5,2125` |

**Beispiel 2** (Nahrung reicht nicht) mit `Q = 1`, `D = 0`, `S = 0`, `N = 0,05`, `V = 0`, `dt = 0,1`: Ohne Vorrat gibt es keinen Grundertrag, also ist `h = min(0,01; 0,05 / 13,75 ≈ 0,00364) ≈ 0,00364`. Es schlüpfen rund 0,00273 Drohnen und 0,00091 Soldaten, danach ist `N = 0`.

### 4.4 Leere Futterstelle (Provisorium bis M1.2)

> **Provisorium:** Diese Regel überbrückt die Zeit, bis es das Weiterziehen gibt. Sie entfällt mit M1.2.

- Bei `V = 0` bringen Grundertrag und Drohnen nichts mehr. Die Brut läuft weiter, solange Nahrung da ist.
- Nur bei leerem Vorrat steht die Aktion **„Neue Futterstelle“** bereit. Sie setzt `V` wieder auf die Größe derselben Futterstelle.
- Einheiten, Nahrung und Kaufzähler bleiben erhalten.
- Auch die Bots nutzen diese Aktion.

### 4.5 Abgeleitete Werte

Diese Werte werden nicht gespeichert, sondern aus dem Zustand berechnet.

| Wert | Formel | Hinweis |
|---|---|---|
| Nahrung/s gesamt | `g_0 + D · r_d · M_sammeln` | 0 bei leerem Vorrat |
| davon Drohnen | `D · r_d · M_sammeln` | 0 bei leerem Vorrat |
| Eier/min | `Q · e_q · M_brut` | |
| Gesamtangriff | `A = S · a_s` | v1: `A = S · 1` |
| Platz verfügbar | `Q · p_q` | v1: `Q · 10` |
| Platz belegt | `D · p_d + S · p_s` | v1: `D · 1 + S · 2`; darf den verfügbaren Platz übersteigen |
| Warnfarbe Platz | `belegt ≥ 0,9 · verfügbar` | US-02.04 |
| Restzeit Futterstelle | `V / (g_0 + D · r_d · M_sammeln)` | auch ohne Drohnen bestimmbar |
| Effekt einer weiteren Königin | `+e_q · M_brut` Eier/min, `+p_q` Platz | Anzeige vor dem Kauf (US-02.03) |

Beispiele: Mit 50 Drohnen und vollem Vorrat beträgt die Restzeit `20.000 / (1,5 + 50 · 0,2) ≈ 1.739 s`, also rund 29 min. Mit `Q = 2`, `D = 15`, `S = 3` sind 21 von 20 Plätzen belegt (105 %).

## 5. Spielstand Version 2

Version 2 ergänzt den Spielstand um zwei Felder:

| Feld | Inhalt |
|---|---|
| `site` | stabile Typ-ID (`type`), `size`, `stock` |
| `bought` | Kaufzähler je Einheitentyp (`queens`, `drones`, `soldiers`) |

Die stabile ID der ersten Futterstelle ist `vent` (Schlot). Wie überall speichert der Spielstand nur die ID, keine Texte ([Technisches Konzept §3.4](technisches-konzept.md#34-zustandsmodell-entwurf)).

**Migration von Version 1:** Seed, RNG-Zustand und Zeiten bleiben erhalten. Futterstelle, Kaufzähler, Ressourcen und Einheiten werden auf die Startwerte aus [Abschnitt 2.1](#21-startzustand) gesetzt.

## 6. Messwerte v1

> **Messung mit Klick, Neumessung in AP 1.1.9:** Dieser Abschnitt beschreibt den Stand vor dem Klick-Ausbau und gilt nicht für den Grundertrag. Er bleibt bis zur Neumessung als Vergleich stehen.
>
> **Gemessen** mit dem Headless-Runner (Stand AP 1.1.8). Die Werte v1 bleiben unverändert. Die Zielbänder im [Projektplan §3.5](projektplan.md#35-pacing-ziele-vorläufig) gelten unverändert. **Die Mess-Definitionen unten sind vorläufig, die Entscheidung des Product Owners ist offen.**

**Messaufbau**

- Seed `modell`, `stepMs` 1000, Formeln und Werte wie oben. Die Spiellogik zieht noch keinen Zufall, das Ergebnis hängt also nicht vom Seed ab.
- **Aktiv:** 3 Klicks/s, entscheidet jede Sekunde und kauft die Einheit mit der kürzesten Amortisation. Ist diese noch zu teuer, spart er auf sie. Soldaten kauft er nicht.
- **Idle:** klickt nicht, schaut alle 5 min vorbei und kauft dann alles Bezahlbare, Königin vor Drohne. Soldaten kauft er nicht.
- Beide lösen bei leerem Vorrat „Neue Futterstelle“ aus: Aktiv bei der nächsten Entscheidung, Idle beim nächsten Besuch.

**Mess-Definitionen (vorläufig, Entscheidung des Product Owners offen)**

- Kauflücken und längste Wartezeit der ersten 30 min werden mit `siteSize: 1e12` gemessen, damit das [Provisorium](#44-leere-futterstelle-provisorium-bis-m12) sie nicht verfälscht. Die Futterstellen werden mit der echten Größe 20.000 gemessen.
- **Längste Wartezeit** (`longestWaitMs`): längste zusammenhängende Strecke der ersten 30 min, in der weder Königin noch Drohne bezahlbar ist.
- Das Idle-Ziel „< 5 min“ und die Obergrenze 60 s für Aktiv werden über die längste Wartezeit bewertet, weil sonst Besuchsabstand und bewusstes Sparen die Kauflücke bestimmen.
- **Kauflücke:** Abstand zweier Kaufzeitpunkte; Käufe im selben Moment zählen als einer.
- **Dauer einer Futterstelle:** von ihrem Beginn bis zum leeren Vorrat, ohne die Zeit bis zur Erneuerung.
- Die „Durststrecke ohne neue Option“ wird als längste Strecke ohne Kauf gemessen.

| Kennzahl | Futterstelle | Ziel aktiv | Aktiv | Ziel idle | Idle |
|---|---|---|---|---|---|
| Erster Kauf | 20.000 | < 10 s | 0 s | – | 0 s |
| Längste Wartezeit, erste 30 min | `1e12` | ≤ 60 s | 14,7 s | < 5 min | 3 min 15 s |
| Kauflücken, erste 30 min: Anzahl | `1e12` | – | 92 | – | 6 |
| Kauflücken, erste 30 min: Median | `1e12` | 5–60 s | 5 s | – | 5 min |
| Kauflücken, erste 30 min: Maximum | `1e12` | – | 106 s | – | 5 min |
| Erste Futterstelle | 20.000 | 3–15 min | 9,60 min | 10–60 min | 15,50 min |
| 2. / 3. / 4. Futterstelle | 20.000 | 3–15 min | 2,71 / 1,91 / 1,53 min | 10–60 min | 2,58 / 1,56 / 1,05 min |
| Längste Strecke ohne Kauf, 1 h | 20.000 | < 10 min | 3,97 min | < 60 min | 10,00 min |
| Längste Strecke ohne Kauf, 24 h | 20.000 | < 10 min | 187,73 min | < 60 min | 95,00 min |
| Längste Strecke ohne Kauf, 24 h | `1e12` | < 10 min | 115,53 min | < 60 min | 30,00 min |

Ergänzend, ohne Zielband: Der Anteil Wartezeit beträgt in den ersten 30 min 11,5 % (Aktiv) und 12,8 % (Idle), jeweils mit `siteSize: 1e12`. Über 24 h mit echter Futterstelle sind es 0,27 % und 59,29 %. Die Nahrungsrate verdoppelt sich im Median alle 225 s (Aktiv) und 354 s (Idle), abgetastet je Minute.

**Außerhalb der Zielbänder oder nur mit der vorläufigen Definition passend**

- **Kauflücken Aktiv:** 40 von 92 Lücken liegen unter 5 s (kürzeste 1 s), 8 über 60 s (63 bis 106 s). Der Median liegt genau an der Untergrenze. Die Obergrenze hält Aktiv nur über die längste Wartezeit ein: In den langen Lücken spart er auf eine Königin, obwohl eine Drohne bezahlbar ist. Die Untergrenze von 5 s deckt die längste Wartezeit nicht ab.
- **Kauflücken Idle:** Alle 6 Lücken betragen genau 5 min, also den Besuchsabstand. Als Kauflücke wäre „< 5 min“ damit nicht erfüllt. Mit echter Futterstelle gibt es zudem eine Lücke von 10 min, die längste Wartezeit beträgt dort 3 min 35 s.
- **Wiederaufgefüllte Futterstellen:** Keine liegt im Zielband (Aktiv 0 von 71.347, längste 2,71 min; Idle 0 von 284, längste 2,58 min). Am Ende von 24 h dauern sie nur noch 0,2 s bzw. 0,4 s.
- **Strecke ohne Kauf über 24 h:** Aktiv verfehlt das Ziel mit und ohne Provisorium. Idle verfehlt es mit echter Futterstelle und hält es nur mit `siteSize: 1e12` ein.
- **Platz:** Er läuft früh und dauerhaft über, siehe unten.

**Auffälligkeiten**

- **Wiederauffüllen beschleunigt sich selbst:** Der Schwarm bleibt erhalten, die Futterstelle wächst aber nicht mit. Dieser Effekt gehört zum [Provisorium](#44-leere-futterstelle-provisorium-bis-m12) und entfällt mit dem Weiterziehen.
- **Platz läuft früh über:** Die Warnschwelle wird bei Aktiv nach 24 s erreicht, bei Idle nach 2 min 21 s; die Belegung übersteigt den Platz nach 29 s bzw. 2 min 30 s. Am Ende der ersten Futterstelle sind 750 von 200 Plätzen belegt (375 %, Aktiv) bzw. 706 von 200 (353 %, Idle), nach 30 min 1.426 % bzw. 969 %. In M1.1 hat das keine Folgen, für das Weiterziehen in M1.2 aber schon.
- **Späte Käufe werden selten:** Aktiv spart spät im Lauf lange auf die nächste Königin, obwohl Drohnen bezahlbar sind. Daher stammt seine längste Strecke ohne Kauf über 24 h.
- **Die Brut konkurriert mit Käufen:** Eine Königin verbraucht bis zu `0,1 · 13,75 = 1,375` Nahrung/s, das entspricht dem Ertrag von knapp 7 Drohnen. Ohne Klicks und Käufe sinkt die Startnahrung nach ca. 3,6 s unter den Preis der ersten Drohne und ist nach ca. 10,9 s aufgebraucht.
- **Soldaten binden Nahrung:** Sie machen ein Viertel der Brut aus, aber rund 45 % ihrer Kosten, und haben in M1.1 noch keine spielerische Wirkung.

## 7. Ausblick

Weiterziehen, Kampf, Verluste, Reichweite, der Futterstellen-Generator und DNA-Belohnungen folgen in M1.2. Pheromone und Genom folgen in M1.3 und lösen dann auch das feste Brutverhältnis und die konstanten Modifikatoren ab.
