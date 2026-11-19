---
paths:
  - "src/app/hud/**"
---

# HUD (Prototyp)

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `hud/feature/hud.routes.ts` | Startroute `''`, registriert `provideHudState()` |
| `hud/feature/hud/hud.page.{ts,html}` | `HudPage`: Ressourcen (mit DNA und Angriff), Futterstelle bzw. Reise, Platz, Kaufknöpfe, Drohnen opfern, Ereignis-Log, Speicherstatus; bildet `HudNotice` auf Texte ab |
| `hud/feature/state/hud.facade.ts` | `HudFacade`: `hud` (Viewmodel), `log` (eigenes `computed`), `buy(unit)`, `sacrificeDrones(count)` |
| `hud/feature/state/hud.utils.ts` | `toHudView`, `toLogView` (rein, neueste zuerst), `BUY_ORDER` |
| `hud/feature/state/hud.model.ts` | `HudSource`, `HudView`, `SpaceView`, `HudNotice` |
| `hud/domain/sacrifice-count-logic.ts` | `parseWholeCount`: Anzahl ganzer Drohnen, deutsch geschrieben (reine Eingabeprüfung) |
| `hud/ui/buy-button/` | `BuyButtonComponent` mit `UnitView` (`buy-button.component.model.ts`), Output `clickedBuy` |
| `hud/ui/feeding-site/` | `FeedingSiteComponent` mit `SiteView` (`feeding-site.component.model.ts`): Typ, Rate, Vorrat, Restzeit, Reisestatus, Hinweis bei leerem Vorrat und Link zur Umgebung (`/umgebung`) |
| `hud/ui/form-sacrifice-drones/` | `FormSacrificeDronesComponent` (Signal Forms) mit `SacrificeView`, `sacrificeDronesSchema`; Ertrag und Umwandlungsverlust vorab, Output `submittedCount` |
| `hud/ui/event-log/` | `EventLogComponent` mit `LogEntryView`; `eventLogText` bildet `GameEvent` auf `$localize`-Texte ab |
| `hud/ui/hud-meter/` | `HudMeterComponent`: Balken mit ARIA-Werten, Warnzustand über `data-warning` |

## Besonderheiten

- Das Viewmodel enthält Rohwerte (`Num`); gerundet und formatiert wird im Template über die Pipes aus `shared/ui/pipes` (`formatDown` für Mengen, `formatUp` für Restvorrat, `formatNum` für den bereits gerundeten Preis).
- Der angezeigte Preis eines kaufbaren Knopfs ist nie höher als die angezeigte Nahrung (`toHudView`, Game-Design §4).
- Platz: `SpaceView.overfull` (belegt > verfügbar, `isSpaceOverfull`) zeigt `hud.space.overfull` „Zu wenig Platz …“ statt der Warnung ab 90 % (`hud.space.warning`).
- Die Live-Regionen (`role="status"`) stehen immer im DOM und enthalten keine tickenden Werte.
- Das Log kommt aus dem `GameStore` (nur Arbeitsspeicher, höchstens 50 Einträge); Zeiten zeigt es als Spielzeit (`formatElapsed`). Typnamen kommen aus `SITE_TYPE_LABELS` in `site/ui`.
- Das Opfer-Formular hält sein Modell selbst (`signal`), setzt es nach dem Absenden zurück und gibt nur gültige Anzahlen (1 bis vorhandene Drohnen) aus; was damit passiert, entscheidet die Seite (`facade.sacrificeDrones`).
- Test-IDs: `hud.resources.{food,dna,attack,food-rate,base-rate,drone-rate,eggs}`, `hud.site.{type,rate,stock,time-left,status,travel,move-link}`, `hud.space.{value,warning,overfull}`, `hud.meter.fill`, `hud.units.<unit>.{buy,count,price,effect}`, `hud.sacrifice.{count,max,yield,loss,error,submit}`, `hud.log.{list,entry,time,text,empty}`, `hud.nav.environment`, `hud.status.{last-saved,notices}`.
- Das HUD wird ab M1.4 durch die K2-Shell ersetzt (AP 1.4.x); bis dahin bleibt es funktional.
