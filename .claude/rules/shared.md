---
paths:
  - 'src/app/shared/**'
---

# shared

Domänenübergreifendes ohne Fachwissen. `shared` importiert weder `game` noch `dev` (ESLint, auch in Specs).

## Formatierung (`util/format.ts`)

Feste Formatierung de-DE ohne `Intl`, getestet in `util/format.spec.ts`.

- `formatNumber(n)`:
  - unter 100: eine abgerundete Nachkommastelle mit Komma, ohne „,0“ (`12,3`, `12`),
  - unter 10000: abgerundete ganze Zahl mit Tausenderpunkt (`1.234`),
  - darüber: Suffixe `Tsd.`, `Mio.`, `Mrd.`, `Bio.`, `Brd.`, `Trio.`, `Trd.`, `Quad.`, `Qrd.`, `Quint.`; der Wert davor nach denselben Regeln (unter 100 eine Nachkommastelle, sonst ganz: `12,3 Mio.`, `123 Mio.`),
  - ab 1e33: Exponentenform mit zwei Nachkommastellen (`1,50e33`),
  - negativ mit Minuszeichen U+2212 (`−5`), nicht endlich `∞`.
- `formatInteger(n)`: `formatNumber(Math.floor(n + 1e-9))`.
- `formatTime(sec)`: `m:ss` bzw. ab einer Stunde `h:mm:ss`, auf ganze Sekunden aufgerundet; negativ `0:00`, nicht endlich `–`.
- `formatDuration(sec)`: auf ganze Sekunden gerundet, `42 s`, `3 min 5 s` bzw. ab einer Stunde `2 h 15 min`.

Die Funktionen sind ein 1:1-Port von `fmt`, `fmtInt`, `fmtTime`, `fmtDuration` aus dem Prototyp. Bewusst erhaltene Eigenheiten:

- Die Exponentenform rundet per `toFixed` statt abzurunden; nur reine Nullen nach dem Komma entfallen (`1,50e33`, aber `1e33`).
- `-Infinity` und `NaN` ergeben `∞`.
- `formatDuration` hat keine Sonderfälle für negative oder nicht endliche Werte (`-5 s`, `NaN h NaN min`).

Sie werden nicht stillschweigend „verbessert“; eine Änderung entscheidet der Nutzer.

## Pipes (`ui/pipes`)

`formatNumber`, `formatInteger`, `formatTime`, `formatDuration` (`FormatNumberPipe` usw. unter `ui/pipes/format-*/format-*.pipe.ts`) reichen an die gleichnamigen Funktionen durch. Templates formatieren nur über diese Pipes.
