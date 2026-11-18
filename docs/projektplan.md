# IdleSwarm · Projektplan

> Stand: 18.11.2026 · Grundlage: [Projektidee (archiviert)](archiv/projektidee.md), [Produktplanung](produktplanung.md), [Technisches Konzept](technisches-konzept.md), UI-Leitbild [Mockup K2 · Kamera-Zoom](mockups/k2-zoom.html)

## 1. Ziel und Rahmen

IdleSwarm ist ein Idle-Browserspiel für eine Person, ohne Multiplayer. Der Spieler steuert einen Schwarm, der als Einzeller in der Ursuppe beginnt, von Futterstelle zu Futterstelle zieht und sich über mehrere Ären (Meer, Land, All) zur dominanten Lebensform entwickelt.

| Rahmen | Festlegung |
|---|---|
| Plattform | Browser, **Desktop und Mobile von Anfang an** |
| Optik | Mockup **K2 · Kamera-Zoom**: Sonar-Karte ⊖ · Schwarm-Szene ✺ · Genom ⊕ als eine zusammenhängende Welt |
| Technik | Angular (zoneless, Signals), Spiellogik als reines TypeScript, kein Backend (Details: [Technisches Konzept](technisches-konzept.md)) |
| Team | 1 Entwickler + KI-Unterstützung |
| Planung | Aufwand in **Personentagen (PT)**, Meilensteine **ohne Termine** |
| Vorgehen | iterativ: Jeder Meilenstein endet mit einem spielbaren Stand und einem kurzen Spieltest-Review |

### Leitprinzip: Das Modell zuerst

Idle-Spiele stehen und fallen mit ihrer Wachstumskurve: Wird die Wartezeit zu lang, langweilt sich der Spieler, wächst alles zu schnell, gibt es keine Entscheidungen mehr. Deshalb entsteht ab Meilenstein 1.1 parallel zum Spiel eine **Modell-Seite**. Sie simuliert das Spiel ohne Oberfläche und zeigt Wachstum, Kosten und Pacing als Diagramme. Jede neue Mechanik wird dort sichtbar gemacht, bevor sie als fertig gilt.

## 2. Ausbaustufen im Überblick

| AS | Name | Kern | Detaillierung |
|---|---|---|---|
| **1** | **Basisspiel · Ära I Ursuppe** | vollständige Kernschleife einer Ära, K2-Oberfläche, Desktop und Mobile, Modell-Seite | **detailliert** (Abschnitt 3) |
| 2 | Evolution · große Ascension | Prestige-Schicht (Einzeller → Mehrzeller), Mutationen, Erfolge, aktive Fähigkeiten | grob + Entscheidungspunkte |
| 3 | Ära II · Urmeer | neue Biome, Verteidigungsarten, zweiter Rohstoff, Spezialeinheiten | grob + Entscheidungspunkte |
| 4 | Ära III · Land | Biome von Feld bis Metropole, Zivilisation als Gegner | grob + Entscheidungspunkte |
| 5 | Ära IV+ · Weltraum | Planeten, Systeme, FTL, Galaxien; endlose Skalierung | grob + Entscheidungspunkte |

Jede Ausbaustufe endet mit einem veröffentlichten Release (1.0, 2.0, …). Spielstände bleiben über alle Stufen hinweg kompatibel (Migrationen, siehe Technisches Konzept).

## 3. Ausbaustufe 1 · Basisspiel (Ära I Ursuppe)

### 3.1 Ziel

Ein vollständiges, ausbalanciertes Spiel für Ära I: Der Schwarm sammelt Nahrung, brütet Einheiten aus, erobert Futterstellen, entwickelt sein Genom und spielt auch idle und offline sinnvoll weiter. Die große Ascension (Übergang zum Mehrzeller) ist **nicht** enthalten. Ära I hat ein offenes Ende, das Spiel endet nicht.

**Umfang:**
- Klick, Königinnen/Drohnen/Soldaten, Eier/min, Platz
- Pheromone
- Futterstellen, Weiterziehen, Kampf, Transportkapazität, Drohnen opfern, Strategien, Auto-Weiterziehen
- DNA und Genom
- Funde und Sammlung
- Speichern und Offline-Fortschritt
- K2-Oberfläche für Desktop und Mobile
- Modell-Seite

### 3.2 Meilensteine

