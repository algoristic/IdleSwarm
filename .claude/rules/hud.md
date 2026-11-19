---
paths:
  - "src/app/hud/**"
---

# HUD (Prototyp)

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `hud/feature/resources-panel/resources-panel.component.{ts,html}` | `ResourcesPanelComponent`: Ressourcen (Nahrung, Nahrung/s mit Aufschlüsselung, DNA, Eier/min, Gesamtangriff); die Shell zeigt es in allen Modi oben links (US-08.03) |
| `hud/feature/scene-hud/scene-hud.component.{ts,html}` | `SceneHudComponent`: Overlay der Szene in der Shell (nur im Modus `scene` sichtbar und bedienbar): Futterstelle bzw. Reise, Platz, Kaufknöpfe, Pheromone, Funde, Drohnen opfern, Ereignis-Log, Speicherstatus; bildet `HudNotice` auf Texte ab |
| `hud/feature/state/hud.providers.ts` | `provideHudState()`, registriert an der Shell-Route (`shell/feature/shell.routes.ts`) |
| `hud/feature/state/hud.facade.ts` | `HudFacade` (auch von der `ShellPage` genutzt: DNA und `availableAdaptations` für die Zoom-Leiste): `hud` (Viewmodel), `log` (eigenes `computed`), `buy(unit)`, `sacrificeDrones(count)`, `setPheromones(distribution)`, `strengthenGland()` |
| `hud/feature/state/hud.utils.ts` | `toHudView` (Modifikatoren über `stateModifiers`, `availableAdaptations` über `availableNodeCount`), `toPheromoneView`, `toFindsView`, `toLogView` (rein, neueste zuerst), `BUY_ORDER`, `PHEROMONE_ORDER`; privat `displayPrice` (aufgerundeter Preis, bei kaufbarem Knopf höchstens die angezeigte Nahrung; für Einheiten und Drüse) |
| `hud/feature/state/hud.model.ts` | `HudSource`, `HudView`, `SpaceView`, `HudNotice` |
| `hud/domain/sacrifice-count-logic.ts` | `parseWholeCount`: Anzahl ganzer Drohnen, deutsch geschrieben (reine Eingabeprüfung; Wrapper um `parseWholeNumber` aus `shared/util/parse`) |
| `hud/ui/buy-button/` | `BuyButtonComponent` mit `UnitView` (`buy-button.component.model.ts`), Output `clickedBuy` |
| `hud/ui/feeding-site/` | `FeedingSiteComponent` mit `SiteView` (`feeding-site.component.model.ts`): Typ, Rate, Vorrat, Restzeit, Reisestatus, Hinweis bei leerem Vorrat und Link zur Umgebung (`/umgebung`) |
| `hud/ui/form-sacrifice-drones/` | `FormSacrificeDronesComponent` (Signal Forms) mit `SacrificeView`, `sacrificeDronesSchema`; Ertrag und Umwandlungsverlust vorab, Output `submittedCount` |
| `hud/ui/pheromone-panel/` | `PheromonePanelComponent` mit `PheromoneView`, `PheromoneRowView`, `GlandView`, `PheromoneDistribution`: Punkte gesamt, verteilt und frei, „+“/„−“ je Typ (die Facade liefert die Zielverteilung oder `null`, geprüft wie das Kommando), geteilter Balken in Prozent, Drüsenkauf mit Preis und Wirkung in Eiern/min; Outputs `changedPheromones`, `clickedStrengthenGland` |
| `hud/ui/finds-panel/` | `FindsPanelComponent` mit `FindsView` (`FindsSetView`, `BadgeBonusView`, `BuffView`): Schublade „Funde“ mit x / y gesamt, Sets mit x / 3 und Badge-Bonus, Fragmente je einzigartiger Adaption mit x / benötigt, unbekannte Felder als „?“, laufende Buffs mit Restzeit |
| `hud/ui/event-log/` | `EventLogComponent` mit `LogEntryView`, `LogItem`, `LOG_ITEM_KINDS` (`default`, `found`); `eventLogText` bildet `GameEvent` auf `$localize`-Texte ab |
| `hud/ui/hud-meter/` | `HudMeterComponent`: Balken mit ARIA-Werten, Warnzustand über `data-warning` |

## Besonderheiten

