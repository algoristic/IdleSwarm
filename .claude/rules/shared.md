---
paths:
  - "src/app/shared/**"
  - "src/styles.css"
---

# Shared und Design-Tokens

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `shared/util/num/num.ts` | `Num` (einziger Zugang zu `break_infinity.js`, ADR-002) |
| `shared/util/format/format.ts` | `formatNum`, `formatRate` (de-DE, Kurzformen, wissenschaftlich) |
| `shared/util/format/display-format.ts` | gerichtete Anzeigerundung (`roundDownForDisplay`, `roundUpForDisplay`), `formatDown`, `formatUp`, `formatDuration`, `barPercent`, `splitPercents` (ganze Prozent, die zusammen genau 100 ergeben; ohne Summe alle 0) |
| `shared/util/format/elapsed-format.ts` | Zeitspannen und Achsenwerte der Modell-Seite |
| `shared/util/format/date-format.ts` | `formatDateTime`, `formatIsoDateTime`, `isValidTimestamp` |
| `shared/util/time/time-units.ts` | `SECONDS_PER_MINUTE`, `SECONDS_PER_HOUR`, `MS_PER_SECOND`, `MS_PER_MINUTE`, `MS_PER_HOUR`; der Spieltakt (`TICK_MS`, `TICKS_PER_SECOND`) steht in `balance/domain` |
| `shared/util/parse/parse.ts` | Eingabeparser: `NumberRange` (`min`, optional `max`, inklusive), `parseWholeNumber` (ganze Zahl, optional deutscher Tausenderpunkt `1.000`), `parseDecimal` (Komma oder Punkt, auch Exponent; Tausendermuster wie `20.000` abgelehnt) |
| `shared/util/rng/rng.ts` | `seedToRngState`, `nextRandom` (Mulberry32); Algorithmen nicht ändern |
| `shared/ui/pipes/<name>/` | eine Pipe je Formatierungsfunktion (`formatNum`, `formatRate`, `formatDown`, `formatUp`, `formatDuration`, `formatElapsed`, `formatDateTime`, `formatIsoDateTime`) |
| `shared/data-access/platform/platform.tokens.ts` | `CLOCK` (`now`, `monotonic`), `ANIMATION_FRAME` |
| `src/styles.css` | Tailwind-Import, Varianten, `--sw-*`-Tokens, `@theme` (Farben, Rasterspalten, Schriftgröße `--text-2xs` für die Kostenschilder im Genom); seit AP 1.3.3 Genom-Tokens `--sw-branch-{collect,brood,combat,unique}`, `--sw-nucleus`, `--sw-membrane`, `--sw-organelle`, `--sw-cell`, `--sw-locked`, `--sw-locked-fg`, `--sw-cost-muted`, `--sw-cost-muted-fg` (Utilities `bg-nucleus`, `stroke-locked` …) |

## Besonderheiten

- Eine neue Formatierung entsteht als Funktion in `shared/util/format` mit Spec und bekommt eine Pipe; Templates rufen die Funktion nie direkt auf.
- Neue Eingabeparser bauen auf `parse.ts` auf. Parser der Domänen (`parseWholeCount`, `parseThresholdPercent`, `parseStallThresholdMinutes`, `parseParam`) sind dünne Wrapper, die nur die fachlichen Grenzen setzen.
- Zeiteinheiten nie als Literal (`60`, `1000`, `60_000`) und nie als lokale Kopie, sondern aus `time-units.ts`; Spielzeit in Ticks über `TICK_MS` aus `balance/domain`.
- `date-format.ts` erzeugt `Date` nur aus einem übergebenen Zeitpunkt; die Ausnahme von der Determinismus-Regel ist dort begründet.
- Neue Farben sind neue `--sw-*`-Tokens mit Eintrag in `@theme inline`; Text auf `--sw-bg`/`--sw-surface` mit mindestens 4,5:1 Kontrast.
- Wiederkehrende Rasterspalten stehen als `--grid-template-columns-*` in `@theme` (z. B. `grid-cols-stats`), nicht als Arbitrary Value.
- Die Defaults von `CLOCK` und `ANIMATION_FRAME` lesen die Globals bei jedem Aufruf, damit Fake-Timer und Spies in Tests greifen.