| MS | Name | Ergebnis (Abnahmekriterium) | Aufwand |
|---|---|---|---|
| M1.0 | Fundament | Leeres Angular-Projekt läuft auf GitHub Pages; CI grün; Spielzustand tickt, wird gespeichert und geladen | 6,5–9,5 PT |
| M1.1 | Kernschleife & Modell | Nahrung klicken, Einheiten kaufen, Drohnen sammeln, Königinnen brüten; Modell-Seite zeigt die Kurven dazu | 9,5–13,5 PT |
| M1.2 | Weiterziehen & Kampf | Schwarm zieht über die Sonar-Karte von Futterstelle zu Futterstelle, manuell und automatisch; Kampf und Verluste funktionieren | 9,5–13,5 PT |
| M1.3 | Progression | Genom, Pheromone und Funde vollständig; Modell-Seite zeigt Upgrade-Wirkung und Pacing-Zielband | 8,5–12 PT |
| M1.4 | K2-Präsentation & Mobile | Oberfläche entspricht Mockup K2 inkl. Zoom-Übergängen; auf Smartphone voll bedienbar | 9–13,5 PT |
| M1.5 | Idle, Balancing & Release 1.0 | Offline-Fortschritt, Onboarding, PWA; Balancing innerhalb der Zielbänder; Release 1.0 veröffentlicht | 9–13,5 PT |
| | **Summe AS1** | | **52–76 PT** (+ ~15 % Puffer) |

Die Meilensteine sind so geschnitten, dass zuerst die Mechanik steht (M1.0–M1.3) und danach die Präsentation (M1.4). Die Sonar-Karte (M1.2) und das Genom (M1.3) werden trotzdem schon im K2-Stil gebaut. M1.4 fügt sie zur Zoom-Welt zusammen und macht sie mobiltauglich.

```
M1.0 ──► M1.1 ──► M1.2 ──► M1.3 ──► M1.4 ──► M1.5
```

Abhängigkeiten: M1.4 baut auf den Ansichten aus M1.2 (Sonar) und M1.3 (Genom) auf. Die Aufgaben 1.4.1 (Ebenen und Kamera) und 1.4.2 (Szene-Canvas) können schon nach M1.1 vorgezogen werden. M1.5 setzt alle Mechaniken voraus.

### 3.3 Arbeitspakete

Die Spalte **Stories** verweist auf die User Stories in der [Produktplanung](produktplanung.md).

#### M1.0 · Fundament

| AP | Arbeitspaket | Inhalt | PT | Stories |
|---|---|---|---|---|
| 1.0.1 | Angular-Workspace | Projekt anlegen (standalone, zoneless, strict), ESLint/Prettier, Vitest, Ordnerstruktur `core/ game/ ui/ model/` | 1–1,5 | – |
| 1.0.2 | CI/CD | GitHub Actions: Lint, Test, Build; Deployment auf GitHub Pages bei Push auf `main` | 0,5–1 | – |
| 1.0.3 | Core-Gerüst | `GameState`-Typen, Kommando-Mechanik, `step(state, dt)`, seeded RNG | 1,5–2 | – |
| 1.0.4 | Zahlentyp & Formatierung | Decimal-Wrapper um `break_infinity.js`, Formatierung de-DE (Kurzformen, wissenschaftlich) | 1–1,5 | US-09.02 |
| 1.0.5 | Speichersystem | Serialisierung, Versionsfeld, Migrationskette, localStorage-Adapter | 1–1,5 | US-07.02 |
| 1.0.6 | GameStore & GameLoop | Angular-Services: Signal-Store, fester Logik-Takt, Trennung vom Render-Takt | 1–1,5 | – |
| 1.0.7 | Architektur-Entscheidungen | ADRs aus dem technischen Konzept in `docs/adr/` festhalten | 0,5 | – |

#### M1.1 · Kernschleife & Modell

