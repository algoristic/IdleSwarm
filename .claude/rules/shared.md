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

## Tokens (`src/styles.css`)

- Farben als CSS-Variablen auf `:root`, über `@theme inline` als Tailwind-Farben: `bg`, `canvas`, `panel`, `panel-2`, `panel-3`, `panel-neuron`, `fg`, `fg-muted`, `fg-subtle`, `on-accent`, `accent-cyan|pink|yellow|orange|lime|violet`, `warn`, `warn-surface`, `grip`, `grip-hover`.
- Schattenfarben `--shade-*` gibt es nur als Rohvariablen; sie stecken in den Schatten `shadow-raised`, `shadow-raised-pink|orange|cyan`, `shadow-btn`, `shadow-btn-warn`, `shadow-btn-gold`, `shadow-sheet`, `shadow-card`, `shadow-toast`, `shadow-frame`.
- Dazu `--font-sans` (Schriftstapel des Prototyps), `ease-glide` und `animate-toast` (4,2 s, Keyframes `toast`).
- Die Standardpalette von Tailwind ist geleert (`--color-*: initial`): Es gibt nur die Token-Farben.
- Komponenten-CSS und Basis-Layer lesen die Rohvariablen (`var(--canvas)`), nicht `--color-*`: Wegen `inline` werden diese nur ausgegeben, wenn eine Utility sie benutzt.
- Eigene Variante `aria-current:` (gesetzt und nicht `false`).
- Basis-Layer: `body` (Hintergrund, Schrift, `text-sm`, `overscroll-behavior: none`) und `button` (erbt Schrift und Farbe, Zeiger; Standardzeiger bei `disabled`/`aria-disabled`).
- Entscheidungen des Nutzers:
  - Maße aus dem Prototyp sind auf die Tailwind-Standardskala gerundet; keine eigenen Größen- oder Radius-Tokens. Farben und Schatten sind 1:1 Tokens.
  - Auf Pink (und den anderen Akzenten) steht dunkle Schrift `on-accent` statt Weiß (Kontrast ≥ 4,5:1).

## UI-Elemente (`ui`)

Rein präsentational; Zustand liegt beim Aufrufer. Varianten über `computed`-Mappings mit vollständigen Klassennamen.

- `[appButton]` (`ButtonDirective`): `variant` `default` | `warn` | `gold`; gedimmt bei `disabled`/`aria-disabled`.
- `[appTag]` (`TagDirective`): `tone` (Pflicht) `gold` | `pink` | `teal` | `ghost`; leer ausgeblendet, sonst gekürzt.
- `app-segment` (`SegmentComponent<T>`): `options` (`SegmentOption`: `id`, `label`, optional `tone` `default` | `orange` | `pink`, `testId`), `selected`, `label` (für `role="group"`), `size` `default` | `compact`; Output `selectedOption`. Der gewählte Knopf trägt `aria-pressed`.
- `app-pill` (`PillComponent`): `label`, `tone` (Punkt `lime` | `yellow` | `orange`), `extra` (Zusatz rechts im Kopf, gekürzt), `barFraction` (Balken, auf 0 bis 1 begrenzt; ohne Wert kein Balken), `barOver` (Balken orange). Slots: Inhalt ist der Wert, `[appPillSub]` die Unterzeile (leer ausgeblendet).
  - Kopf `tracking-wide`/`leading-none`, `extra` `tracking-normal`, Wert `leading-tight`: So passt der Kopf bei 390 px und die Höhe entspricht dem Prototyp.
- `app-bottom-sheet` (`BottomSheetComponent`): `label` (`role="region"`), `collapsed` (Pflicht), `tone` `default` | `neuron`, `gripTestId`; Output `changedCollapsed(boolean)`.
  - Der Zustand liegt beim Aufrufer.
  - Griff: `click` klappt um (Antippen, Tastatur über die native Button-Semantik, Hilfstechnik). Wischen mit der Primärtaste (ab 12 px, Pointer-Capture) klappt nach unten ein, nach oben aus und unterdrückt den folgenden Klick derselben Geste; andere Tasten tun nichts. `aria-expanded` und die Beschriftung „Blatt einklappen“/„Blatt ausklappen“ folgen dem Zustand.
  - Eingeklappt bleibt der Griff sichtbar (`bottom-sheet--collapsed`, Safe Area unten).
- `app-toast` (`ToastComponent`): Inhalt projiziert; Output `expired` bei `animationend` der eigenen Animation, kein Timer. `app-toast-stack` (`ToastStackComponent`) setzt die Toasts übereinander (`aria-live="polite"`).
- `app-dialog-frame` (`DialogFrameComponent`): natives `<dialog>`, `open` (Pflicht) öffnet per `showModal()` in einem `afterRenderEffect` und schließt; `label`; Output `closed`. Klick auf den Hintergrund (nur wenn auch das `pointerdown` dort begann, Ziehen aus dem Inhalt schließt nicht) und Escape schließen wie im Prototyp; der Aufrufer setzt danach `open` zurück.
  - Inhalt über Direktiven: `[appDialogTitle]`, `[appDialogHeading]`, `[appDialogText]`, `[appDialogActions]` (`columns` 1 | 2).
- Hervorhebungen (`<b>`) in projiziertem Inhalt färbt der Aufrufer.

## Tests

- `ui/bottom-sheet/bottom-sheet.component.spec.ts`: Antippen, Klick, Wischen (genau einmal), andere Tasten, Tastatur, Beschriftung des Griffs.
