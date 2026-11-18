# ADR-002: `break_infinity.js` hinter eigenem `Num`-Typ

**Status:** Angenommen
**Datum:** 2026-11-18

## Kontext

Idle-Zahlen sprengen spätestens ab AS2 den Bereich von `number` (~1,8·10³⁰⁸). Das Konzept wählt deshalb `break_infinity.js`: schnell und in Idle-Spielen verbreitet ([Konzept §2](../technisches-konzept.md#2-technologie-stack)). Ein eigener Wrapper soll einen späteren Tausch der Bibliothek erlauben.

## Entscheidung

- Große Zahlen laufen über `Decimal` aus `break_infinity.js`, aber ausschließlich gekapselt im Typ `Num`.
- `Num` ist unveränderlich und immer normalisiert: `0` oder `mantissa * 10^exponent` mit `1 <= |mantissa| < 10`.
- Ungültige Eingaben und Ergebnisse (`NaN`, unendlich, Exponent ab `9e15`) werfen einen `RangeError`; zu kleine Beträge werden zu `0`.
- `Num` fängt Eigenheiten der Bibliothek ab: Sie akzeptiert Texte wie `12abc`, liefert für `1E400` unendlich und gibt bei einer Division durch 0 still 0 zurück.
- Die Textform ist verlustfrei: `<mantisse>e<exponent>`, z. B. `1.284e3`.

### Umsetzungsstand

**Umgesetzt:** [`core/num/num.ts`](../../src/app/core/num/num.ts) ist die einzige Datei unter `src/`, die `break_infinity.js` importiert. Die deutsche Formatierung liegt in [`core/num/format.ts`](../../src/app/core/num/format.ts) und nutzt nur `Num`.

**Geplant:** Die technische Notation folgt in AP 1.5.3.

## Konsequenzen

- Ein Tausch der Bibliothek betrifft nur `num.ts`.
- Spiellogik und Oberfläche sehen eine einheitliche Schnittstelle mit klaren Fehlerfällen.
- Negativ: `mul`, `div` und `pow` runden auf 15 signifikante Stellen, `add` und `sub` rechnen ebenso genau. `Num` ist keine exakte Arithmetik.
- Negativ: Werte außerhalb des Bereichs führen zu einer Ausnahme statt zu einem stillen Grenzwert.
- Negativ: Die Textform ist Teil des Speicherformats ([ADR-005](005-speicherformat-localstorage.md)). Auch nach einem Bibliothekstausch muss sie lesbar bleiben.
- Negativ: Die Kapselung ist Konvention; keine ESLint-Regel verbietet den direkten Import von `break_infinity.js`.

## Verworfene Alternativen

- **`number`:** Der Wertebereich reicht nicht aus.
- **`Decimal` direkt in der Spiellogik:** Ein späterer Tausch der Bibliothek würde den gesamten Code betreffen.
