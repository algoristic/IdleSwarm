# IdleSwarm · Game-Design-Spezifikation v1

> Stand: 18.11.2026 · Gehört zu: [Projektplan](projektplan.md), [Produktplanung](produktplanung.md), [Technisches Konzept](technisches-konzept.md)

## 1. Geltung

Diese Spezifikation legt Formeln, Startwerte und Kostenkurven für Meilenstein **M1.1 · Kernschleife & Modell** fest. Sie ist die fachliche Vorlage für die Umsetzung in `core/balance`. Für M1.1 hat sie Vorrang vor dem Entwurf im [Technischen Konzept §5.2](technisches-konzept.md#52-modellgrößen-entwurf-für-spätere-größen).

- **Zahlenwerte sind „v1“:** Sie dürfen während M1.1 nachjustiert werden, bis die Bots die [Pacing-Ziele](projektplan.md#35-pacing-ziele-vorläufig) treffen. Formeln und Zielbänder bleiben dabei unverändert.
- **Alle Konstanten sind über Parameter überschreibbar** ([ADR-007](adr/007-modell-seite-echarts-balancing.md)). So testet die Modell-Seite Varianten ohne Codeänderung.
- **Nicht enthalten:** Mechaniken ab M1.2 (siehe [Abschnitt 7](#7-ausblick)).

| Thema | Abschnitt | Stories |
|---|---|---|
| Klick und Vorrat | [4.1](#41-klick), [4.5](#45-abgeleitete-werte) | US-01.01–01.03 |
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
| `k_0` | `clickYield` | 1 | Klickertrag |
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

Weitere Symbole: `Q`, `D`, `S` sind die Anzahl Königinnen, Drohnen und Soldaten, `N` die Nahrung, `V` der Vorrat der Futterstelle und `dt` die Schrittdauer in Sekunden. Die Modifikatoren `M_klick`, `M_sammeln` und `M_brut` sind bis M1.3 gleich 1.

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

### 4.1 Klick

```
Ertrag = min(k_0 · M_klick, V)
N += Ertrag
V -= Ertrag
```

Der Klick wird sofort angewendet, nicht erst im nächsten Tick. Bei leerem Vorrat ist der Ertrag 0.

### 4.2 Manueller Kauf

Ein Kauf ist nur möglich, wenn `N ≥ Preis`. Er wird wie der Klick sofort angewendet:

```
N -= Preis
Einheit += 1
bought(Einheitentyp) += 1
```

Ein Kauf ergibt genau +1 Einheit. **Platz begrenzt weder Kauf noch Brut**, er wird erst beim Weiterziehen (M1.2) wirksam.

### 4.3 Simulationsschritt

Je Schritt der Dauer `dt` laufen nacheinander (1) Sammeln und (2) Brut. Der Logik-Takt beträgt 10 Hz, also `dt = 0,1` ([Technisches Konzept §4](technisches-konzept.md#4-simulation)).

**(1) Sammeln**

```
F_d = min(D · r_d · M_sammeln · dt, V)
N += F_d
V -= F_d
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
| Sammeln | `F_d = min(10 · 0,2 · 0,1; 1.000) = 0,2` | `N = 5,2`, `V = 999,8` |
| Eier | `e = 6 / 60 · 0,1 = 0,01` | |
| Geschlüpft | `h = min(0,01; 5,2 / 13,75 ≈ 0,378) = 0,01` | `D = 10,0075`, `S = 0,0025` |
| Kosten | `0,01 · 13,75 = 0,1375` | `N = 5,0625` |

**Beispiel 2** (Nahrung reicht nicht) mit `Q = 1`, `D = 0`, `S = 0`, `N = 0,05`, `dt = 0,1`: `h = min(0,01; 0,05 / 13,75 ≈ 0,00364) ≈ 0,00364`. Es schlüpfen also rund 0,00273 Drohnen und 0,00091 Soldaten, danach ist `N = 0`.

### 4.4 Leere Futterstelle (Provisorium bis M1.2)

> **Provisorium:** Diese Regel überbrückt die Zeit, bis es das Weiterziehen gibt. Sie entfällt mit M1.2.

- Bei `V = 0` bringen Klicks und Drohnen nichts mehr. Die Brut läuft weiter, solange Nahrung da ist.
- Nur bei leerem Vorrat steht die Aktion **„Neue Futterstelle“** bereit. Sie setzt `V` wieder auf die Größe derselben Futterstelle.
- Einheiten, Nahrung und Kaufzähler bleiben erhalten.
- Auch die Bots nutzen diese Aktion.

### 4.5 Abgeleitete Werte

Diese Werte werden nicht gespeichert, sondern aus dem Zustand berechnet.

| Wert | Formel | Hinweis |
|---|---|---|
| Nahrung/s der Drohnen | `D · r_d · M_sammeln` | 0 bei leerem Vorrat |
| Eier/min | `Q · e_q · M_brut` | |
| Gesamtangriff | `A = S · a_s` | v1: `A = S · 1` |
| Platz verfügbar | `Q · p_q` | v1: `Q · 10` |
| Platz belegt | `D · p_d + S · p_s` | v1: `D · 1 + S · 2`; darf den verfügbaren Platz übersteigen |
| Warnfarbe Platz | `belegt ≥ 0,9 · verfügbar` | US-02.04 |
| Restzeit Futterstelle | `V / (D · r_d · M_sammeln)` | ohne Drohnen keine Schätzung; Klicks zählen nicht mit |
| Effekt einer weiteren Königin | `+e_q · M_brut` Eier/min, `+p_q` Platz | Anzeige vor dem Kauf (US-02.03) |

Beispiele: Mit 50 Drohnen und vollem Vorrat beträgt die Restzeit `20.000 / (50 · 0,2) = 2.000 s`, also 33 min 20 s. Mit `Q = 2`, `D = 15`, `S = 3` sind 21 von 20 Plätzen belegt (105 %).

## 5. Spielstand Version 2

Version 2 ergänzt den Spielstand um zwei Felder:

| Feld | Inhalt |
|---|---|
| `site` | stabile Typ-ID (`type`), `size`, `stock` |
| `bought` | Kaufzähler je Einheitentyp (`queens`, `drones`, `soldiers`) |

Die stabile ID der ersten Futterstelle ist `vent` (Schlot). Wie überall speichert der Spielstand nur die ID, keine Texte ([Technisches Konzept §3.4](technisches-konzept.md#34-zustandsmodell-entwurf)).

**Migration von Version 1:** Seed, RNG-Zustand und Zeiten bleiben erhalten. Futterstelle, Kaufzähler, Ressourcen und Einheiten werden auf die Startwerte aus [Abschnitt 2.1](#21-startzustand) gesetzt.

## 6. Plausibilitätsrechnung

> **Grobe Schätzung.** Die Werte stammen aus einer vorläufigen Überschlagssimulation mit vereinfachten Bots. Sie sind keine Messung und werden mit dem Headless-Runner (AP 1.1.7) überprüft.

**Annahmen**

- Formeln und Werte wie oben, `dt = 0,1`.
- **Aktiv:** 2–5 Klicks/s, kauft sofort, was bezahlbar ist. Geprüft mit Königin vor Drohne, mit und ohne Soldaten.
- **Idle:** klickt nicht, schaut alle 10 min vorbei, kauft dann alles Bezahlbare (Königin vor Drohne) und nutzt bei Bedarf „Neue Futterstelle“.

| Kennzahl ([Projektplan §3.5](projektplan.md#35-pacing-ziele-vorläufig)) | Ziel | Schätzung | Einordnung |
|---|---|---|---|
| Erste sinnvolle Entscheidung (aktiv) | < 10 s | sofort: 15 Nahrung reichen für die erste Drohne | im Ziel |
| Zeit zwischen zwei Käufen, erste 30 min (aktiv) | 5–60 s | Median ca. 8–11 s, längste Pause ca. 18–31 s | im Ziel |
| Dauer der ersten Futterstelle (aktiv) | 3–15 min | ca. 10–13 min | im Ziel |
| Dauer der ersten Futterstelle (idle) | 10–60 min | ca. 17 min (ganz ohne Käufe ca. 29 min) | im Ziel |
| Dauer der wiederaufgefüllten Futterstelle (aktiv) | 3–15 min | 2. ca. 3,1–3,5 min, 3. ca. 2,2–2,4 min, 8. ca. 1,1 min | **ab der 3. unter dem Ziel** |
| Dauer der wiederaufgefüllten Futterstelle (idle) | 10–60 min | 2. ca. 2,6 min, 3. ca. 1,1 min | **unter dem Ziel** |

**Auffälligkeiten für das Nachjustieren**

- **Wiederauffüllen beschleunigt sich selbst:** Der Schwarm bleibt erhalten, die Futterstelle wächst aber nicht mit. Dieser Effekt gehört zum [Provisorium](#44-leere-futterstelle-provisorium-bis-m12) und entfällt mit dem Weiterziehen.
- **Platz läuft früh über:** Ganz ohne Käufe wird die Warnschwelle nach ca. 3 min erreicht. Der aktive Bot belegt am Ende der ersten Futterstelle ca. 614 von 150 Plätzen (ca. 410 %). In M1.1 hat das keine Folgen, für das Weiterziehen in M1.2 aber schon.
- **Die Brut konkurriert mit Käufen:** Eine Königin verbraucht bis zu `0,1 · 13,75 = 1,375` Nahrung/s, das entspricht dem Ertrag von knapp 7 Drohnen. Ohne Klicks und Käufe sinkt die Startnahrung nach ca. 3,6 s unter den Preis der ersten Drohne und ist nach ca. 10,9 s aufgebraucht.
- **Soldaten binden Nahrung:** Sie machen ein Viertel der Brut aus, aber rund 45 % ihrer Kosten, und haben in M1.1 noch keine spielerische Wirkung.

## 7. Ausblick

Weiterziehen, Kampf, Verluste, Reichweite, der Futterstellen-Generator und DNA-Belohnungen folgen in M1.2. Pheromone und Genom folgen in M1.3 und lösen dann auch das feste Brutverhältnis und die konstanten Modifikatoren ab.
