---
paths:
  - "src/app/sonar/**"
---

# Sonar (Umgebung, Prototyp)

Die Route `/umgebung` ist der Kartenmodus der K2-Shell (AP 1.4.1, Regeldatei `shell`) und die Bedienung zum Weiterziehen (M1.2, AP 1.2.2–1.2.8). Die SVG-Sonar-Karte (AP 1.2.8, US-04.12) liegt in der Sonar-Ebene; die Zielliste steht als tippbare, barrierearme Alternative im Overlay, beide teilen die Auswahl.

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `sonar/feature/state/sonar.providers.ts` | `provideSonarState()`, registriert an der Shell-Route (`shell/feature/shell.routes.ts`) |
| `sonar/feature/sonar-layer/sonar-layer.component.{ts,html,css}` | `SonarLayerComponent`: Inhalt der Sonar-Ebene, die Karte auf einer Bühne von `--ms` × `--ms` (CSS nach der K2-Ausnahme), damit das Kartenzentrum in der Viewport-Mitte liegt |
| `sonar/feature/sonar-overlay/sonar-overlay.component.{ts,html}` | `SonarOverlayComponent`: Overlay des Kartenmodus mit Titel, Standort bzw. Reise, Reichweite, Zielliste, Detailpanel, Einstellungen. Zurück geht es über den Knopf der Shell |
| `sonar/feature/state/sonar.facade.ts` | `SonarFacade`: `sonar` (Viewmodel), lokale Auswahl (`select`), `depart`, `setPriority`, `setStrategy`, `setAutoEnabled`, `setAutoThresholdPercent`, `convertDronesToQueen` |
| `sonar/feature/state/sonar.utils.ts` | `toSonarView` (rein): ruft nur Logik aus `site`/`swarm`/`balance` auf; `toMapView` setzt daraus und aus `sonar-map-logic` das Kartenmodell (`SonarView.map`) zusammen |
| `sonar/feature/state/sonar.model.ts` | `SonarSource`, `SonarView`, `CurrentSiteView`, `TravelView` |
| `sonar/domain/auto-threshold-logic.ts` | Schwelle in ganzen Prozent ↔ Anteil, `parseThresholdPercent` (über `parseWholeNumber` aus `shared/util/parse`, bis `θ_max`) |
| `sonar/domain/sonar-map-logic.ts` | Geometrie der Karte im `viewBox` (`MAP_SIZE` 800, `MAP_RADIUS`, `HERE_RADIUS`): `mapScale`, `toMapPoint`, `spokes`, `trail`, `sweepPath`, `approachPath` (geschwungen), `travelLine` (gerade, mit Fortschritt), `nodeRadii` (logarithmisch nach Vorrat), `arcDash`; Typen `MapPoint`, `MapScale`, `MapSpoke`, `MapTrail`, `MapTravel` |
| `sonar/ui/models/target.model.ts` | `TargetView`, `TargetDetails`, `ExpectedLosses`, `TransportView`, `QueenConversionView`, `CountView` (Menge + angezeigte Zahl für die Mehrzahl), `TargetBlocker`, `TARGET_VERDICTS` |
| `sonar/ui/sonar-labels/sonar-labels.ts` | `Record`-Abbildungen Code → Text: Strategien, Prioritäten, Urteile, Aufbruchssperren (`TargetBlocker`); `VERDICT_TONES` (Textfarbe je Urteil), `VERDICT_FILLS`/`VERDICT_STROKES` (Füll- und Linienfarbe der Ziele auf der Karte) |
| `sonar/ui/sonar-map/` | `SonarMapComponent`: SVG-Karte mit Ringen, Reichweite, Sweep, bisheriger Route, Zielen (Knöpfe mit `aria-label`, `aria-pressed`, Enter/Leertaste), ◆-Markierung, Auswahlring, Route bzw. Reiselinie, eigener Position und Legende; Output `selectedTarget` (Index). Typen in `sonar-map.component.model.ts`: `SonarMapView`, `MapRingView`, `MapNodeView`, `MapHereView`. `sonar-map.component.css` für Sweep, Routenfluss und Beschriftungskontur |
| `sonar/ui/target-list/` | `TargetListComponent`: Ziele mit Urteil und Strategie-Markierung, Output `selectedTarget` (Index) |
| `sonar/ui/target-detail/` | `TargetDetailComponent`: Werte, Balken Angriff vs. Abwehr (`role="meter"`), Urteil, Verluste, Transportvorschau, Drohnen → Königin, Restvorrat-Hinweis, Aufbruch mit Grund; Outputs `clickedDepart`, `clickedConvertDronesToQueen` |
| `sonar/ui/form-move-settings/` | `FormMoveSettingsComponent` (Signal Forms): Priorität, Strategie, Auto an/aus, Schwelle; Outputs `changedPriority`, `changedStrategy`, `changedAutoEnabled`, `changedThresholdPercent` |

