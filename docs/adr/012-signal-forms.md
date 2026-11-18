# ADR-012: Formulare mit Signal Forms

**Status:** Angenommen
**Datum:** 2026-11-18

## Kontext

Bisher gibt es ein Formular: das Parameter-Panel der Modell-Seite. Es lief über eine eigene Klasse `ModelForm` mit Signals für Seed, Dauer, Bots und Entwürfe der Konstanten, dazu Eingabe-Handler pro Feld im Template. Ab M1.4 kommen Einstellungen (AP 1.5.3), Export und Import (AP 1.5.2) und weitere Eingaben hinzu.

[`CLAUDE.md` §3](../../CLAUDE.md#formulare) legt Signal Forms fest. Sie bringen `@angular/forms` als neue Laufzeitabhängigkeit; dafür braucht es eine ADR.

## Entscheidung

- Formulare verwenden **Signal Forms** aus `@angular/forms/signals` (Angular 22, `@angular/forms` 22.2.6). Reactive Forms und template-getriebene Formulare werden nicht verwendet.
- Das Modell ist ein beschreibbares Signal. Validierung und Feldzustand stehen in einer Schema-Funktion; die Prüfungen selbst sind reine Funktionen in `domain`.
- Hält der `feature`-Layer das Modell, weil Änderungen dort sofort wirken (Auto-Lauf der Modell-Seite), bekommt die Formular-Komponente es per `model()` und zweiseitiger Bindung.

### Umsetzungsstand

**Umgesetzt** in [AP 1.1.10](../projektplan.md#m11--kernschleife--modell): [`FormModelParamsComponent`](../../src/app/model/ui/form-model-params/form-model-params.component.ts) mit [`modelParamsSchema`](../../src/app/model/ui/form-model-params/form-model-params.schema.ts). Das Modell [`ModelParamsValue`](../../src/app/model/domain/models/model-params.model.ts) hält die `ModelFacade`; `toSimConfig` in [`model-params-logic.ts`](../../src/app/model/domain/model-params-logic.ts) leitet daraus die Laufkonfiguration ab.

## Konsequenzen

- Feldzustand (`touched`, `dirty`, `invalid`, `errors`) kommt aus dem Framework; eigene Handler pro Feld entfallen.
- Validierung bleibt ohne Angular testbar, weil das Schema nur reine Prüffunktionen aufruft.
- Negativ: `@angular/forms` vergrößert das Bundle. Die Modell-Seite wird lazy geladen; das Spiel-Bundle ist erst mit Formularen im Spiel betroffen.
- Negativ: Signal Forms sind jung. Weicht die API in späteren Angular-Versionen ab, betrifft das alle Formulare.

## Verworfene Alternativen

- **Eigene Formularklasse wie `ModelForm`:** funktioniert für ein Formular, wiederholt aber Feldzustand und Validierung in jedem weiteren.
- **Reactive Forms:** Observable-basiert und damit gegen die Regel „Signals statt RxJS“ ([ADR-009](009-domaenen-schichten-facade.md)).
