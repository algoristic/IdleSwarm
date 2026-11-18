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
| `shared/util/format/display-format.ts` | gerichtete Anzeigerundung (`roundDownForDisplay`, `roundUpForDisplay`), `formatDown`, `formatUp`, `formatDuration`, `barPercent` |
| `shared/util/format/elapsed-format.ts` | Zeitspannen und Achsenwerte der Modell-Seite |
| `shared/util/format/date-format.ts` | `formatDateTime`, `formatIsoDateTime`, `isValidTimestamp` |
| `shared/util/rng/rng.ts` | `seedToRngState`, `nextRandom` (Mulberry32); Algorithmen nicht ändern |
| `shared/ui/pipes/<name>/` | eine Pipe je Formatierungsfunktion (`formatNum`, `formatRate`, `formatDown`, `formatUp`, `formatDuration`, `formatElapsed`, `formatDateTime`, `formatIsoDateTime`) |
| `shared/data-access/platform/platform.tokens.ts` | `CLOCK` (`now`, `monotonic`), `ANIMATION_FRAME` |
| `src/styles.css` | Tailwind-Import, Varianten, `--sw-*`-Tokens, `@theme` (Farben, Rasterspalten) |

## Besonderheiten

- Eine neue Formatierung entsteht als Funktion in `shared/util/format` mit Spec und bekommt eine Pipe; Templates rufen die Funktion nie direkt auf.
- `date-format.ts` erzeugt `Date` nur aus einem übergebenen Zeitpunkt; die Ausnahme von der Determinismus-Regel ist dort begründet.
- Neue Farben sind neue `--sw-*`-Tokens mit Eintrag in `@theme inline`; Text auf `--sw-bg`/`--sw-surface` mit mindestens 4,5:1 Kontrast.
- Wiederkehrende Rasterspalten stehen als `--grid-template-columns-*` in `@theme` (z. B. `grid-cols-stats`), nicht als Arbitrary Value.
- Die Defaults von `CLOCK` und `ANIMATION_FRAME` lesen die Globals bei jedem Aufruf, damit Fake-Timer und Spies in Tests greifen.
