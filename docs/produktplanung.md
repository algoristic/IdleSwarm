# IdleSwarm · Produktplanung

> Stand: 18.11.2026 · Gehört zu: [Projektplan](projektplan.md), [Technisches Konzept](technisches-konzept.md) · UI-Leitbild: [Mockup K2](mockups/k2-zoom.html)

## 1. Produktvision

IdleSwarm ist ein ruhiges, biolumineszentes Strategie-Idle-Spiel im Browser. Man führt einen Schwarm vom Einzeller in der Ursuppe bis zur dominanten Lebensform des Universums. Es gibt **kein Klicken für Ressourcen**: Fortschritt entsteht ausschließlich durch strategische Käufe und Entscheidungen. Aktive Spieler entscheiden laufend: Was kaufe ich, welche Futterstelle greife ich an, welche Adaption entwickle ich? Passive Spieler stellen eine Strategie ein und finden bei der Rückkehr einen gewachsenen Schwarm vor. Alles spielt in **einer zusammenhängenden Welt**: Herauszoomen zeigt die Umgebung, Hineinzoomen das Erbgut.

Das Spiel wird mit jeder Ära strategischer:

| Ära | Strategische Ebene |
|---|---|
| Ursuppe | ein Schwarm, eine Futterstelle zur Zeit; Käufe und Zielwahl entscheiden |
| Urmeer | 2–3 Standorte gleichzeitig |
| Land | Gebiete an mehreren Fronten erobern und leerfressen, bis der Planet eingenommen ist |
| Weltraum | Ausbreitung über das Sonnensystem, danach über die Galaxis, mit globaler Übersicht |

## 2. Zielgruppen

| Persona | Beschreibung | Was sie braucht |
|---|---|---|
| **Der aktive Spieler** | spielt in Sitzungen von 10–30 min am Desktop, plant und optimiert | häufige, sinnvolle Entscheidungen; sichtbare Wirkung von Käufen |
| **Der Idler** | schaut ein paar Mal am Tag kurz vorbei | verlässlicher Offline-Fortschritt, Auto-Weiterziehen, klare Rückkehr-Zusammenfassung |
| **Der mobile Gelegenheitsspieler** | spielt auf dem Smartphone unterwegs | Touch-Bedienung, Pinch-Zoom, gut lesbares HUD auf kleinem Bildschirm |
| **Der Game-Designer** (Entwickler) | gestaltet und balanciert das Spiel | Modell-Seite, die Wachstum und Pacing sichtbar macht, bevor Spieler sich langweilen |

## 3. Glossar

| Begriff | Bedeutung |
|---|---|
| **Futterstelle** | Ort, an dem der Schwarm Nahrung abbaut. Hat Größe (Vorrat), Distanz, Abwehr, DNA-Belohnung und Fundchance. |
| **Nahrung** | Hauptressource. Kommt aus dem Grundertrag und von Drohnen; bezahlt Einheiten und Ausbauten. |
| **Grundertrag** | Fester Nahrungszufluss aus der Futterstelle, solange sie Vorrat hat. Trägt den Spielstart und verhindert, dass der Schwarm ohne Einkommen feststeckt. |
| **DNA** | Belohnung für das Einnehmen verteidigter Futterstellen; bezahlt Adaptionen im Genom. |
| **Pheromone** | Punkte, deren Gesamtzahl die Brutrate und deren Verteilung das Verhältnis Drohnen : Soldaten bestimmt. |
| **Eier** | Nur ein Begriff, keine Ressource. „Eier/min“ ist die Rate, mit der Königinnen passiv Einheiten ausbrüten. |
| **Königin** | Brütet Einheiten aus und bietet Platz beim Weiterziehen. |
| **Drohne** | Sammelt Nahrung. Kann geopfert werden. |
| **Soldat** | Überwindet die Abwehr einer Futterstelle; fällt dabei teilweise. |
| **Platz** | Transportkapazität der Königinnen. Bestimmt, wie viele Einheiten beim Weiterziehen mitkommen. |
| **Reichweite** | Maximale Distanz, in der Futterstellen auswählbar sind. |
| **Weiterziehen** | Kleine Ascension: Wechsel von einer Futterstelle zur nächsten. |
| **Große Ascension** | Übergang in die nächste Entwicklungsstufe (z. B. Einzeller → Mehrzeller); ab AS2. |
| **Ära** | Großer Abschnitt des Spiels (Ursuppe, Urmeer, Land, Weltraum). |
| **Biom** | Untergliederung einer Ära (z. B. Meeresgrund, Küste); ab AS3. |
| **Adaption** | Knoten im Genom, dauerhafte Verbesserung. |
| **Fund** | Zufällige Entdeckung an einer Futterstelle: Sofort-Bonus, einzigartige Adaption oder Sammelobjekt. |
| **Strategie** | Regel, nach der der Schwarm im Idle-Betrieb das nächste Ziel wählt. |
| **Standort** | Ort, an dem ein Teil des Schwarms gleichzeitig mit anderen Teilen arbeitet; ab AS3. |
| **Gebiet** | Eroberbarer Abschnitt eines Planeten. Bleibt nach der Eroberung auf der Planetenkarte und liefert Nahrung, bis es leergefressen ist; ab AS4. |
| **Front** | Gebiet, um das gerade gekämpft wird und dem Einheiten zugewiesen sind; ab AS4. |

