# ADR-011: Texte über `@angular/localize`, Übersetzung später

**Status:** Angenommen
**Datum:** 2026-11-18

## Kontext

Alle Texte liegen heute als `TEXTS_DE` in `core/data/texts.de.ts` bzw. als `MODEL_TEXTS` in `model/model-texts.de.ts`. Platzhalter füllt eine eigene Funktion `fillText`. Eine englische Übersetzung ist als Querschnittsthema vorgesehen, die Stufe ist offen ([Projektplan §4](../projektplan.md#querschnittsthemen-stufe-offen)).

Die Texte liegen damit in der Logikschicht, obwohl die Logik nur IDs und Codes braucht. Mehrzahl und Platzhalter sind selbst gebaut.

## Entscheidung

- Texte für Spieler entstehen mit **`@angular/localize`** (`$localize` in TypeScript, `i18n`-Attribute in Templates), Quellsprache Deutsch.
- Jeder Text hat eine **explizite ID** nach dem Schema `@@<layer><Domain>-<componentOrClass>-<key>` ([`CLAUDE.md` §5](../../CLAUDE.md#5-i18n)).
- Die Logik (`domain`) liefert nur IDs und Codes; `feature` und `ui` bilden sie auf Texte ab.
- **Übersetzung später:** Extraktion, XLF-Dateien, englische Texte und eine Prüfung in der CI kommen erst mit dem Querschnittsthema „Englische Übersetzung“.

### Umsetzungsstand

**Geplant:** Einführung und Auflösung von `TEXTS_DE`, `MODEL_TEXTS` und `fillText` in [AP 1.1.10](../projektplan.md#m11--kernschleife--modell).

## Konsequenzen

- Texte stehen dort, wo sie angezeigt werden; Platzhalter und Mehrzahl (ICU) kommen aus dem Framework.
- Die spätere Übersetzung braucht keine zweite Migration der Texte, nur Extraktion und Übersetzung.
- Negativ: jede Textstelle braucht eine ID; das kostet etwas Schreibarbeit pro Komponente.
- Negativ: Ohne Extraktion fallen doppelte oder verwaiste IDs erst bei der Übersetzung auf.

## Verworfene Alternativen

- **`TEXTS_DE` beibehalten bis zur Übersetzung:** spart jetzt Aufwand, verschiebt aber eine größere Migration aller dann vorhandenen Texte.
- **Sofort vollständig mit Englisch und CI-Prüfung (wie PortfoliGo):** zusätzlicher Aufwand in jedem Arbeitspaket, solange Texte und Mechaniken noch oft wechseln.
- **Laufzeit-Bibliothek (z. B. Transloco):** weitere Abhängigkeit; `@angular/localize` deckt den Bedarf ab.