- Das Viewmodel enthält Rohwerte (`Num`); gerundet und formatiert wird im Template über die Pipes aus `shared/ui/pipes` (`formatDown` für Mengen, `formatUp` für Restvorrat, `formatNum` für den bereits gerundeten Preis).
- Der angezeigte Preis eines kaufbaren Knopfs ist nie höher als die angezeigte Nahrung (`toHudView`, Game-Design §4).
- Platz: `SpaceView.overfull` (belegt > verfügbar, `isSpaceOverfull`) zeigt `hud.space.overfull` „Zu wenig Platz …“ statt der Warnung ab 90 % (`hud.space.warning`).
- Die Live-Regionen (`role="status"`) stehen immer im DOM und enthalten keine tickenden Werte.
- Das Log kommt aus dem `GameStore` (nur Arbeitsspeicher, höchstens 50 Einträge) und leert sich beim Laden und bei einem neuen Spiel (`GameStore.load`); Zeiten zeigt es als Spielzeit (`formatElapsed`). Typnamen kommen aus `SITE_TYPE_LABELS` in `site/ui`, Knotennamen aus `GENOME_NODE_LABELS`/`UNIQUE_ADAPTATION_LABELS` in `genome/ui`, Fund-, Set- und Badge-Namen aus `finds/ui/finds-labels`.
- Log-Texte seit M1.3: `evolved` „Adaption entwickelt: … · −x DNA“; `found` „Fund: …“ bzw. „Fund: … statt …“ (Ersatz) mit Menge, Buff-Ablauf, Fragmentfortschritt, freigeschalteter Adaption, Badge, Futterstelle und Auslöser („…, Einnahme“ bzw. „…, 25,0 % abgebaut“ über `formatShare`, ID `uiHud-eventLog-found-harvestShare`). Funde sind hervorgehoben: `LogItem.kind` `found` setzt Akzentfarbe und Fettdruck (`TEXT_CLASSES`) und steht als `data-kind` am Eintrag.
- Die Anteile des Pheromon-Balkens kommen aus `splitPercents` (`shared/util/format`), damit sie zusammen genau 100 % ergeben. Buffs zeigt das Funde-Panel nur, solange `expiresAtMs > time.played`; die Restzeit ist Spielzeit (`formatDuration`).
- Rundung im Log (`event-log-texts.ts`): Zurückgelassene und Verluste aufgerundet (`formatUp`, wie die Vorschau der Umgebung), DNA abgerundet (`formatDown`). Eine Angabe entfällt nur bei exakt 0; ein Bruchteil eines Soldaten erscheint als „−1 Soldat“, nie als „−0“.
- Das Opfer-Formular hält sein Modell selbst (`signal`), setzt es nach dem Absenden zurück und gibt nur gültige Anzahlen (1 bis vorhandene Drohnen) aus; was damit passiert, entscheidet die Seite (`facade.sacrificeDrones`).
- Test-IDs: `hud.resources.{food,dna,attack,food-rate,base-rate,drone-rate,eggs}`, `hud.site.{type,rate,stock,time-left,status,travel,move-link}`, `hud.space.{value,warning,overfull}`, `hud.meter.fill`, `hud.units.<unit>.{buy,count,price,effect}`, `hud.sacrifice.{count,max,yield,loss,error,submit}`, `hud.log.{list,entry,time,text,empty}`, `hud.pheromones.{total,distributed,free,free-hint,gland,gland-effect}`, `hud.pheromones.share.{drones,soldiers}`, `hud.pheromones.split.{drones,soldiers}`, `hud.pheromones.<unit>.{points,increase,decrease}`, `hud.finds.{progress,field,buffs,buffs-empty}`, `hud.finds.buffs.<buffId>`, `hud.finds.sets.<setId>.{progress,badge}`, `hud.finds.fragments.<adaptationId>.progress`, `hud.status.{last-saved,notices}`.
- Seit AP 1.4.1 gibt es keine HUD-Seite mehr: Die K2-Shell (`shell`) setzt `ResourcesPanelComponent` und `SceneHudComponent` zusammen; die Links zu Umgebung und Genom ersetzt die Zoom-Leiste (der Zähler verfügbarer Adaptionen steht dort, `shell.zoom.gen-count`). K2-Optik, Aktionsleiste und Schubladen folgen in AP 1.4.3.
- Der Speicherstatus (`hud.status.*`, mit Live-Region) steht im Szenen-Overlay und ist in Karte und Genom inert.