## Besonderheiten

- Die Auswahl im Detailpanel ist lokaler UI-Zustand der Facade (`linkedSignal` auf `map.moves`): Nach jeder Ankunft fällt sie zurück. Ohne Auswahl (oder mit ungültigem Index) zeigt das Panel das Ziel der Strategie.
- Jedes Ziel ist für das Detailpanel auswählbar, auch außer Reichweite und unerforscht. „Nicht wählbar“ (US-04.03) heißt: Der Knopf „Aufbrechen“ ist gesperrt, der Grund kommt aus `departureBlocker`. Der Kern meldet für unerforschte Ziele `out-of-range`; `toSonarView` macht daraus `unexplored` (`TargetBlocker`) mit eigenem Text. Unerforschte Ziele haben `details: null` und zeigen nur „?“.
- Urteil (`TargetVerdict`): unerforscht und außer Reichweite vor einnehmbar/zu stark. Angriff und Verluste rechnen mit `S'` nach Transport mit der aktuellen Priorität (`assessTargets`); ein Prioritätswechsel ändert Urteil, Verluste und Strategieziel sofort.
- Verluste sind bei nicht einnehmbaren Zielen `null` (Anzeige „–“), angezeigt 0 Verluste heißen „keine“. Die Balken Angriff vs. Abwehr teilen eine Skala; der größere Wert füllt den Balken. Der Angriff zählt dabei abgerundet wie angezeigt: Angezeigt 0 gegen 0 lässt beide Balken leer.
- Restzeit des Vorrats: `site.secondsLeft` ist `null`, wenn der Vorrat leer ist oder nichts abgebaut wird (`siteSecondsLeft` liefert bei leerem Vorrat 0).
- Während der Reise: `strategyTarget` ist `null` (keine ◆-Markierung, ohne Auswahl bleibt das Detailpanel leer), `transport` ist `null` (Hinweis `sonar.transport.after-arrival`), Urteile bleiben, aber gedämpft (`data-stale:text-fg-muted` bei Sperre `traveling`). Die Statuszeile sagt, dass es nach der Ankunft neue Ziele gibt.
- Mehrzahl über ICU im Template (`{x.shown, plural, =1 {… Drohne} other {… Drohnen}}`), die Zahl selbst zeigt weiter die Pipe. `CountView.shown` ist so gerundet wie diese Pipe (`countUp` ↔ `formatUp`, `countDown` ↔ `formatDown` in `sonar.utils.ts`); beim Wechsel der Pipe beides ändern. Zurückgelassene, die angezeigt 0 sind, sind `null` und fallen im Text weg.
- Die ◆-Erklärung in `sonar.status.range` hält „◆ =“ mit geschützten Leerzeichen (`&nbsp;`) zusammen.
- Rundung im Template: Mengen, Mitkommende und DNA `formatDown`, Kosten, Verluste, Zurückgelassene und Restvorrat `formatUp`, Distanz `formatRate` (eine Nachkommastelle), Abwehr und Prozentwerte `formatNum`, Zeiten `formatDuration` (Sekunden als `Num`, umgerechnet über `MS_PER_SECOND` aus `shared/util/time`).
- Das Einstellungsformular hält sein Modell selbst (`linkedSignal` aus dem Input, mit Wertgleichheit, damit der Tick die Eingabe nicht zurücksetzt) und meldet Änderungen über Outputs, die die Seite an die Facade weiterreicht. Die Formularbindung übernimmt Werte beim `input`-Ereignis; die Outputs feuern beim folgenden `change`. Die Schwelle geht beim Verlassen des Felds oder mit Enter hinaus, nur gültig (ganze Prozent 0 bis `θ_max`) und nur bei Änderung. Angezeigt wird die wirksame Schwelle: Ein geladener Stand mit Schwelle über `θ_max` erscheint als `θ_max` (`clampAutoThreshold` in `toSonarView`), der gespeicherte Wert bleibt.
- Touch-Ziele: Auswahl, Eingabe und Knöpfe mindestens `min-h-11` (44 px).
- Sonar-Karte, Maßstab: Die Zahl der Ringe ist das Aufgerundete aus max(Reichweite, größte Kandidatendistanz), mindestens 1 (Gleitkomma-Rest wie 5,000000001 ergibt keinen Ring mehr); der äußerste Ring liegt immer bei `MAP_RADIUS`. Die bisherige Route geht nicht in den Maßstab: Von der neuesten Stelle rückwärts bleibt sie sichtbar, bis sie die Karte verlässt; dort wird sie am Rand abgeschnitten, Älteres fällt weg. Die Ringnummer entfällt, wo die Reichweite beschriftet ist.
- Sonar-Karte, Ziele: Farbe nach Urteil, Größe logarithmisch nach Vorrat (unerforscht: kleinste, nur „?“). Der Abwehrbogen um ein Ziel ist `defenseBarPercent` (gleiche Skala wie der Balken im Detailpanel), ohne Abwehr oder unerforscht entfällt er. Außer Reichweite und unerforscht sind gedämpft (`data-dim`). Die Route zum gewählten Ziel gibt es nur bei Status `in-range` und ohne Reise.
- Sonar-Karte während der Reise: Zentrum bleibt der Ausgangsort (`SonarView.map.here`), statt der Route zeigt sie eine gerade Reiselinie mit Fortschrittspunkt (Fortschritt aus `remainingMs` und `travelDurationMs`), alle Ziele sind gedämpft, keine ◆-Markierung (`strategyTarget` ist `null`).
- Die Karte füllt die Breite ihres Hosts (keine Höchstbreite mehr); die Größe gibt die Ebene über `--ms` vor. Die Legende steht unter dem SVG und ragt aus der Bühne.
- Das Kartentemplate rechnet nichts: Alle Koordinaten, Radien, Pfade und `transform`-Strings liefert das Viewmodel. Sweep und Routenfluss sind CSS-Animationen nach der K2-Ausnahme (CLAUDE.md §4) und stehen bei `prefers-reduced-motion: reduce` still.
- Test-IDs: `sonar.status.{site,travel,new-targets,range}`, `sonar.targets.stale`, `sonar.targets.<index>.{select,type,distance,verdict,strategy-choice}`, `sonar.detail.{type,strategy-choice,size,distance,travel-time,defense,dna,find-chance,losses,versus,attack-bar,defense-bar,verdict,forfeit,depart,blocker,empty}`, `sonar.transport.{priority,carried,fits-all,left-behind,after-arrival}`, `sonar.queen.{price,convert}`, `sonar.settings.priority`, `sonar.settings.strategy.<strategyId>`, `sonar.auto.{enabled,threshold,threshold-error}`, `sonar.map.{svg,range,range-label,trail,route,travel,travel.swarm,here,legend}`, `sonar.map.targets.<index>`, `sonar.map.targets.<index>.{selected,strategy-choice}`.
