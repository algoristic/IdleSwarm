---
paths:
  - "src/app/hud/**"
---

# HUD (Prototyp)

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `hud/feature/hud.routes.ts` | Startroute `''`, registriert `provideHudState()` |
| `hud/feature/hud/hud.page.{ts,html}` | `HudPage`: Ressourcen, Futterstelle, Platz, Kaufknöpfe, Speicherstatus; bildet `HudNotice` auf Texte ab |
| `hud/feature/state/hud.facade.ts` | `HudFacade`: `hud` (Viewmodel), `buy(unit)`, `renewSite()` |
| `hud/feature/state/hud.utils.ts` | `toHudView` (rein), `BUY_ORDER` |
| `hud/feature/state/hud.model.ts` | `HudSource`, `HudView`, `SpaceView`, `HudNotice` |
| `hud/ui/buy-button/` | `BuyButtonComponent` mit `UnitView` (`buy-button.component.model.ts`), Output `clickedBuy` |
| `hud/ui/feeding-site/` | `FeedingSiteComponent` mit `SiteView`, Output `clickedRenew`; setzt nach dem Erneuern den Fokus auf die Überschrift |
| `hud/ui/hud-meter/` | `HudMeterComponent`: Balken mit ARIA-Werten, Warnzustand über `data-warning` |

## Besonderheiten

- Das Viewmodel enthält Rohwerte (`Num`); gerundet und formatiert wird im Template über die Pipes aus `shared/ui/pipes` (`formatDown` für Mengen, `formatUp` für Restvorrat, `formatNum` für den bereits gerundeten Preis).
- Der angezeigte Preis eines kaufbaren Knopfs ist nie höher als die angezeigte Nahrung (`toHudView`, Game-Design §4).
- Die Live-Regionen (`role="status"`) stehen immer im DOM und enthalten keine tickenden Werte.
- Test-IDs: `hud.resources.*`, `hud.site.*`, `hud.space.*`, `hud.units.<unit>.{buy,count,price,effect}`, `hud.status.*`.
- Das HUD wird ab M1.4 durch die K2-Shell ersetzt (AP 1.4.x); bis dahin bleibt es funktional.