## 4. Story-Format

Jede Story hat:
- eine **ID** `US-<Epic>.<Nr>`,
- eine **Priorität** nach MoSCoW (Must / Should / Could),
- den **Meilenstein**, in dem sie umgesetzt wird,
- einen Satz „Als … möchte ich …, damit …“,
- **Akzeptanzkriterien** (AK).

Eine Story ist fertig, wenn alle AK erfüllt sind und die Definition of Done aus dem [Projektplan](projektplan.md#6-vorgehen) eingehalten ist.

## 5. Epics und User Stories · Ausbaustufe 1

### E01 · Nahrung & Futterstelle

**US-01.01 · Grundertrag erhalten** · Must · M1.1
Als Spieler möchte ich von Anfang an einen festen Nahrungszufluss erhalten, damit ich ohne Klicken meine ersten Käufe planen kann und nie ohne Einkommen feststecke.
- AK: Solange die Futterstelle Vorrat hat, steigt die Nahrung um den Grundertrag, auch ohne Einheiten.
- AK: Der Ertrag wird vom Vorrat der Futterstelle abgezogen; ist sie leer, entfällt er.
- AK: Die Futterstelle ist keine Klickfläche; Klicks und Taps erzeugen keine Nahrung.

**US-01.02 · Nahrungsrate und Herkunft sehen** · Should · M1.1
Als Spieler möchte ich sehen, wie viel Nahrung woher kommt, damit ich die Wirkung meiner Käufe einschätzen kann.
- AK: Die Nahrung/s wird nach Grundertrag und Drohnen aufgeschlüsselt.
- AK: Die Gesamtrate steht auch im Titelbereich der Futterstelle.

**US-01.03 · Vorrat der Futterstelle sehen** · Must · M1.1
Als Spieler möchte ich den Vorrat und die voraussichtliche Restzeit sehen, damit ich das Weiterziehen planen kann.
- AK: Balken mit Vorrat / Gesamtgröße und geschätzter Zeit bis „leer“ bei aktueller Abbaurate.
- AK: Die Schätzung aktualisiert sich bei jedem Kauf.

**US-01.04 · Drohnen sammeln passiv** · Must · M1.1
Als Idler möchte ich, dass Drohnen ohne mein Zutun Nahrung sammeln, damit der Schwarm auch während meiner Abwesenheit wächst.
- AK: Nahrung/s = Drohnen × Sammelrate × Modifikatoren; Anzeige der Rate im HUD.
- AK: Gesammelte Nahrung wird vom Vorrat abgezogen; bei leerem Vorrat sinkt die Rate auf 0.

### E02 · Schwarm & Einheiten

**US-02.01 · Drohnen kaufen** · Must · M1.1
Als Spieler möchte ich Drohnen für Nahrung kaufen, damit ich mehr Nahrung sammle.
- AK: Kaufknopf zeigt Anzahl, Preis und ist bei zu wenig Nahrung deaktiviert.
- AK: Der Preis folgt der Kostenkurve aus der Game-Design-Spezifikation.

**US-02.02 · Soldaten kaufen** · Must · M1.1
Als Spieler möchte ich Soldaten kaufen, damit ich verteidigte Futterstellen einnehmen kann.
- AK: wie US-02.01; der aktuelle Gesamtangriff ist sichtbar (Karte, Detailpanel).

**US-02.03 · Königinnen kaufen** · Must · M1.1
Als Spieler möchte ich Königinnen kaufen, damit mehr Einheiten schlüpfen und mehr Platz beim Weiterziehen ist.
- AK: wie US-02.01; der Effekt auf Eier/min und Platz wird vor dem Kauf angezeigt.

**US-02.04 · Platz im Blick** · Must · M1.1
Als Spieler möchte ich sehen, wie viel Platz meine Königinnen bieten und wie viel belegt ist, damit ich beim Weiterziehen niemanden zurücklasse.
- AK: Anzeige „Platz belegt / verfügbar“ mit Balken; Warnfarbe ab 90 %.

**US-02.05 · Königinnen brüten passiv** · Must · M1.1
Als Idler möchte ich, dass Königinnen laufend Einheiten ausbrüten, damit der Schwarm auch ohne neue Käufe wächst.
- AK: Eier/min = Königinnen × Brutrate × Modifikatoren; jede Brut kostet die Nahrung der jeweiligen Einheit.
- AK: Fehlt Nahrung, pausiert die Brut, statt ins Minus zu gehen.
- AK: Bis M1.3 gilt ein festes Verhältnis Drohnen : Soldaten, danach das Pheromon-Verhältnis.

### E03 · Pheromone

**US-03.01 · Pheromone verteilen** · Must · M1.3
Als Spieler möchte ich Pheromonpunkte auf Drohnen und Soldaten verteilen, damit ich festlege, was passiv ausgebrütet wird.
- AK: +/− je Einheitentyp; das Verhältnis wird als geteilter Balken in % angezeigt.
- AK: Alle Punkte müssen verteilt sein; freie Punkte werden hervorgehoben.

**US-03.02 · Verteilung jederzeit ändern** · Must · M1.3
Als Idler möchte ich die Verteilung jederzeit ohne Kosten ändern, damit ich defensiver oder aggressiver spielen kann.
- AK: Änderung wirkt ab dem nächsten Tick; kein Verlust von Punkten.

**US-03.03 · Pheromon-Drüse stärken** · Must · M1.3
Als Spieler möchte ich weitere Pheromonpunkte kaufen, damit meine Brutrate insgesamt steigt.
- AK: Kauf erhöht die Gesamtpunkte um 1; der Preis steigt je Kauf.
- AK: Die Wirkung auf Eier/min wird vor dem Kauf angezeigt.

### E04 · Futterstellen & Weiterziehen

**US-04.01 · Futterstellen zur Auswahl** · Must · M1.2
Als Spieler möchte ich mehrere Futterstellen mit unterschiedlichen Eigenschaften sehen, damit ich eine echte Wahl habe.
- AK: Jede Futterstelle zeigt Typ, Größe, Nahrungsvorrat, Distanz, Abwehr, DNA-Belohnung und Fundchance.
- AK: Nach jedem Weiterziehen werden neue Futterstellen erzeugt (seeded, reproduzierbar).

**US-04.02 · Immer eine sichere Futterstelle** · Must · M1.2
Als Spieler möchte ich immer mindestens eine Futterstelle ohne Abwehr in Reichweite haben, damit ich nie endgültig feststecke.
- AK: Der Generator garantiert ≥ 1 Futterstelle mit Abwehr 0 in Reichweite.
- AK: Diese bringt keine DNA und wenig Nahrung.

**US-04.03 · Reichweite** · Must · M1.2
Als Spieler möchte ich sehen, welche Ziele außer Reichweite oder unerforscht sind, damit ich weiß, wofür sich mehr Reichweite lohnt.
- AK: Ziele außer Reichweite sind sichtbar, aber nicht wählbar; unerforschte zeigen nur „?“.
- AK: Höhere Reichweite (z. B. Adaption „Chemotaxis“) deckt Ziele sofort auf.

**US-04.04 · Einnehmbarkeit prüfen** · Must · M1.2
Als Spieler möchte ich vor dem Aufbruch sehen, ob mein Angriff die Abwehr überwindet und mit wie vielen Verlusten ich rechnen muss, damit ich nicht blind angreife.
- AK: Balken Angriff vs. Abwehr; Urteil „einnehmbar“ oder „zu stark“.
- AK: Erwartete Verluste an Soldaten werden angezeigt.
- AK: Die Entscheidung ist binär: Angriff ≥ Abwehr → Einnahme mit Verlusten, sonst ist kein Aufbruch möglich.

**US-04.05 · DNA durch Einnahme** · Must · M1.2
Als Spieler möchte ich für verteidigte Futterstellen DNA erhalten, damit sich das Risiko lohnt.
- AK: DNA steigt mit der Abwehr; wird bei Ankunft gutgeschrieben und im Log gemeldet.

**US-04.06 · Transportkapazität & Priorität** · Must · M1.2
Als Spieler möchte ich festlegen, wer mitkommt, wenn der Platz nicht reicht, damit ich die Zusammensetzung meines Schwarms steuere.
- AK: Prioritäten „Drohnen zuerst“, „Soldaten zuerst“, „ausgewogen (prozentual)“.
- AK: Vor dem Aufbruch wird angezeigt, wie viele Einheiten zurückbleiben.

**US-04.07 · Drohnen opfern (Nahrung)** · Must · M1.2
Als Spieler möchte ich Drohnen mit Verlust in Nahrung umwandeln, damit ich umsteuern kann, wenn mir Soldaten fehlen.
- AK: Wahl der Anzahl; Umwandlungsverlust wird vorher angezeigt.
- AK: Der Verlust lässt sich per Adaption verringern, aber nie auf 0.

**US-04.08 · Drohnen zu Königinnen** · Should · M1.2
Als Spieler möchte ich vor dem Aufbruch Drohnen in Königinnen umwandeln, damit ich genug Platz habe.
- AK: Umwandlung direkt aus dem Aufbruch-Dialog; Kosten in Drohnen werden angezeigt.

**US-04.09 · Jederzeit weiterziehen** · Must · M1.2
Als Spieler möchte ich auch vor dem Leeren der Futterstelle weiterziehen können, damit ich flexibel bleibe.
- AK: Aufbruch zu jedem einnehmbaren Ziel in Reichweite; Restvorrat verfällt (Hinweis vorher).
- AK: Aufbruch und Ankunft erscheinen im Log.

**US-04.10 · Strategie wählen** · Must · M1.2
Als Idler möchte ich eine Strategie für die Zielwahl festlegen, damit der Schwarm in meinem Sinne weiterzieht.
- AK: Strategien „Geringster Widerstand“, „Ausgewogen“, „Kampfgehärtet“.
- AK: Auf der Karte ist markiert, welches Ziel die Strategie gerade wählen würde.

**US-04.11 · Auto-Weiterziehen** · Must · M1.2
Als Idler möchte ich, dass der Schwarm automatisch weiterzieht, wenn die Futterstelle erschöpft ist, damit er auch ohne mich wächst.
- AK: Ein- und ausschaltbar; Auslöse-Schwelle für den Vorrat einstellbar (Standard: leer).
- AK: Gibt es kein einnehmbares Ziel nach Strategie, wählt der Schwarm die sichere Futterstelle.
- AK: Funktioniert auch im Offline-Fortschritt.

**US-04.12 · Sonar-Karte** · Must · M1.2
Als Spieler möchte ich die Umgebung als Sonar-Karte sehen, damit ich Ziele räumlich einordnen kann.
- AK: Ringe für Distanz, Ring für die Reichweite, Ziele farbig nach Status (einnehmbar / zu stark / außer Reichweite).
- AK: Bisherige Route wird angezeigt; ausgewähltes Ziel mit Route und Detailpanel.

### E05 · Genom & DNA

**US-05.01 · Adaptionen in drei Ästen** · Must · M1.3
Als Spieler möchte ich Adaptionen in den Ästen Sammeln, Brut und Kampf entwickeln, damit ich meinen Schwarm spezialisieren kann.
- AK: Jeder Ast hat aufeinander aufbauende Knoten; ein Knoten setzt seinen Vorgänger voraus.
- AK: Ära I enthält ca. 15 reguläre Knoten und mehrere einzigartige Adaptionen.

**US-05.02 · Genom ansehen** · Must · M1.3
Als Spieler möchte ich das Genom als radialen Baum im Zellkern sehen, damit ich verstehe, was möglich ist.
- AK: Knotenstatus eindeutig erkennbar: entwickelt, verfügbar, zu teuer, gesperrt, einzigartig/nicht gefunden.
- AK: Auswahl eines Knotens zeigt Beschreibung, Effekt (vorher → nachher), Voraussetzung und Preis.

**US-05.03 · Adaption entwickeln** · Must · M1.3
Als Spieler möchte ich eine Adaption mit DNA kaufen und ihre Wirkung sofort sehen, damit sich der Kauf lohnt.
- AK: DNA wird abgezogen, der Effekt gilt sofort und dauerhaft.
- AK: Betroffene Anzeigen aktualisieren sich sofort (z. B. Angriff auf der Karte).

**US-05.04 · Hinweis auf verfügbare Adaptionen** · Should · M1.3
Als Spieler möchte ich sehen, wenn ich mir eine Adaption leisten kann, damit ich nichts verpasse.
- AK: Zähler am Genom-Eintrag der Zoom-Leiste; verfügbare Knoten pulsieren im Baum.

### E06 · Funde & Sammlung

**US-06.01 · Zufällige Funde** · Must · M1.3
Als Spieler möchte ich an Futterstellen zufällig Dinge finden, damit jede Futterstelle eine Überraschung bieten kann.
- AK: Wahrscheinlichkeit hängt von der Fundchance der Futterstelle ab; Ziehung beim Einnehmen und beim Abbauen.
- AK: Fundarten: Sofort-Bonus (befristet oder einmalig), einzigartige Adaption, Sammelobjekt.
- AK: Funde werden im Log hervorgehoben.

**US-06.02 · Einzigartige Adaptionen** · Must · M1.3
Als Spieler möchte ich durch Funde Adaptionen freischalten, die es nur so gibt, damit sich das Erkunden lohnt.
- AK: Einzigartige Knoten sind im Genom sichtbar, aber gesperrt mit Hinweis auf die Bedingung (z. B. „Schwefelperle 2 / 5“).

**US-06.03 · Sammelobjekte & Badges** · Should · M1.3
Als Spieler möchte ich Sammelobjekte in Sets sammeln und dafür Badges erhalten, damit ich Langzeitziele habe.
- AK: Ein vollständiges Set vergibt ein Badge (ggf. mit kleinem Bonus).

**US-06.04 · Sammlung ansehen** · Should · M1.3
Als Spieler möchte ich meine Funde in einer Übersicht sehen, damit ich weiß, was mir noch fehlt.
- AK: Schublade „Funde“ mit Fortschritt (x / y); unbekannte Funde als „?“.

### E07 · Idle & Persistenz

**US-07.01 · Offline-Fortschritt** · Must · M1.5
Als Idler möchte ich, dass der Schwarm weiterspielt, während das Spiel geschlossen ist, damit sich die Rückkehr lohnt.
- AK: Beim Laden wird die vergangene Zeit nachgeholt: Sammeln, Brut, Auto-Weiterziehen, Kämpfe, Funde.
- AK: Obergrenze für die nachgeholte Zeit (Startwert 24 h, per Konstante einstellbar).
- AK: Das Ergebnis ist gleich (± Rundung) wie bei durchgehend geöffnetem Spiel.

**US-07.02 · Automatisch speichern** · Must · M1.0
Als Spieler möchte ich, dass mein Spielstand automatisch gespeichert wird, damit ich nie Fortschritt verliere.
- AK: Speichern in festen Abständen und beim Verlassen bzw. Verbergen der Seite.
- AK: Ältere Spielstände werden beim Laden automatisch migriert.

**US-07.03 · Rückkehr-Zusammenfassung** · Must · M1.5
Als Idler möchte ich bei der Rückkehr sehen, was passiert ist, damit ich die Entwicklung nachvollziehe.
- AK: Dialog mit Dauer, gewonnener Nahrung/DNA, neuen und verlorenen Einheiten, besuchten Futterstellen, Funden.

**US-07.04 · Export / Import** · Should · M1.5
Als Spieler möchte ich meinen Spielstand als Text exportieren und importieren, damit ich ihn sichern oder auf ein anderes Gerät übertragen kann.
- AK: Export als kopierbarer String; Import validiert und lehnt fehlerhafte Daten mit Meldung ab.

**US-07.05 · Spiel zurücksetzen** · Should · M1.5
Als Spieler möchte ich neu beginnen können, damit ich andere Strategien ausprobieren kann.
- AK: Doppelte Bestätigung; optional vorher Export anbieten.

**US-07.06 · Installierbar** · Could · M1.5
Als mobiler Spieler möchte ich das Spiel auf dem Startbildschirm installieren, damit ich es wie eine App starte.
- AK: Web-App-Manifest und Service Worker; das Spiel startet auch ohne Netz.

### E08 · Präsentation & Bedienung (K2)

**US-08.01 · Zoom zwischen Umgebung, Schwarm und Genom** · Must · M1.4
Als Spieler möchte ich stufenlos zwischen Karte, Szene und Genom zoomen, damit ich das Spiel als eine zusammenhängende Welt erlebe.
- AK: Drei Modi wie im Mockup K2; der Übergang skaliert die Szene zum Punkt auf der Karte bzw. in den Zellkern.
- AK: Zoom-Leiste links zeigt den aktiven Modus; „zurück zum Schwarm“ in Karte und Genom.

**US-08.02 · Lebendige Szene** · Must · M1.4
Als Spieler möchte ich meinen Schwarm in der Szene sehen, damit ich sein Wachstum spüre.
- AK: Drohnen pendeln zur Futterstelle und tragen Nahrung, Soldaten patrouillieren, Königinnen kreisen.
- AK: Bei großen Zahlen steht ein Sprite für n Einheiten; die Szene bleibt flüssig.

**US-08.03 · Ressourcen immer im Blick** · Must · M1.4
Als Spieler möchte ich Nahrung, DNA, Pheromone und Eier/min in jedem Modus sehen, damit ich keine Entscheidung blind treffe.
- AK: Ressourcen-Panel oben links in allen Modi; Raten pro Sekunde bzw. Minute.

**US-08.04 · Ereignis-Log** · Should · M1.4
Als Spieler möchte ich die letzten Ereignisse sehen (Verluste, DNA, Funde, Brut), damit ich verstehe, was gerade passiert.
- AK: Die letzten 4 Einträge werden mit Ausblendung gezeigt; Farben je Ereignisart.

**US-08.05 · Tastatur & Mausrad** · Should · M1.4
Als Desktop-Spieler möchte ich mit Mausrad und Tasten (W, G, Esc) navigieren, damit ich schnell wechseln kann.
- AK: Mausrad zoomt in den nächsten Modus (mit Sperre gegen Mehrfachauslösung); Tasten wie im Mockup.

**US-08.06 · Touch-Bedienung** · Must · M1.4
Als mobiler Spieler möchte ich mit Pinch und Tippen spielen, damit sich das Spiel auf dem Smartphone natürlich anfühlt.
- AK: Pinch auseinander/zusammen wechselt den Modus; Tippen wählt Ziele und Bedienelemente aus.
- AK: Alle Bedienelemente sind ≥ 44 × 44 px groß.

**US-08.07 · Schmale Bildschirme** · Must · M1.4
Als mobiler Spieler möchte ich alle Funktionen auch im Hochformat nutzen, damit ich unterwegs spielen kann.
- AK: Ab Breite < 768 px werden Seitenpanels zu Bottom-Sheets und die Zoom-Leiste wird kompakt.
- AK: Kein waagerechtes Scrollen; Text bleibt lesbar (≥ 12 px).

**US-08.08 · Reduzierte Bewegung** · Should · M1.4
Als bewegungsempfindlicher Spieler möchte ich weniger Animation, damit mir nicht schwindelig wird.
- AK: `prefers-reduced-motion` und eine Einstellung ersetzen Zoom-Übergänge durch Überblendungen und reduzieren Partikel.

### E09 · Einstellungen & Onboarding

**US-09.01 · Einstellungen** · Should · M1.5
Als Spieler möchte ich Zahlenformat, Animationen und Autosave einstellen, damit das Spiel zu mir passt.
- AK: Einstellungen werden mit dem Spielstand gespeichert.

**US-09.02 · Lesbare Zahlen** · Must · M1.0
Als Spieler möchte ich große Zahlen lesbar sehen, damit ich Werte schnell vergleichen kann.
- AK: Deutsche Formatierung (1.284; 3,2); ab einer Million Kurzformen (Mio., Mrd., Bio., …), danach wissenschaftliche Notation.

**US-09.03 · Akku schonen** · Should · M1.4
Als mobiler Spieler möchte ich, dass das Spiel im Hintergrund keine Leistung verbraucht, damit mein Akku hält.
- AK: Rendering stoppt bei verborgener Seite; der Fortschritt wird bei Rückkehr nachgeholt.

**US-09.04 · Einstieg** · Must · M1.5
Als neuer Spieler möchte ich schrittweise an die Mechaniken herangeführt werden, damit ich nicht überfordert bin.
- AK: Oberflächenteile erscheinen erst, wenn sie relevant werden (z. B. Karte ab der ersten fast leeren Futterstelle, Genom ab der ersten DNA).
- AK: Kurze, wegklickbare Hinweise beim ersten Auftreten einer Mechanik.

### E10 · Modell & Balancing

Persona: Game-Designer. Die Modell-Seite ist ein Entwicklerwerkzeug unter `/modell` und wird im Produktiv-Build ausgeblendet oder versteckt.

**US-10.01 · Simulation im Zeitraffer** · Must · M1.1
Als Game-Designer möchte ich das Spiel ohne Oberfläche über Stunden bis Tage in Sekunden simulieren, damit ich das Langzeitverhalten sehe.
- AK: Der Headless-Runner nutzt exakt dieselbe Spiellogik und dieselben Formeln wie das Spiel.
- AK: 24 h Spielzeit lassen sich in < 5 s simulieren; der Seed ist wählbar und das Ergebnis reproduzierbar.

**US-10.02 · Wachstumskurven** · Must · M1.1
Als Game-Designer möchte ich Ressourcen, Einheiten und Produktionsraten als Kurven über die Zeit sehen, damit ich Wachstum beurteilen kann.
- AK: Zeitreihen-Diagramme mit umschaltbarer logarithmischer Achse, Zoom und Tooltip.
- AK: Ereignisse (Weiterziehen, Adaption gekauft, Fund) werden als Markierungen eingeblendet.

**US-10.03 · Zeit bis zur nächsten Entscheidung** · Must · M1.1
Als Game-Designer möchte ich sehen, wie lange der Spieler jeweils auf die nächste sinnvolle Aktion wartet, damit ich Langeweile erkenne.
- AK: Kurve „Zeit bis zum nächsten leistbaren Kauf“ je Einheitentyp und gesamt.
- AK: Kennzahl „Anteil Wartezeit“ für den gewählten Zeitraum.

**US-10.04 · Strategie-Bots vergleichen** · Must · M1.1
Als Game-Designer möchte ich verschiedene Spielweisen simulieren und vergleichen, damit das Spiel für aktive und passive Spieler funktioniert.
- AK: Bots „Aktiv“ (häufige, optimale Käufe) und „Idle“ (seltene Besuche, nur Strategie) ab M1.1; „Drohnen-lastig“ und „Soldaten-lastig“ ab M1.2.
- AK: Mehrere Läufe übereinander in einem Diagramm.

**US-10.05 · Parameter verstellen** · Must · M1.1
Als Game-Designer möchte ich Konstanten (Kosten, Raten, Wachstumsfaktoren) direkt verändern und das Ergebnis mit dem Basislauf vergleichen, damit ich schnell iteriere.
- AK: Parameter-Panel mit allen Konstanten aus `core/balance`; Änderung startet eine neue Simulation.
- AK: Geänderte Werte lassen sich als JSON exportieren und in den Code übernehmen.

**US-10.06 · Zyklen & Stillstand** · Must · M1.2
Als Game-Designer möchte ich Dauer und Ertrag pro Futterstelle sowie die Soldaten-Bilanz sehen, damit ich Sackgassen früh erkenne.
- AK: Diagramm „Dauer je Futterstelle“ und „Soldaten vor/nach Einnahme“.
- AK: Warnung, wenn ein Bot länger als eine Schwelle kein neues Ziel einnehmen kann.

**US-10.07 · Wirkung von Upgrades** · Should · M1.3
Als Game-Designer möchte ich Kosten und Ertrag von Adaptionen und Pheromonen vergleichen, damit kein Upgrade nutzlos oder übermächtig ist.
- AK: Je Upgrade: Kosten, Ertragssteigerung und Amortisationszeit.
- AK: DNA-Fluss (Einnahmen vs. verfügbare Ausgaben) über die Zeit.

**US-10.08 · Pacing-Zielband** · Must · M1.3
Als Game-Designer möchte ich Zielbänder für Pacing-Kennzahlen festlegen und Abweichungen sehen, damit ich die Spielerfahrung absichere.
- AK: Zielbänder aus dem [Projektplan](projektplan.md#35-pacing-ziele-vorläufig) werden als Flächen eingeblendet.
- AK: Abweichungen werden als Warnliste mit Zeitpunkt angezeigt.

**US-10.09 · Balancing-Regression** · Should · M1.5
Als Entwickler möchte ich, dass Tests anschlagen, wenn eine Änderung das Pacing ungewollt verschiebt, damit Balancing nicht unbemerkt kaputtgeht.
- AK: Kennzahlen fester Bot-Läufe werden als Snapshot im Test gespeichert; Abweichungen über einer Toleranz schlagen fehl.

## 6. Zuordnung Meilenstein → Stories

| MS | Stories |
|---|---|
| M1.0 | US-07.02, 09.02 |
| M1.1 | US-01.01–01.04, 02.01–02.05, 10.01–10.05 |
| M1.2 | US-04.01–04.12, 10.06 |
| M1.3 | US-03.01–03.03, 05.01–05.04, 06.01–06.04, 10.07, 10.08 |
| M1.4 | US-08.01–08.08, 09.03 |
| M1.5 | US-07.01, 07.03–07.06, 09.01, 09.04, 10.09 |

## 7. Backlog späterer Ausbaustufen (Überschriften)

Die Stories werden erst nach dem Konzept-Meilenstein der jeweiligen Stufe ausformuliert (siehe [Projektplan, Abschnitt 4](projektplan.md#4-spätere-ausbaustufen-grob)).

**AS2 · Evolution**
- E11 Große Ascension (Einzeller → Mehrzeller)
- E12 Prestige-Währung & Mutationen
- E13 Erfolge
- E14 Aktive Fähigkeiten & Energie
- E15 Kaufmodi (×10, 25 %, Max)
- Modell-Seite: Prestige-Zyklen und optimaler Zeitpunkt für die Ascension

**AS3 · Urmeer**
- E16 Biome der Ära II
- E17 Verteidigungsarten
- E18 Zweiter Rohstoff
- E19 Spezialeinheiten
- E20 Visuelle Ära II
- E28 Mehrere Standorte (2–3 gleichzeitig)

**AS4 · Land**
- E21 Land-Biome
- E22 Zivilisation als Gegner
- E23 Gebietseroberung, Fronten & Planeteneinnahme
- E24 Weitere Strategien

**AS5 · Weltraum**
- E25 Ausbreitung im Sonnensystem & Planetenklassen
- E26 FTL & Systemwechsel
- E27 Galaxis-Ebene & globale Gesamtübersicht

**Querschnitt**
- Cloud-Sync
- Englische Übersetzung
- Statistikseite
- Sound