| AP | Arbeitspaket | Inhalt | PT | Stories |
|---|---|---|---|---|
| 1.1.1 | Game-Design-Spezifikation v1 | `docs/game-design.md`: Formeln, Startwerte, Kostenkurven. Klärt das TODO aus der Projektidee: Kosten der Königinnen je Einheitentyp | 1,5–2 | – |
| 1.1.2 | Nahrung & Klick | Futterstelle mit Vorrat, Klickertrag, Anzeige des Vorrats. Provisorisch bis M1.2: Knopf „Neue Futterstelle“ füllt den leeren Vorrat wieder auf ([Game-Design §4.4](game-design.md#44-leere-futterstelle-provisorium-bis-m12)) | 0,5–1 | US-01.01–01.03 |
| 1.1.3 | Einheiten | Königinnen, Drohnen, Soldaten: Kauf, Kostenkurven, Platz | 1,5–2 | US-02.01–02.04 |
| 1.1.4 | Brut | Eier/min aus Königinnen, passive Erzeugung (bis M1.3 mit festem Verhältnis) | 1 | US-02.05 |
| 1.1.5 | Sammeln | Drohnen bauen Nahrung ab, Futterstelle leert sich | 0,5–1 | US-01.04 |
| 1.1.6 | Prototyp-HUD | Ressourcen, Aktionsleiste, Vorratsbalken; funktional, noch ohne K2-Grafik | 1–1,5 | – |
| 1.1.7 | Headless-Runner & Bots | Simulation ohne Oberfläche im Zeitraffer; Bots „Aktiv“ und „Idle“ | 1,5–2 | US-10.01, 10.04 |
| 1.1.8 | Modell-Seite v1 | Route `/modell`: Ressourcen, Einheiten und Raten über die Zeit (log), Zeit bis zum nächsten Kauf, Parameter-Panel | 2–3 | US-10.02, 10.03, 10.05 |

#### M1.2 · Weiterziehen & Kampf

| AP | Arbeitspaket | Inhalt | PT | Stories |
|---|---|---|---|---|
| 1.2.1 | Futterstellen-Generator | Typen der Ära I (Schlot, Algenmatte, Bakterienrasen, Walsturz, Methanquelle …) mit Größe, Distanz, Abwehr, DNA, Fundchance; **Garantie: immer eine Futterstelle mit Abwehr 0 in Reichweite** | 1,5–2 | US-04.01, 04.02 |
| 1.2.2 | Reichweite & Sichtbarkeit | Ziele außer Reichweite und unerforschte Ziele | 0,5 | US-04.03 |
| 1.2.3 | Kampf | Angriff gegen Abwehr (binär), Verlustformel, DNA-Belohnung | 1–1,5 | US-04.04, 04.05 |
| 1.2.4 | Transportkapazität | Platz je Königin, Mitnahme-Priorität (Drohnen / Soldaten / ausgewogen) | 1–1,5 | US-04.06 |
| 1.2.5 | Drohnen opfern | Drohnen → Nahrung mit Umwandlungsverlust; Drohnen → Königinnen für den Transport | 0,5–1 | US-04.07, 04.08 |
| 1.2.6 | Ablauf Weiterziehen | Aufbruch, Ankunft, Zustandswechsel, Ereignisse fürs Log | 1 | US-04.09 |
| 1.2.7 | Strategien & Auto-Weiterziehen | Strategien „Geringster Widerstand“, „Ausgewogen“, „Kampfgehärtet“; Auslöser (Vorrat leer / Schwelle) | 1–1,5 | US-04.10, 04.11 |
| 1.2.8 | Sonar-Karte | SVG-Komponente im K2-Stil: Ringe, Ziele, Route, bisherige Route, Detailpanel | 2–3 | US-04.12 |
| 1.2.9 | Modell: Zyklen | Dauer pro Futterstelle, Soldaten-Bilanz, Warnung bei Stillstand (z. B. keine Soldaten mehr) | 1–1,5 | US-10.06 |

#### M1.3 · Progression

| AP | Arbeitspaket | Inhalt | PT | Stories |
|---|---|---|---|---|
| 1.3.1 | Effekt-System | Modifikatoren (additiv, multiplikativ, Freischaltung), Abhängigkeiten zwischen Genom-Knoten | 1,5–2 | – |
| 1.3.2 | Genom-Inhalte Ära I | Äste Sammeln, Brut, Kampf; ca. 15 Knoten plus einzigartige Adaptionen | 1 | US-05.01 |
| 1.3.3 | Genom-Ansicht | Radialer SVG-Baum im Zellkern, Detailpanel, Kauf, Hinweis auf verfügbare Knoten | 2–3 | US-05.02–05.04 |
| 1.3.4 | Pheromone | Punkte (Gesamtzahl = Brutrate), Verteilung (= Verhältnis), Drüse ausbauen | 1–1,5 | US-03.01–03.03 |
| 1.3.5 | Funde | Fundtabelle, Ziehung beim Einnehmen bzw. Abbauen, Sofort-Boni, einzigartige Adaptionen | 1–1,5 | US-06.01, 06.02 |
| 1.3.6 | Sammlung & Badges | Sammelobjekte, Sets, Schublade „Funde“ | 1–1,5 | US-06.03, 06.04 |
| 1.3.7 | Modell: Progression | Upgrade-Wirkung, DNA-Fluss, Pacing-Zielband mit Warnungen | 1–1,5 | US-10.07, 10.08 |

#### M1.4 · K2-Präsentation & Mobile

| AP | Arbeitspaket | Inhalt | PT | Stories |
|---|---|---|---|---|
| 1.4.1 | Ebenen & Kamera | Drei Ebenen (Sonar, Welt, Genom), Moduswechsel mit CSS transform/clip-path wie im Mockup | 1,5–2 | US-08.01 |
| 1.4.2 | Szene-Canvas | Futterstelle, Agenten-Renderer mit Budget (ein Sprite = n Einheiten), Plankton, Klick-Effekte, DPR | 2–3 | US-08.02 |
| 1.4.3 | HUD im K2-Stil | Ressourcen, Titel je Modus, Aktionsleiste, Zoom-Leiste, Schubladen, Log, Ära-Anzeige | 2–3 | US-08.03, 08.04 |
| 1.4.4 | Eingabe Desktop | Mausrad, Tastatur (W / G / Esc), Pointer Events | 0,5–1 | US-08.05 |
| 1.4.5 | Mobile | Pinch → Moduswechsel, Breakpoints, Bottom-Sheets, Touch-Ziele ≥ 44 px | 2–3 | US-08.06, 08.07 |
| 1.4.6 | Barrierearmut & Performance | `prefers-reduced-motion`, Fokusführung, Pause bei verdecktem Tab, Profiling auf Smartphone | 1–1,5 | US-08.08, 09.03 |

#### M1.5 · Idle, Balancing & Release 1.0

| AP | Arbeitspaket | Inhalt | PT | Stories |
|---|---|---|---|---|
| 1.5.1 | Offline-Fortschritt | Nachholen mit Ereignissen (Futterstelle leer, Auto-Weiterziehen), Obergrenze, Rückkehr-Zusammenfassung | 1,5–2 | US-07.01, 07.03 |
| 1.5.2 | Spielstand-Verwaltung | Autosave, Export/Import, Zurücksetzen | 0,5–1 | US-07.04, 07.05 |
| 1.5.3 | Einstellungen | Zahlenformat, Animationen, Autosave-Intervall | 0,5–1 | US-09.01 |
| 1.5.4 | Onboarding | Kontextuelle Hinweise, schrittweise Freischaltung der Oberfläche | 1–1,5 | US-09.04 |
| 1.5.5 | Balancing | Zielwerte festlegen, Bot-Läufe, Anpassen, Kennzahlen als Regressions-Snapshots | 2–3 | US-10.09 |
| 1.5.6 | PWA | Manifest, Service Worker, Icons | 0,5 | US-07.06 |
| 1.5.7 | E2E-Tests | Smoke-Tests für Desktop- und Mobile-Viewport | 1–1,5 | – |
| 1.5.8 | Playtest & Release | 3–5 externe Testspieler, Bugfixing, Release 1.0 | 2–3 | – |

### 3.4 Game-Design-Entscheidungen für AS1

Diese Punkte aus der Projektidee werden in AP 1.1.1 bzw. im jeweiligen AP entschieden. Ist ein Punkt nicht als **entschieden** markiert, ist er noch offen: Der Vorschlag ist dann der Ausgangspunkt und wird über die Modell-Seite geprüft.

| Frage | Vorschlag bzw. Entscheidung | AP |
|---|---|---|
| Brauchen Königinnen für Drohnen, Soldaten und Königinnen dieselbe Menge Nahrung? | **Entschieden** (siehe [Game-Design](game-design.md#22-einheiten)): Nein, eigene Nahrungskosten je Einheitentyp (Drohne < Soldat < Königin). Eier/min ist nur die Brutrate, keine Ressource. | 1.1.1 |
| Wie verhindern wir, dass Soldaten ausgehen und der Spieler feststeckt? | Kombination aus Option 1 und 3 der Projektidee: **Drohnen opfern** mit Umwandlungsverlust (per Genom verringerbar) **und** garantierte Futterstelle mit Abwehr 0 in Reichweite. Keine pluripotenten Drohnen. | 1.2.1, 1.2.5 |
| Wie hängt die Pheromon-Gesamtzahl mit der Brutrate zusammen? | Brutrate = Königinnen × Basisrate × f(Pheromon-Gesamtzahl); das Verhältnis teilt nur auf Drohnen und Soldaten auf. Königinnen werden nur gezielt gekauft. | 1.3.4 |
| Was passiert mit zurückgelassenen Einheiten? | Sie gehen verloren (ohne Rückerstattung); die Mitnahme-Priorität entscheidet, wer bleibt. | 1.2.4 |
| Wann zieht der Schwarm im Idle-Betrieb weiter? | Wenn der Vorrat unter eine einstellbare Schwelle fällt (Standard: leer) und ein Ziel nach Strategie einnehmbar ist. | 1.2.7 |

### 3.5 Pacing-Ziele (vorläufig)

Diese Zielbänder werden auf der Modell-Seite überwacht und in AP 1.5.5 feinjustiert:

| Kennzahl | Ziel (aktiv) | Ziel (idle) |
|---|---|---|
| Zeit bis zur ersten sinnvollen Entscheidung | < 10 s | – |
| Zeit zwischen zwei sinnvollen Käufen, erste 30 min | 5–60 s | < 5 min |
| Dauer pro Futterstelle | 3–15 min | 10–60 min |
| Längste Durststrecke ohne neue Option | < 10 min | < 60 min |
| Neue Mechanik/Ansicht freigeschaltet | alle 5–15 min in der ersten Stunde | – |

## 4. Spätere Ausbaustufen (grob)

Die späteren Stufen beginnen jeweils mit einem **Konzept-Meilenstein**. Darin werden die unten genannten Entscheidungspunkte getroffen und auf der Modell-Seite durchgerechnet. Erst danach werden die Arbeitspakete detailliert. Viele Mechaniken orientieren sich an [Swarm Simulator](https://github.com/swarmsim/swarm), werden aber an die Schwarm-Biologie von IdleSwarm angepasst.

### AS2 · Evolution: große Ascension und Langzeitmotivation

**Ziel:** Der erste Übergang „Einzeller → Mehrzeller“ wird zur Prestige-Schicht, die einen Neustart mit dauerhaften Vorteilen belohnt.

| MS | Name |
|---|---|
| M2.0 | Konzept & Entscheidungen |
| M2.1 | Große Ascension & Prestige-Währung |
| M2.2 | Mutationen & Erfolge |
| M2.3 | Aktive Fähigkeiten |
| M2.4 | Balancing & Release 2.0 |

| Entscheidungspunkt | Optionen | Vorbild Swarm Simulator |
|---|---|---|
| Prestige-Währung | eigene Währung (z. B. „Erbgut-Fragmente“) vs. DNA weiterverwenden | Mutagen aus der Ascension |
| Was bleibt beim Reset? | Genom, Funde, Sammlung, Badges: jeweils behalten, teilweise behalten, verlieren | Mutationen bleiben, Einheiten verfallen |
| Erzeuger-Ketten | Erzeuger von Erzeugern (z. B. Brutnester → Königinnen → Einheiten) für polynomielles Wachstum: ja/nein, wie viele Stufen | Drone → Queen → Nest → Greater Queen … |
| Energie & Fähigkeiten | zweite Ressource für aktive Fähigkeiten, z. B. Zeitsprung, Brutschub, Spiegelarmee | Energy/Nexus: Swarmwarp, Clone Larvae, House of Mirrors |
| Erfolge | reine Abzeichen vs. Erfolgspunkte mit Bonus | Achievements mit Punktwert |
| Kaufmodi | ×1 / ×10 / 25 % / Max | Buy 25 % / Max |
| Mehrfach-Upgrades | Upgrades, die pro Kauf mehrere Einheiten ergeben | Twin-Upgrades |
| Zahlen-Skalierung | ab wann wissenschaftliche Notation Standard wird | Notationsoptionen |

### AS3 · Ära II Urmeer

**Ziel:** Fische und andere Meeresbewohner ziehen durch Seetangwälder, Riffe, Gräben und Küstenregionen.

| MS | Name |
|---|---|
| M3.0 | Konzept & Entscheidungen |
| M3.1 | Biome & Futterstellen der Ära II |
| M3.2 | Verteidigungsarten & Spezialeinheiten |
| M3.3 | Zweiter Rohstoff |
| M3.4 | Visuelle Ära II (Szene, Karte, Genom) |
| M3.5 | Balancing & Release 3.0 |

| Entscheidungspunkt | Optionen |
|---|---|
| Biome | Biome als Unterebenen der Ära (Meeresgrund, offenes Meer, Küste) mit eigenen Futterstellentypen vs. gemischte Karte |
| Verteidigungsarten | weiterhin ein Abwehrwert vs. Typen mit Konter-System (z. B. Panzer, Gift, Schwarm) |
| Zweiter Rohstoff | Kalk/Mineralien, die nicht aus Nahrung kommen, für Schalen und Panzer: ja/nein, Quelle |
| Spezialeinheiten | neue Einheitentypen (z. B. Späher für Reichweite, Träger für Transport) vs. Spezialisierung über das Genom |
| Übergang I → II | Ära I bleibt spielbar (Rückkehr) vs. abgeschlossen |

### AS4 · Ära III Land

**Ziel:** Landtiere erobern Felder, Wälder, Berge, Dörfer und Städte.

| MS | Name |
|---|---|
| M4.0 | Konzept & Entscheidungen |
| M4.1 | Land-Biome |
| M4.2 | Zivilisation als Gegner |
| M4.3 | Expansion / Territorium |
| M4.4 | Balancing & Release 4.0 |

| Entscheidungspunkt | Optionen | Vorbild Swarm Simulator |
|---|---|---|
| Gegner | statische Abwehr vs. Zivilisation mit eigener Dynamik (wächst, schlägt zurück) | – |
| Länder | eigene Ascension-Ebene vs. Gruppierung auf der Karte | – |
| Territorium | Militär erzeugt Territorium, das Expansionen (mehr Brutrate/Reichweite) freischaltet | Territory → Expansions |
| Strategien | weitere Idle-Strategien (z. B. „Plünderer“, „Siedler“) | – |

### AS5 · Ära IV+ Weltraum

**Ziel:** Schwarmflotten ziehen über Planeten und Sternensysteme. Das Spiel skaliert ab hier offen weiter.

| MS | Name |
|---|---|
| M5.0 | Konzept & Entscheidungen |
| M5.1 | Erstes Sonnensystem |
| M5.2 | FTL & Systemwechsel |
| M5.3 | Galaxie-Ebene & Endlos-Skalierung |
| M5.4 | Release 5.0 |

| Entscheidungspunkt | Optionen |
|---|---|
| Einstieg | Erstes Sonnensystem als Tutorial mit FTL-Freischaltung vs. sofort mehrere Systeme |
| Auswahl-Granularität | Wechsel Planet → System → Galaxie: automatisch ab Schwarmgröße vs. eigene Ascension |
| Planetenklassen | Fels, Eis, Erde, Gasriese, Raumstation: jeweils eigene Mechanik vs. nur andere Werte |
| Weitere Ascensions | Galaxie-Ascension als weitere Prestige-Schicht |

### Querschnittsthemen (Stufe offen)

- Cloud-Sync des Spielstands (weiterhin kein Multiplayer)
- Englische Übersetzung
- Statistikseite für Spieler
- Weitere Ära-Grafiken und Sound

## 5. Risiken

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| Spiel wird langweilig (zu lange Wartezeiten, keine Entscheidungen) | hoch | Modell-Seite ab M1.1, Pacing-Zielbänder, Regressions-Snapshots |
| Spieler steckt fest (keine Soldaten, kein erreichbares Ziel) | hoch | Garantierte Futterstelle mit Abwehr 0, Drohnen opfern, Stillstands-Warnung im Modell |
| K2-Übergänge ruckeln auf Smartphones (`clip-path`, `blur`) | mittel | Profiling in AP 1.4.6, vereinfachte Übergänge als Fallback, `prefers-reduced-motion` |
| Mobile-Layout passt nicht zu K2 (Platz für Seitenpanels) | mittel | Bottom-Sheets ab AP 1.4.5, frühe Tests auf echtem Gerät |
| Spielstände späterer Stufen inkompatibel | mittel | Versionierte Saves mit Migrationskette ab M1.0 |
| Umfang wächst | mittel | Strikte Trennung der Ausbaustufen; Ideen landen im Backlog der späteren Stufen |
| Rechenaufwand bei großen Zahlen | gering | Decimal-Wrapper, Benchmarks im Core |

## 6. Vorgehen

- **Iterativ je Meilenstein:** Am Meilenstein-Ende stehen ein spielbarer Stand auf GitHub Pages, ein kurzer Spieltest und ein Blick auf die Modell-Seite.
- **Definition of Done (AP):** Code mit Tests im Core, CI grün, Stories abgenommen, Modell-Seite um neue Mechaniken ergänzt (falls betroffen).
- **Planung späterer Stufen:** Vor jeder neuen Ausbaustufe wird dieser Plan um die Detaillierung der Stufe ergänzt, nachdem der Konzept-Meilenstein abgeschlossen ist.
