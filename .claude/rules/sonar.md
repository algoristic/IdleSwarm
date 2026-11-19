---
paths:
  - "src/app/sonar/**"
---

# Sonar (Umgebung, Prototyp)

Die Route `/umgebung` ist die funktionale Bedienung zum Weiterziehen (M1.2, AP 1.2.2–1.2.7). Die SVG-Sonar-Karte (AP 1.2.8) ersetzt später die Zielliste; Viewmodel, Detailpanel und Einstellungsformular sollen bleiben.

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `sonar/feature/sonar.routes.ts` | Route `''` unter `umgebung` (lazy in `app.routes.ts`), registriert `provideSonarState()` |
| `sonar/feature/sonar/sonar.page.{ts,html}` | `SonarPage`: Standort bzw. Reise, Reichweite, Zielliste, Detailpanel, Einstellungen; Rücklink zum HUD |
| `sonar/feature/state/sonar.facade.ts` | `SonarFacade`: `sonar` (Viewmodel), lokale Auswahl (`select`), `depart`, `setPriority`, `setStrategy`, `setAutoEnabled`, `setAutoThresholdPercent`, `convertDronesToQueen` |
| `sonar/feature/state/sonar.utils.ts` | `toSonarView` (rein): ruft nur Logik aus `site`/`swarm`/`balance` auf |
| `sonar/feature/state/sonar.model.ts` | `SonarSource`, `SonarView`, `CurrentSiteView`, `TravelView` |
| `sonar/domain/auto-threshold-logic.ts` | Schwelle in ganzen Prozent ↔ Anteil, `parseThresholdPercent` |
| `sonar/ui/models/target.model.ts` | `TargetView`, `TargetDetails`, `ExpectedLosses`, `TransportView`, `QueenConversionView`, `CountView` (Menge + angezeigte Zahl für die Mehrzahl), `TargetBlocker`, `TARGET_VERDICTS` |
| `sonar/ui/sonar-labels/sonar-labels.ts` | `Record`-Abbildungen Code → Text: Strategien, Prioritäten, Urteile, Aufbruchssperren (`TargetBlocker`); `VERDICT_TONES` (Textfarbe je Urteil) |
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
- Rundung im Template: Mengen, Mitkommende und DNA `formatDown`, Kosten, Verluste, Zurückgelassene und Restvorrat `formatUp`, Distanz `formatRate` (eine Nachkommastelle), Abwehr und Prozentwerte `formatNum`, Zeiten `formatDuration` (Sekunden als `Num`, umgerechnet über `TICK_MS · TICKS_PER_SECOND`).
- Das Einstellungsformular hält sein Modell selbst (`linkedSignal` aus dem Input, mit Wertgleichheit, damit der Tick die Eingabe nicht zurücksetzt) und meldet Änderungen über Outputs, die die Seite an die Facade weiterreicht. Die Formularbindung übernimmt Werte beim `input`-Ereignis; die Outputs feuern beim folgenden `change`. Die Schwelle geht beim Verlassen des Felds oder mit Enter hinaus, nur gültig (ganze Prozent 0 bis `θ_max`) und nur bei Änderung.
- Touch-Ziele: Auswahl, Eingabe und Knöpfe mindestens `min-h-11` (44 px).
- Test-IDs: `sonar.nav.back`, `sonar.status.{site,travel,new-targets,range}`, `sonar.targets.stale`, `sonar.targets.<index>.{select,type,distance,verdict,strategy-choice}`, `sonar.detail.{type,strategy-choice,size,distance,travel-time,defense,dna,find-chance,losses,versus,attack-bar,defense-bar,verdict,forfeit,depart,blocker,empty}`, `sonar.transport.{priority,carried,fits-all,left-behind,after-arrival}`, `sonar.queen.{price,convert}`, `sonar.settings.priority`, `sonar.settings.strategy.<strategyId>`, `sonar.auto.{enabled,threshold,threshold-error}`.
