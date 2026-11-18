# ADR-008: Kein Backend, Hosting auf GitHub Pages

**Status:** Angenommen
**Datum:** 2026-11-18

## Kontext

IdleSwarm ist ein Einzelspieler-Spiel ohne Multiplayer. Logik, Speicherung und Offline-Fortschritt können vollständig im Client laufen ([Konzept §1](../technisches-konzept.md#1-rahmenbedingungen)).

## Entscheidung

- Es gibt **kein Backend**.
- Das Spiel wird statisch über **GitHub Pages** (`algoristic/IdleSwarm`) ausgeliefert.
- GitHub Actions prüft und baut das Projekt und veröffentlicht von `main` ([Konzept §11](../technisches-konzept.md#11-deployment--pwa)).

### Umsetzungsstand

**Umgesetzt** in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml):

- Bei Push, Pull Request und manuellem Start laufen Lint, Formatprüfung, Unit-Tests mit Abdeckung und Build.
- Der Build nutzt `--base-href /IdleSwarm/`. Eine Kopie von `index.html` als `404.html` hält das Angular-Routing auf GitHub Pages funktionsfähig.
- Deployt wird nur bei einem Push auf `main` und nur nach erfolgreicher Prüfung.

**Geplant:**

- PWA (`@angular/pwa`): Umsetzung in AP 1.5.6
- E2E-Tests und das zugehörige CI-Gate: Umsetzung ab AP 1.5.7

## Konsequenzen

- Kein Serverbetrieb; Veröffentlichung und Prüfung liegen in einem Workflow.
- Negativ: Spielstände liegen nur im Browser ([ADR-005](005-speicherformat-localstorage.md)). Geräte werden nicht automatisch abgeglichen; dafür ist ein Export und Import vorgesehen (AP 1.5.2).
- Negativ: Spiellogik und Spielstände liegen vollständig beim Client und werden nicht serverseitig geprüft.
- Negativ: Die App ist an den Pfad `/IdleSwarm/` und die Routing-Grenzen statischen Hostings gebunden.

## Verworfene Alternativen

- **Eigenes Backend für Logik oder Speicherung:** für ein Einzelspieler-Spiel im Client nicht nötig.
- **Cloud-Sync in Release 1.0:** bleibt ein optionales späteres Thema.
