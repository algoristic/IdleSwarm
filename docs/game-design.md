# IdleSwarm · Game-Design-Spezifikation v1

> Stand: 19.11.2026 · Gehört zu: [Projektplan](projektplan.md), [Produktplanung](produktplanung.md), [Technisches Konzept](technisches-konzept.md)

## 1. Geltung

Diese Spezifikation legt Formeln, Startwerte und Kostenkurven für die Meilensteine **M1.1 · Kernschleife & Modell** und **M1.2 · Weiterziehen & Kampf** fest. Sie ist die fachliche Vorlage für die Umsetzung in `balance/domain`. Für M1.1 und M1.2 hat sie Vorrang vor dem Entwurf im [Technischen Konzept §5.2](technisches-konzept.md#52-modellgrößen-entwurf-für-spätere-größen).

- **Zahlenwerte sind „v1“:** Sie dürfen nachjustiert werden, bis die Bots die [Pacing-Ziele](projektplan.md#35-pacing-ziele-vorläufig) treffen; das Feintuning folgt in AP 1.5.5. Formeln und Zielbänder bleiben dabei unverändert.
- **Alle Konstanten sind über Parameter überschreibbar** ([ADR-007](adr/007-modell-seite-echarts-balancing.md)). So testet die Modell-Seite Varianten ohne Codeänderung.
- **Nicht enthalten:** die Darstellung der Sonar-Karte (AP 1.2.8), die Zyklen-Auswertung der Modell-Seite (AP 1.2.9) und Mechaniken ab M1.3 (siehe [Abschnitt 7](#7-ausblick)). Die Fundchance wird in M1.2 nur erzeugt und angezeigt, gezogen wird erst ab M1.3.
- **Kein Klick:** Seit [AP 1.1.9](projektplan.md#m11--kernschleife--modell) kennt das Spiel keinen Klick mehr, an seine Stelle tritt der [Grundertrag](#41-grundertrag).

| Thema | Abschnitt | Stories |
|---|---|---|
| Grundertrag und Vorrat | [4.1](#41-grundertrag), [4.5](#45-abgeleitete-werte) | US-01.01–01.03 |
| Sammeln | [4.3](#43-simulationsschritt) | US-01.04 |
| Kauf von Einheiten | [3](#3-kostenkurven), [4.2](#42-manueller-kauf) | US-02.01–02.03 |
| Platz | [4.5](#45-abgeleitete-werte) | US-02.04 |
| Passive Brut | [4.3](#43-simulationsschritt) | US-02.05 |
| Futterstellen zur Auswahl, sichere Futterstelle | [4.6](#46-futterstellen-generator) | US-04.01, 04.02 |
| Reichweite | [4.7](#47-reichweite-und-sichtbarkeit) | US-04.03 |
| Einnehmbarkeit, Verluste, DNA | [4.8](#48-kampf) | US-04.04, 04.05 |
| Transportkapazität und Priorität | [4.9](#49-transportkapazität) | US-04.06 |
| Drohnen opfern | [4.10](#410-drohnen-opfern) | US-04.07, 04.08 |
| Jederzeit weiterziehen | [4.11](#411-weiterziehen-und-reise) | US-04.09 |
| Strategie und Auto-Weiterziehen | [4.12](#412-strategien-und-auto-weiterziehen) | US-04.10, 04.11 |

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
| Position | Ursprung `(0, 0)` der Ebene |
| Route | nur die Startfutterstelle |
| Zugzähler `z` | 0 |
| Kandidaten | 6, beim Start erzeugt ([4.6](#46-futterstellen-generator)) |
| Reise | keine |
| Auto-Weiterziehen | aus, Strategie „Ausgewogen“, Schwelle 0 % |
| Mitnahme-Priorität | ausgewogen |

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
| `g_0` | `baseFoodRate` | 1,5 | Grundertrag in Nahrung/s; gemessen in AP 1.1.9 ([Abschnitt 6](#6-messwerte-v1)) |
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
| `s_0` | `siteSize` | 20.000 | Größe der ersten Futterstelle und Basis der Größe aller weiteren |
| `R_0` | `baseRange` | 5 | Grundreichweite in Distanzeinheiten |
| `m` | `perceptionMargin` | 1 | Wahrnehmungssaum: so weit über die Reichweite hinaus sind Ziele mit Werten sichtbar |
| `k` | `candidateCount` | 6 | Kandidaten je Erzeugung |
| `d_min` | `candidateMinDistance` | 1 | kleinste Distanz eines Kandidaten |
| `d_max` | `candidateMaxDistance` | 7 | größte Distanz eines Kandidaten |
| `γ_G` | `siteSizeGrowth` | 1,4 | Wachstum der Größe je Weiterzug |
| `β_G` | `siteSizeDistanceBonus` | 0,1 | Größenzuschlag je Distanzeinheit über 1 |
| `b_0` | `siteDefenseBase` | 20 | Basis der Abwehr |
| `γ_B` | `siteDefenseGrowth` | 1,35 | Wachstum der Abwehr je Weiterzug |
| `β_B` | `siteDefenseDistanceBonus` | 0,15 | Abwehrzuschlag je Distanzeinheit über 1 |
| `σ` | `siteSpread` | 0,2 | Streuung des Zufallsfaktors `u` um 1 |
| `d_0` | `dnaBase` | 1 | Basis der DNA-Belohnung |
| `δ` | `dnaExponent` | 0,8 | Exponent der DNA-Belohnung |
| `λ` | `lossFactor` | 0,5 | Verlustfaktor |
| `κ` | `lossExponent` | 2 | Verlustexponent |
| `η_0` | `sacrificeYield` | 0,5 | Ausbeute beim Opfern von Drohnen (Umwandlungsverlust 50 %) |
| `v_min` | `minSacrificeLoss` | 0,1 | Mindest-Umwandlungsverlust; begrenzt die Ausbeute auf höchstens 0,9 |
| `t_r` | `travelSecondsPerDistance` | 10 | Reisedauer in s je Distanzeinheit |
| `ℓ_max` | `balancedMaxLossShare` | 0,25 | höchster erwarteter Verlustanteil für die Strategie „Ausgewogen“ |
| `θ_0` | `defaultAutoThreshold` | 0 | Standard-Schwelle des Auto-Weiterziehens (0 % = leer) |
| `θ_max` | `maxAutoThreshold` | 0,9 | höchste einstellbare Schwelle |
| – | `siteTypes` | siehe unten | Faktoren, Fundchance und Ziehungsgewicht je Futterstellentyp |

Weitere Symbole: `Q`, `D`, `S` sind die Anzahl Königinnen, Drohnen und Soldaten, `N` die Nahrung, `V` der Vorrat der Futterstelle, `G` ihre Größe, `B` die Abwehr eines Ziels, `P` die aktuelle Position, `R` die aktuelle Reichweite, `z` der Zugzähler und `dt` die Schrittdauer in Sekunden. Die Modifikatoren `M_sammeln`, `M_brut`, `M_verlust` und `M_ausbeute` sind bis M1.3 gleich 1.

**Futterstellentypen der Ära I** (`siteTypes`, stabile IDs):

| ID | Name | Größe× `f_G` | Abwehr× `f_B` | Fundchance | Gewicht `g` |
|---|---|---|---|---|---|
| `algal-mat` | Algenmatte | 0,5 | 0 | 5 % | 1 |
| `vent` | Schlot | 1 | 1 | 10 % | 1 |
| `bacterial-mat` | Bakterienrasen | 1,5 | 2,5 | 15 % | 1 |
| `methane-seep` | Methanquelle | 2,5 | 2 | 20 % | 1 |
| `whale-fall` | Walsturz | 3 | 3 | 30 % | 1 |

`vent` ist die bestehende ID der ersten Futterstelle. Die Reihenfolge der Tabelle ist die Reihenfolge der gewichteten Ziehung ([4.6](#46-futterstellen-generator)). Das Gewicht ist vorläufig: Alle Typen sind gleich wahrscheinlich.

## 3. Kostenkurven

```
Preis = c · w^n
```

`n` ist die Anzahl bisher **manuell gekaufter** Einheiten dieses Typs (Kaufzähler `bought`). Passive Brut erhöht `n` nicht, die Umwandlung von Drohnen in eine Königin schon ([4.10](#410-drohnen-opfern)). Der Zähler bleibt beim Weiterziehen für alle Einheitentypen erhalten ([4.11](#411-weiterziehen-und-reise)).

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

Das Diagramm zeigt, wie die Größen in M1.2 zusammenwirken. Abgerundete Knoten sind Vorgänge, eckige Knoten sind Größen. Konstanten, Modifikatoren, die Reise und die Einstellungen (Strategie, Schwelle, Priorität) sind nicht eingezeichnet.

| Darstellung | Bedeutung |
|---|---|
| durchgezogener Pfeil | Der Vorgang erhöht die Größe. |
| dicker Pfeil | Der Vorgang verbraucht die Größe. |
| gestrichelter Pfeil | Die Größe bestimmt den Wert oder die Stärke des Ziels oder ist seine Bedingung. |
| gestrichelter Rahmen | Die Größe wirkt in M1.2 auf nichts anderes. |

```mermaid
flowchart TB
    grundertrag(["Grundertrag"])
    sammeln(["Sammeln"])
    kauf(["Manueller Kauf"])
    brut(["Passive Brut"])
    opfern(["Drohnen opfern"])
    weiter(["Weiterziehen"])

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
    kandidaten["Kandidaten<br/>(Größe, Abwehr, Distanz)"]
    zug["Zugzähler z"]
    dna["DNA"]

    vorrat ==> grundertrag
    vorrat ==> sammeln
    grundertrag --> nahrung
    sammeln --> nahrung

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

    drohne ==> opfern
    preis -.->|"Königinnenpreis"| opfern
    opfern --> nahrung
    opfern --> koenigin
    opfern --> bought

    koenigin -.-> platzFrei
    drohne -.-> platzBelegt
    soldat -.-> platzBelegt
    soldat -.-> angriff

    platzFrei -.-> weiter
    platzBelegt -.-> weiter
    angriff -.->|"einnehmbar, Verluste"| weiter
    kandidaten -.-> weiter
    vorrat -.->|"Auto: V ≤ Schwelle"| weiter
    vorrat ==>|"Restvorrat verfällt"| weiter
    drohne ==>|"zurückgelassen"| weiter
    soldat ==>|"zurückgelassen, Verluste"| weiter
    weiter -->|"neue Futterstelle"| vorrat
    weiter --> dna
    weiter --> zug
    zug -.-> kandidaten

    classDef ohneWirkung stroke-dasharray: 5 5
    class dna ohneWirkung
```

- **Wachstum:** Der Grundertrag trägt den Start. Danach sammeln Drohnen Nahrung, und Nahrung wird über Kauf und Brut zu neuen Drohnen. Königinnen verstärken diese Schleife über die Eier/min.
- **Konkurrenz:** Kauf und Brut verbrauchen dieselbe Nahrung.
- **Grenze:** Grundertrag und Drohnen leeren denselben Vorrat. Ist er leer oder lohnt ein anderes Ziel, zieht der Schwarm weiter.
- **Weiterziehen:** Platz entscheidet, wer mitkommt; Angriff entscheidet, welches Ziel einnehmbar ist und wie viele Soldaten fallen. Jeder Weiterzug erhöht `z` und damit Größe und Abwehr der nächsten Kandidaten.
- **Noch ohne Wirkung:** DNA wird ab M1.2 gesammelt und erst mit dem Genom in M1.3 ausgegeben.

### 4.1 Grundertrag

Die Futterstelle liefert je Sekunde den festen Ertrag `g_0`, unabhängig von der Zahl der Einheiten. Er wird im [Simulationsschritt](#43-simulationsschritt) zusammen mit dem Sammeln der Drohnen verrechnet und vom selben Vorrat abgezogen. Bei leerem Vorrat und während einer Reise ist er 0.

Der Grundertrag hat zwei Aufgaben: Er trägt den Spielstart, in dem die Brut der ersten Königin mehr Nahrung braucht als wenige Drohnen liefern. Außerdem bleibt der Schwarm handlungsfähig, wenn er weder Drohnen noch Nahrung hat. Ein Klick oder Tap erzeugt keine Nahrung.

### 4.2 Manueller Kauf

Ein Kauf ist nur möglich, wenn `N ≥ Preis`. Er wird sofort angewendet, nicht erst im nächsten Tick, auch während einer Reise:

```
N -= Preis
Einheit += 1
bought(Einheitentyp) += 1
```

Ein Kauf ergibt genau +1 Einheit. **Platz begrenzt weder Kauf noch Brut**, er wirkt erst beim Aufbruch ([4.9](#49-transportkapazität)).

### 4.3 Simulationsschritt

Je Schritt der Dauer `dt` laufen nacheinander (0) Reise, (1) Grundertrag und Sammeln, (2) Brut und (3) Auto-Weiterziehen. Der Logik-Takt beträgt 10 Hz, also `dt = 0,1` ([Technisches Konzept §4](technisches-konzept.md#4-simulation)).

**(0) Reise:** Nur während einer Reise; die Restdauer sinkt um `dt`, bei 0 kommt der Schwarm an ([4.11](#411-weiterziehen-und-reise)).

**(1) Grundertrag und Sammeln:** Entfällt in jedem Schritt, in dem eine Reise läuft oder endet.

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
- Königinnen schlüpfen nicht passiv, sie werden nur gekauft oder aus Drohnen umgewandelt.
- Fehlt Nahrung, pausiert die Brut anteilig. Nahrung wird nie negativ.
- Die Brut läuft auch während einer Reise.

**(3) Auto-Weiterziehen:** Prüft am Ende des Schritts den Auslöser ([4.12](#412-strategien-und-auto-weiterziehen)).

**Beispiel 1** mit `Q = 1`, `D = 10`, `S = 0`, `N = 5`, `V = 1.000`, `dt = 0,1`, ohne Reise:

| Schritt | Rechnung | Ergebnis |
|---|---|---|
| Grundertrag und Sammeln | `F = min((1,5 + 10 · 0,2) · 0,1; 1.000) = 0,35` | `N = 5,35`, `V = 999,65` |
| Eier | `e = 6 / 60 · 0,1 = 0,01` | |
| Geschlüpft | `h = min(0,01; 5,35 / 13,75 ≈ 0,389) = 0,01` | `D = 10,0075`, `S = 0,0025` |
| Kosten | `0,01 · 13,75 = 0,1375` | `N = 5,2125` |

**Beispiel 2** (Nahrung reicht nicht) mit `Q = 1`, `D = 0`, `S = 0`, `N = 0,05`, `V = 0`, `dt = 0,1`: Ohne Vorrat gibt es keinen Grundertrag, also ist `h = min(0,01; 0,05 / 13,75 ≈ 0,00364) ≈ 0,00364`. Es schlüpfen rund 0,00273 Drohnen und 0,00091 Soldaten, danach ist `N = 0`.

### 4.4 Leere Futterstelle (Provisorium bis M1.2)

> **Entfallen mit M1.2:** An die Stelle dieser Regel und der Aktion „Neue Futterstelle“ tritt das [Weiterziehen](#411-weiterziehen-und-reise). Der Abschnitt bleibt stehen, weil die [Messwerte v1](#6-messwerte-v1) mit diesem Provisorium gemessen wurden.

Bis M1.1 galt:

- Bei `V = 0` brachten Grundertrag und Drohnen nichts mehr. Die Brut lief weiter, solange Nahrung da war.
- Nur bei leerem Vorrat stand die Aktion **„Neue Futterstelle“** bereit. Sie setzte `V` wieder auf die Größe derselben Futterstelle.
- Einheiten, Nahrung und Kaufzähler blieben erhalten.
- Auch die Bots nutzten diese Aktion.

### 4.5 Abgeleitete Werte

Diese Werte werden nicht gespeichert, sondern aus dem Zustand berechnet.

| Wert | Formel | Hinweis |
|---|---|---|
| Nahrung/s gesamt | `g_0 + D · r_d · M_sammeln` | 0 bei leerem Vorrat und während einer Reise |
| davon Drohnen | `D · r_d · M_sammeln` | 0 bei leerem Vorrat und während einer Reise |
| Eier/min | `Q · e_q · M_brut` | |
| Gesamtangriff | `A = S · a_s` | v1: `A = S · 1` |
| Platz verfügbar | `C = Q · p_q` | v1: `Q · 10` |
| Platz belegt | `O = D · p_d + S · p_s` | v1: `D · 1 + S · 2`; darf den verfügbaren Platz übersteigen |
| Warnfarbe Platz | `belegt ≥ 0,9 · verfügbar` | US-02.04 |
| Restzeit Futterstelle | `V / (g_0 + D · r_d · M_sammeln)` | auch ohne Drohnen bestimmbar |
| Effekt einer weiteren Königin | `+e_q · M_brut` Eier/min, `+p_q` Platz | Anzeige vor dem Kauf (US-02.03) |
| Reichweite | `R = R_0` | v1: 5; ab M1.3 durch Adaptionen erhöht |
| Distanz eines Kandidaten | `d = ‖Position − P‖` | euklidisch in der Ebene |
| Status eines Kandidaten | [4.7](#47-reichweite-und-sichtbarkeit) | in Reichweite, außer Reichweite, unerforscht |
| Mitkommende Einheiten | `D'`, `S'` aus [4.9](#49-transportkapazität) | gleich `D`, `S` bei `O ≤ C` |
| Zurückgelassene Einheiten | `D − D'`, `S − S'` | Anzeige vor dem Aufbruch (US-04.06) |
| Angriff nach Transport | `A' = S' · a_s` | gleich `A` bei `O ≤ C` |
| Einnehmbar | `A' ≥ B` | Urteil „einnehmbar“ oder „zu stark“ (US-04.04) |
| Erwartete Verluste | `L` aus [4.8](#48-kampf) mit `S'` und `A'` | 0 bei `B = 0` |
| Erwarteter Verlustanteil | `L / S'` | 0 bei `L = 0` |
| DNA-Belohnung | `d_0 · B^δ` | 0 bei `B = 0` |
| Fundchance | aus der Typtabelle ([2.3](#23-konstanten)) | nur Anzeige, gezogen ab M1.3 |
| Reisedauer | `d · t_r` | v1: 10 s je Distanzeinheit |
| Ausbeute beim Opfern | `η · c_d` Nahrung je Drohne | v1: 5; Umwandlungsverlust `1 − η` = 50 % |
| Drohnen je Königin | `Preis_Königin / (η · c_d)` | v1 beim Start: 12 |
| Ziel der Strategie | [4.12](#412-strategien-und-auto-weiterziehen) | Markierung auf der Karte (US-04.10) |
| Auslösevorrat Auto | `θ · G` | |

Beispiele: Mit 50 Drohnen und vollem Vorrat beträgt die Restzeit `20.000 / (1,5 + 50 · 0,2) ≈ 1.739 s`, also rund 29 min. Mit `Q = 2`, `D = 15`, `S = 3` sind 21 von 20 Plätzen belegt (105 %).

### 4.6 Futterstellen-Generator

Beim Spielstart und nach jeder Ankunft erzeugt der Generator `k = 6` Kandidaten um die aktuelle Position `P`. Positionen liegen in einer Ebene und werden in Distanzeinheiten gemessen. `r` steht für die jeweils nächste Zufallszahl in `[0, 1)` aus dem seeded RNG im Zustand ([ADR-003](adr/003-fester-logik-takt-seeded-rng.md)); gleicher RNG-Zustand und gleiches `z` ergeben dieselben Kandidaten.

```
für i = 1 … k, je Kandidat genau fünf Ziehungen in dieser Reihenfolge:
  Typ    = gewichtete Ziehung über die Typtabelle (Gewicht g)
  φ      = 2π · r                                   // Winkel in [0, 2π)
  d      = d_min + (d_max − d_min) · r              // Distanz, v1 in [1, 7)
  u_G    = 1 − σ + 2σ · r                           // v1 in [0,8; 1,2)
  u_B    = 1 − σ + 2σ · r
  Position = P + d · (cos φ, sin φ)
  G      = s_0 · γ_G^(z+1) · f_G(Typ) · (1 + β_G · (d − 1)) · u_G
  B      = round(b_0 · γ_B^z · f_B(Typ) · (1 + β_B · (d − 1)) · u_B)
```

- **Gewichtete Ziehung:** Der Typ ist der erste in der Reihenfolge der Typtabelle, bei dem die aufsummierten Gewichte `r · Σg` übersteigen.
- **Größe** ist der volle Vorrat bei Ankunft und bleibt ungerundet. **Abwehr** wird kaufmännisch auf eine ganze Zahl gerundet.
- `z` ist die Zahl der bisherigen Weiterzüge. Die Kandidaten beim Spielstart entstehen mit `z = 0`, nach der ersten Ankunft mit `z = 1`. So wächst die Größe von Futterstelle zu Futterstelle um `γ_G`, und schon die ersten Kandidaten sind größer als die Startfutterstelle.
- **DNA-Belohnung** und **Fundchance** werden nicht erzeugt, sondern aus Abwehr bzw. Typ abgeleitet ([4.5](#45-abgeleitete-werte)).
- Der Generator verbraucht immer `5 · k` Zufallszahlen, auch wenn die Garantie unten greift.

**Garantie einer sicheren Futterstelle (US-04.02):** Nach der Ziehung muss mindestens eine Algenmatte in Reichweite liegen (`d ≤ R` mit der Reichweite zum Zeitpunkt der Erzeugung). Nur die Algenmatte hat Abwehr 0. Fehlt sie, wird genau ein Kandidat ersetzt:

1. Gibt es Kandidaten in Reichweite, wird der nächstgelegene von ihnen ersetzt.
2. Sonst wird der nächstgelegene Kandidat überhaupt ersetzt, und seine Distanz wird auf `R` gesetzt; der Winkel bleibt.
3. Bei gleicher Distanz entscheidet der kleinere Index.

Der Ersatz wird zur Algenmatte: Typ `algal-mat`, Größe mit derselben Formel, demselben `u_G` und der ggf. neuen Distanz, Abwehr 0. Die Algenmatte bringt keine DNA und wegen `f_G = 0,5` wenig Nahrung. Weil die Reichweite nur steigen kann, bleibt die Garantie bis zur nächsten Erzeugung erhalten.

**Beispiel 3** (Kandidaten beim Spielstart, `z = 0`, `P = (0, 0)`, `R = 5`). Die Ziehungen sind so gewählt, dass die Rechnung übersichtlich bleibt:

| # | Typ | `d` | `u_G` | `u_B` | Größe `G` | Abwehr `B` | DNA | Status |
|---|---|---|---|---|---|---|---|---|
| K1 | `vent` | 3 | 0,9 | 1,0 | 30.240 | 26 | 13,55 | in Reichweite |
| K2 | `bacterial-mat` | 3 | 1,1 | 0,8 | 55.440 | 52 | 23,59 | in Reichweite |
| K3 | `algal-mat` | 2 | 1,1 | 1,0 | 16.940 | 0 | 0 | in Reichweite |
| K4 | `vent` | 1 | 1,0 | 1,0 | 28.000 | 20 | 10,99 | in Reichweite |
| K5 | `whale-fall` | 5,8 | 1,0 | 1,0 | 124.320 | 103 | 40,76 | außer Reichweite |
| K6 | `methane-seep` | 6,5 | 1,0 | 1,0 | 108.500 | 73 | 30,95 | unerforscht |

Rechnung für K1: `G = 20.000 · 1,4¹ · 1 · (1 + 0,1 · 2) · 0,9 = 30.240`, `B = round(20 · 1,35⁰ · 1 · (1 + 0,15 · 2) · 1,0) = 26`, DNA `= 26^0,8 ≈ 13,55`. Für K5: `G = 20.000 · 1,4 · 3 · 1,48 = 124.320`, `B = round(20 · 3 · 1,72) = round(103,2) = 103`.

Wäre K3 keine Algenmatte, griffe die Garantie: Der nächstgelegene Kandidat in Reichweite ist K4 (`d = 1`). Er würde zur Algenmatte mit `G = 20.000 · 1,4 · 0,5 · 1 · 1,0 = 14.000` und `B = 0`.

### 4.7 Reichweite und Sichtbarkeit

Der Status eines Kandidaten wird aus seiner Distanz und der aktuellen Reichweite abgeleitet, nicht gespeichert. Steigt die Reichweite (z. B. durch die Adaption „Chemotaxis“ ab M1.3), sind Ziele sofort aufgedeckt (US-04.03).

```
d = ‖Position − P‖
R = R_0                        // v1: 5; ab M1.3 mit Adaptionen
```

| Bedingung | Status | Anzeige | wählbar |
|---|---|---|---|
| `d ≤ R` | in Reichweite | alle Werte | ja, wenn einnehmbar ([4.8](#48-kampf)) |
| `R < d ≤ R + m` | außer Reichweite | alle Werte | nein |
| `d > R + m` | unerforscht | nur „?“ | nein |

**Beispiel:** Mit `R = 5` und `m = 1` liegen in Beispiel 3 K1 bis K4 in Reichweite, K5 (`d = 5,8`) ist außer Reichweite, K6 (`d = 6,5`) ist unerforscht. Mit `R = 6` wäre K5 wählbar (sofern einnehmbar) und K6 außer Reichweite, aber sichtbar.

### 4.8 Kampf

Der Kampf ist binär: Ein Ziel ist einnehmbar, wenn der Angriff seine Abwehr erreicht. Sonst ist kein Aufbruch dorthin möglich.

```
A   = S · a_s
einnehmbar  ⇔  A ≥ B

L   = 0                                  wenn B = 0 (auch bei A = 0)
L   = S · λ · (B / A)^κ · M_verlust      wenn 0 < B ≤ A

DNA = d_0 · B^δ                          // 0 bei B = 0
```

- Weil bei einnehmbaren Zielen `B / A ≤ 1` gilt, fällt mit `λ = 0,5` und `M_verlust = 1` höchstens die Hälfte der Soldaten. Je überlegener der Angriff, desto geringer die Verluste.
- Vor dem Aufbruch werden Einnehmbarkeit und erwartete Verluste mit den mitkommenden Soldaten `S'` und `A' = S' · a_s` berechnet ([4.9](#49-transportkapazität)), damit das Urteil auch nach dem Zurücklassen gilt.
- Gekämpft wird bei der Ankunft mit den dann vorhandenen Soldaten. Unterwegs kann `A` nur steigen (Brut, Käufe), das Ziel bleibt also einnehmbar, und die Verluste sind höchstens so hoch wie angezeigt.
- Die DNA wird bei der Ankunft gutgeschrieben (US-04.05).

**Beispiel 4** (Einnahme) mit `S = 34`, also `A = 34`, gegen K1 mit `B = 26`: `34 ≥ 26`, also einnehmbar. `L = 34 · 0,5 · (26 / 34)² = 17 · 0,5848 ≈ 9,94` Soldaten fallen (Verlustanteil 29,2 %), danach bleiben `S ≈ 24,06`. Gutgeschrieben werden `26^0,8 ≈ 13,55` DNA. K2 mit `B = 52` ist zu stark: `34 < 52`, kein Aufbruch.

### 4.9 Transportkapazität

Beim Aufbruch kommen nur so viele Drohnen und Soldaten mit, wie Platz da ist. Königinnen kommen immer mit und belegen keinen Platz.

```
C = Q · p_q                              // Platz
O = D · p_d + S · p_s                    // Belegung

O ≤ C:            D' = D,  S' = S
O > C, je nach Mitnahme-Priorität:
  Drohnen zuerst:   D' = min(D, C / p_d),   S' = min(S, (C − D' · p_d) / p_s)
  Soldaten zuerst:  S' = min(S, C / p_s),   D' = min(D, (C − S' · p_s) / p_d)
  ausgewogen:       D' = D · C / O,         S' = S · C / O

zurückgelassen:   D − D',  S − S'        // gehen ohne Rückerstattung verloren
```

| ID | Priorität | Wirkung |
|---|---|---|
| `drones-first` | Drohnen zuerst | erst Drohnen, der restliche Platz für Soldaten |
| `soldiers-first` | Soldaten zuerst | erst Soldaten, der restliche Platz für Drohnen |
| `balanced` | ausgewogen (Standard) | beide Typen mit demselben Anteil `C / O` |

Vor dem Aufbruch wird angezeigt, wie viele Einheiten zurückbleiben (US-04.06). Wer mehr mitnehmen will, kauft vorher Königinnen oder wandelt Drohnen in Königinnen um ([4.10](#410-drohnen-opfern)).

**Beispiel 5** mit `Q = 20`, `D = 500`, `S = 130`: `C = 200`, `O = 500 + 260 = 760`, also reicht der Platz nicht.

| Priorität | mitkommend `D'` / `S'` | zurückgelassen Drohnen / Soldaten | `A'` |
|---|---|---|---|
| ausgewogen | `500 · 200/760 ≈ 131,58` / `130 · 200/760 ≈ 34,21` | ≈ 368,42 / ≈ 95,79 | ≈ 34,21 |
| Drohnen zuerst | 200 / 0 | 300 / 130 | 0 |
| Soldaten zuerst | 0 / 100 | 500 / 30 | 100 |

Mit „ausgewogen“ ist K1 aus Beispiel 3 einnehmbar (`34,21 ≥ 26`); erwartet fallen `34,21 · 0,5 · (26 / 34,21)² ≈ 9,88` Soldaten. Mit „Drohnen zuerst“ bleibt nur die Algenmatte K3 einnehmbar.

### 4.10 Drohnen opfern

Drohnen lassen sich jederzeit mit Verlust umwandeln, auch während einer Reise. So kommt der Spieler aus der Lage heraus, dass ihm Soldaten oder Platz fehlen.

```
η = min(η_0 · M_ausbeute, 1 − v_min)     // Ausbeute, v1: 0,5; höchstens 0,9

Drohnen → Nahrung (0 < n ≤ D):
  D -= n
  N += n · η · c_d

Drohnen → Königin (nur wenn D ≥ k_q):
  k_q = Preis_Königin / (η · c_d)       // aktueller Preis mit Preisfaktor
  D -= k_q
  Q += 1
  bought(queens) += 1
```

- Der Umwandlungsverlust `1 − η` wird vor dem Opfern angezeigt. Adaptionen (ab M1.3) erhöhen die Ausbeute über `M_ausbeute`, aber der Verlust sinkt nie unter `v_min` (US-04.07).
- Die Umwandlung in eine Königin ist ein Kauf mit Drohnen statt Nahrung und erhöht den Kaufzähler. Gedacht ist sie für den Aufbruch-Dialog (US-04.08), möglich ist sie jederzeit.
- Bewertet wird zum Basispreis `c_d` einer Drohne, nicht zum aktuellen Kaufpreis.

**Beispiel 6:** 10 Drohnen ergeben `10 · 0,5 · 10 = 50` Nahrung; 50 Nahrung gehen verloren. Eine Königin kostet beim Start `60 / (0,5 · 10) = 12` Drohnen, nach fünf Königinnenkäufen `149,30 / 5 ≈ 29,86` Drohnen.

### 4.11 Weiterziehen und Reise

Der Schwarm kann jederzeit zu jedem einnehmbaren Ziel in Reichweite aufbrechen, nur nicht während einer Reise (US-04.09). Der Aufbruch ist ein Kommando und wird sofort angewendet; das Auto-Weiterziehen löst denselben Ablauf aus ([4.12](#412-strategien-und-auto-weiterziehen)).

**Aufbruch** (Bedingungen: keine Reise, Ziel in Reichweite, `A' ≥ B`):

```
D, S  = D', S'                           // Transport, Zurückgelassene gehen verloren
V     = 0                                // Restvorrat verfällt
Reise = { Ziel: Kandidat, Restdauer: d · t_r }
```

Die Oberfläche weist vorher darauf hin, dass der Restvorrat verfällt und wie viele Einheiten zurückbleiben.

**Unterwegs:** Die Restdauer sinkt je Schritt um `dt`. Grundertrag und Sammeln ruhen, die Brut läuft weiter und verbraucht Nahrung. Manuelle Käufe und das Opfern von Drohnen sind möglich, ein weiterer Aufbruch nicht. Die Kandidaten bleiben bis zur Ankunft stehen.

**Ankunft** (Restdauer ≤ 0):

```
S    -= L                                // Kampf mit S und A bei Ankunft (4.8)
DNA  += d_0 · B^δ
Futterstelle = { Typ, G, Vorrat = G }    // voller Vorrat
P     = Position des Ziels; Route += Ziel
z    += 1
Kandidaten = Generator(P, z)             // 4.6
Reise = keine
```

- **Bleibt erhalten:** Nahrung, Königinnen, die Kaufzähler `bought` für alle Einheitentypen und die Einstellungen.
- Die Reise rechnet in Spielzeit und läuft deshalb auch im Offline-Fortschritt weiter. Der Catch-up verkürzt seine Schritte an der Ankunft ([Technisches Konzept §4](technisches-konzept.md#4-simulation)).

**Ereignisse fürs Log** (Codes mit Daten, die Texte setzt die Oberfläche):

| Code | Daten |
|---|---|
| `departed` | Zieltyp, Distanz, zurückgelassene Drohnen und Soldaten, verfallener Vorrat, Auslöser `manual` oder `auto` |
| `arrived` | Typ der neuen Futterstelle, Verluste an Soldaten, gutgeschriebene DNA |
| `siteDepleted` | Typ der Futterstelle, deren Vorrat im Schritt auf 0 gefallen ist |

**Beispiel 7:** Der Schwarm aus Beispiel 4 (`S = 34`) bricht zu K1 auf (`d = 3`). Die Reise dauert `3 · 10 = 30 s`. Unterwegs schlüpfen bei `Q = 1` rund `30 · 0,1 · 0,25 = 0,75` Soldaten, wenn die Nahrung reicht; bei Ankunft ist `S ≈ 34,75` und `L = 34,75 · 0,5 · (26 / 34,75)² ≈ 9,73`. Der Schwarm erhält 13,55 DNA, steht an einem Schlot mit 30.240 Vorrat, und es entstehen neue Kandidaten mit `z = 1`.

### 4.12 Strategien und Auto-Weiterziehen

Eine Strategie wählt unter den **einnehmbaren Zielen in Reichweite** genau eines aus. Das Ziel wird auf der Karte markiert (US-04.10) und vom Auto-Weiterziehen angesteuert.

| ID | Strategie | Hauptkriterium | bei Gleichstand zuerst |
|---|---|---|---|
| `least-resistance` | Geringster Widerstand | geringste erwartete Verluste `L` | größerer Vorrat `G` |
| `balanced` | Ausgewogen (Standard) | größter Vorrat `G` unter den Zielen mit `L / S' ≤ ℓ_max` | geringere erwartete Verluste `L` |
| `battle-hardened` | Kampfgehärtet | größte DNA-Belohnung | größerer Vorrat `G` |

- **Gleichstand:** Danach entscheidet die geringere Distanz, zuletzt der kleinere Index in der Kandidatenliste. Die Wahl ist damit deterministisch.
- **Rückfall:** Findet die Strategie kein Ziel, wählt der Schwarm die sichere Futterstelle (Abwehr 0) in Reichweite, unter mehreren die mit dem größeren Vorrat, dann wie oben. Mit der Garantie aus [4.6](#46-futterstellen-generator) findet jede Strategie mindestens die Algenmatte; der Rückfall sichert nur abweichende Parameter ab.

**Auto-Weiterziehen** (US-04.11) ist ein- und ausschaltbar und in einem neuen Spiel ausgeschaltet. Es wird in Schritt (3) jedes [Simulationsschritts](#43-simulationsschritt) geprüft, damit es auch im Offline-Fortschritt wirkt:

```
Auslöser:  Auto an  ∧  keine Reise  ∧  V ≤ θ · G
θ ∈ [0; θ_max], Standard θ_0 = 0        // 0 % = leer, höchstens 90 %
→ Aufbruch zum Ziel der Strategie, Auslöser auto
```

Strategie, Schwelle, Auto an/aus und Mitnahme-Priorität sind Spielereinstellungen und werden im Spielstand gespeichert ([5](#5-spielstand-version-3)).

**Beispiel 8** mit den Kandidaten aus Beispiel 3, `S = S' = 34` (genug Platz):

| # | `B` | einnehmbar | `L` | `L / S'` | `G` | DNA |
|---|---|---|---|---|---|---|
| K1 | 26 | ja | 9,94 | 29,2 % | 30.240 | 13,55 |
| K2 | 52 | nein | – | – | 55.440 | 23,59 |
| K3 | 0 | ja | 0 | 0 % | 16.940 | 0 |
| K4 | 20 | ja | `34 · 0,5 · (20/34)² ≈ 5,88` | 17,3 % | 28.000 | 10,99 |

K5 und K6 liegen nicht in Reichweite. „Geringster Widerstand“ wählt K3, „Ausgewogen“ wählt K4 (K1 überschreitet 25 %, K4 ist größer als K3), „Kampfgehärtet“ wählt K1.

## 5. Spielstand Version 3

Version 2 hat den Spielstand um die aktuelle Futterstelle und die Kaufzähler ergänzt, Version 3 ergänzt Karte, Reise und Einstellungen. Die Feldnamen sind Vorschläge für die Umsetzung in AP 1.2.6.

| Feld | Inhalt | seit |
|---|---|---|
| `site` | stabile Typ-ID (`type`), `size`, `stock` | 2 |
| `bought` | Kaufzähler je Einheitentyp (`queens`, `drones`, `soldiers`) | 2 |
| `map` | aktuelle Position `position` (`x`, `y`), Kandidaten `candidates` (je `type`, `position`, `size`, `defense`), Route `route` (je `type`, `position`, ab der Startfutterstelle; höchstens die letzten 50 Punkte), Zugzähler `moves` (`z`) | 3 |
| `travel` | `null` oder Ziel `target` (wie ein Kandidat) und Restdauer `remainingMs` | 3 |
| `auto` | `enabled`, `strategy` (Strategie-ID), `threshold` (0 bis 0,9) | 3 |
| `priority` | ID der Mitnahme-Priorität | 3 |

- Gespeichert werden je Kandidat nur Typ-ID, Position, Größe und Abwehr. Distanz, Status, DNA, Fundchance, Einnehmbarkeit und Verluste sind abgeleitet, ebenso die Reichweite.
- Die stabile ID der ersten Futterstelle ist `vent` (Schlot). Wie überall speichert der Spielstand nur IDs, keine Texte ([Technisches Konzept §3.4](technisches-konzept.md#34-zustandsmodell-entwurf)).

**Migration von Version 1:** Seed, RNG-Zustand und Zeiten bleiben erhalten. Futterstelle, Kaufzähler, Ressourcen und Einheiten werden auf die Startwerte aus [Abschnitt 2.1](#21-startzustand) gesetzt.

**Migration von Version 2:** Seed, RNG-Zustand und Zeiten bleiben erhalten. Alles andere wird auf die Startwerte aus [Abschnitt 2.1](#21-startzustand) gesetzt. Die Startkandidaten entstehen deterministisch aus dem übernommenen RNG-Zustand; der migrierte Spielstand enthält den danach fortgeschriebenen RNG-Zustand, wie ein neues Spiel.

## 6. Messwerte v1

> **Hinweis M1.2:** Die Messungen unten stammen aus M1.1 und nutzen das inzwischen entfallene [Provisorium aus §4.4](#44-leere-futterstelle-provisorium-bis-m12). Mit den Mechaniken aus M1.2 wird neu gemessen.

> **Gemessen** mit dem Headless-Runner (Stand AP 1.1.9, ohne Klick, mit Grundertrag `g_0 = 1,5`). Die Werte v1 bleiben unverändert, das Balancing folgt in AP 1.5.5. Die Zielbänder im [Projektplan §3.5](projektplan.md#35-pacing-ziele-vorläufig) gelten unverändert. **Die Mess-Definitionen unten sind vorläufig, die Entscheidung des Product Owners ist offen.**

**Messaufbau**

- Seed `modell`, `stepMs` 1000, Formeln und Werte wie oben. Die Spiellogik zieht noch keinen Zufall, das Ergebnis hängt also nicht vom Seed ab.
- **Aktiv:** entscheidet jede Sekunde und kauft die Einheit mit der kürzesten Amortisation. Ist diese noch zu teuer, spart er auf sie. Soldaten kauft er nicht.
- **Idle:** schaut alle 5 min vorbei und kauft dann alles Bezahlbare, Königin vor Drohne. Soldaten kauft er nicht.
- Beide lösen bei leerem Vorrat „Neue Futterstelle“ aus: Aktiv bei der nächsten Entscheidung, Idle beim nächsten Besuch.

**Mess-Definitionen (vorläufig, Entscheidung des Product Owners offen)**

- Kauflücken und längste Wartezeit der ersten 30 min werden mit `siteSize: 1e12` gemessen, damit das [Provisorium](#44-leere-futterstelle-provisorium-bis-m12) sie nicht verfälscht. Die Futterstellen werden mit der echten Größe 20.000 gemessen.
- **Längste Wartezeit** (`longestWaitMs`): längste zusammenhängende Strecke der ersten 30 min, in der nach den Entscheidungen des Bots weder Königin noch Drohne bezahlbar ist.
- Das Idle-Ziel „< 5 min“ und die Obergrenze 60 s für Aktiv werden über die längste Wartezeit bewertet, weil sonst Besuchsabstand und bewusstes Sparen die Kauflücke bestimmen.
- **Kauflücke:** Abstand zweier Kaufzeitpunkte; Käufe im selben Moment zählen als einer.
- **Dauer einer Futterstelle:** von ihrem Beginn bis zum leeren Vorrat, ohne die Zeit bis zur Erneuerung.
- Die „Durststrecke ohne neue Option“ wird als längste Strecke ohne Kauf gemessen.

| Kennzahl | Futterstelle | Ziel aktiv | Aktiv | Ziel idle | Idle |
|---|---|---|---|---|---|
| Erster Kauf | 20.000 | < 10 s | 0 s | – | 0 s |
| Längste Wartezeit, erste 30 min | `1e12` | ≤ 60 s | **1 min 49 s** | < 5 min | 1 min 07 s |
| Kauflücken, erste 30 min: Anzahl | `1e12` | – | 91 | – | 6 |
| Kauflücken, erste 30 min: Median | `1e12` | 5–60 s | 7 s | – | 5 min |
| Kauflücken, erste 30 min: Maximum | `1e12` | – | 99 s | – | 5 min |
| Erste Futterstelle | 20.000 | 3–15 min | 10,57 min | 10–60 min | 13,11 min |
| 2. / 3. / 4. Futterstelle | 20.000 | 3–15 min | **2,72 / 1,91 / 1,53 min** | 10–60 min | **2,41 / 1,47 / 1,01 min** |
| Längste Strecke ohne Kauf, 1 h | 20.000 | < 10 min | 3,97 min | < 60 min | 5,00 min |
| Längste Strecke ohne Kauf, 24 h | 20.000 | < 10 min | **187,73 min** | < 60 min | **95,00 min** |
| Längste Strecke ohne Kauf, 24 h | `1e12` | < 10 min | **114,62 min** | < 60 min | 35,00 min |

Fett: außerhalb des Zielbands.

Ergänzend, ohne Zielband: Der Anteil Wartezeit beträgt in den ersten 30 min 15,9 % (Aktiv) und 4,9 % (Idle), jeweils mit `siteSize: 1e12`. Über 24 h mit echter Futterstelle sind es 0,42 % und 59,14 %. Die Nahrungsrate verdoppelt sich im Median alle 448 s (Aktiv) und 460 s (Idle), abgetastet je Minute über 24 h mit echter Futterstelle.

**Vergleich mit dem Stand vor dem Klick-Ausbau (AP 1.1.8):** Die erste Futterstelle dauert bei Aktiv 10,57 statt 9,60 min, bei Idle 13,11 statt 15,50 min. Die längste Wartezeit steigt bei Aktiv von 14,7 s auf 1 min 49 s und sinkt bei Idle von 3 min 15 s auf 1 min 07 s. Die längsten Strecken ohne Kauf über 24 h ändern sich kaum. Die Nahrungsrate verdoppelt sich langsamer (448 statt 225 s bzw. 460 statt 354 s), weil sie nach dem ersten Drohnenkauf mit Grundertrag bei 1,7 statt 0,2 Nahrung/s beginnt.

**Außerhalb der Zielbänder oder nur mit der vorläufigen Definition passend**

- **Längste Wartezeit Aktiv:** Die 1 min 49 s liegen ganz am Spielbeginn (0 bis 109 s). Aktiv kauft dort bei jeder Entscheidung sofort die nächste Drohne, 14 Käufe im Abstand von 14 s bis 5 s. Danach ist jeweils nichts mehr bezahlbar, und nach der vorläufigen Definition zählt die ganze Strecke als eine Wartezeit. Erst als Aktiv auf die erste Königin spart (Kauf bei 116 s), bleibt eine Drohne bezahlbar. Als Kauflücke gemessen ist die längste Pause in dieser Phase 14 s. Die Definition misst hier also eher die Kaufkraft als das Warten.
- **Kauflücken Aktiv:** 35 von 91 Lücken liegen unter 5 s (kürzeste 1 s), 7 über 60 s (63 bis 99 s). In den langen Lücken spart Aktiv auf eine Königin, obwohl eine Drohne bezahlbar ist.
- **Kauflücken Idle:** Alle 6 Lücken betragen genau 5 min, also den Besuchsabstand. Als Kauflücke wäre „< 5 min“ damit nicht erfüllt; die längste Wartezeit liegt im Zielband.
- **Wiederaufgefüllte Futterstellen:** Keine liegt im Zielband (Aktiv 0 von 71.287, längste 2,72 min; Idle 0 von 285, längste 2,41 min). Am Ende von 24 h dauern sie nur noch 0,2 s bzw. 0,4 s.
- **Strecke ohne Kauf über 24 h:** Aktiv verfehlt das Ziel mit und ohne Provisorium. Idle verfehlt es mit echter Futterstelle und hält es nur mit `siteSize: 1e12` ein.
- **Platz:** Er läuft früh und dauerhaft über, siehe unten.

**Auffälligkeiten**

- **Grundertrag trägt den Start:** Bei einer Königin liegt er mit 1,5 Nahrung/s knapp über dem Nahrungsbedarf ihrer Brut (`0,1 · 13,75 = 1,375` Nahrung/s). Ohne Käufe sinkt die Nahrung deshalb nie, sie wächst langsam. Ohne Grundertrag, wie vor AP 1.1.9 ohne Klicks, wäre die Startnahrung nach ca. 10,9 s aufgebraucht.
- **Wiederauffüllen beschleunigt sich selbst:** Der Schwarm bleibt erhalten, die Futterstelle wächst aber nicht mit. Dieser Effekt gehört zum [Provisorium](#44-leere-futterstelle-provisorium-bis-m12) und entfällt mit dem Weiterziehen.
- **Platz läuft früh über:** Die Warnschwelle wird bei Aktiv nach 40 s erreicht, bei Idle nach 1 min 04 s. Die Belegung übersteigt den Platz nach 47 s bzw. 1 min 13 s. Am Ende der ersten Futterstelle sind 758 von 200 Plätzen belegt (379 %, Aktiv) bzw. 706 von 160 (441 %, Idle), nach 30 min 1.391 % bzw. 1.165 %. In M1.1 hat das keine Folgen, für das Weiterziehen in M1.2 aber schon.
- **Späte Käufe werden selten:** Aktiv spart spät im Lauf lange auf die nächste Königin, obwohl Drohnen bezahlbar sind. Daher stammt seine längste Strecke ohne Kauf über 24 h.
- **Die Brut konkurriert mit Käufen:** Eine Königin verbraucht bis zu 1,375 Nahrung/s, das entspricht fast dem ganzen Grundertrag oder dem Ertrag von knapp 7 Drohnen. Idle kauft beim ersten Besuch 7 Königinnen; danach ist der Nettozufluss negativ (−4,8 Nahrung/s), und die Brut pausiert anteilig, bis genug Drohnen geschlüpft sind. Daher stammt seine längste Wartezeit.
- **Soldaten binden Nahrung:** Sie machen ein Viertel der Brut aus, aber rund 45 % ihrer Kosten, und haben in M1.1 noch keine spielerische Wirkung.

## 7. Ausblick

- **M1.2, weitere APs:** Die Sonar-Karte (AP 1.2.8) stellt Kandidaten, Status, Reichweite, Route und das Ziel der Strategie dar. Die Modell-Seite wertet Zyklen aus (AP 1.2.9: Dauer pro Futterstelle, Soldaten-Bilanz, Warnung bei Stillstand) und bekommt die Bots „Drohnen-lastig“ und „Soldaten-lastig“. Die Bots „Aktiv“ und „Idle“ ziehen schon ab AP 1.2.7 weiter; die Messwerte in [Abschnitt 6](#6-messwerte-v1) werden mit M1.2 neu erhoben.
- **M1.3:** Das Genom gibt DNA aus und füllt die Modifikatoren `M_sammeln`, `M_brut`, `M_verlust` und `M_ausbeute`; Adaptionen wie „Chemotaxis“ erhöhen die Reichweite. Pheromone lösen das feste Brutverhältnis ab. Funde werden bei der Ankunft mit der Fundchance des Typs gezogen.
- **AP 1.5.5:** Feintuning aller Werte v1 gegen die Zielbänder.
