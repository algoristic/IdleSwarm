---
paths:
  - 'src/**/*.html'
  - 'src/**/*.css'
---

# Styling

**Tailwind CSS v4** mit semantischen Tokens. `src/styles.css` ist das einzige globale Stylesheet: Es importiert Tailwind, definiert die Farb-Tokens als CSS-Variablen, bildet sie über `@theme inline` auf Tailwind-Farben ab und enthält die eigenen Varianten (`@custom-variant`). Arbitrary Values und zusammengesetzte Klassennamen meldet ESLint.

- Templates verwenden Utility-Klassen, Farben nur aus den Tokens (`bg-bg`, `text-fg`, `text-accent`), Abstände, Größen und Typografie aus der Tailwind-Skala. Neue Farben sind neue Tokens in `src/styles.css`, mit Textkontrast ≥ 4,5:1.
- **Ausnahme Illustrationen:** Farben von SVG-Kunst und Canvas kommen aus `game/ui/art/art-palette.ts` (ADR 0002), gebunden per Attribut (`[attr.fill]`) aus Feldern oder `computed`.
- Varianten über Signal-Inputs und ein `computed`-Mapping mit vollständigen Klassennamen.
- Zustände folgen ARIA-Attributen statt Klassen-Ternären: `aria-disabled:`, `aria-selected:`, `aria-current` über die eigene Variante, `disabled:` bei nativen Elementen.
- **Host-Styling** über die Host-Klasse (`host: { class: 'block' }`, `host: { '[class]': 'classes()' }`).
- **Komponenten-CSS** (`.component.css`/`.page.css`, Plain CSS) nur für Sonderfälle, die Utilities nicht ausdrücken können. `npm run check` prüft dort: keine Farbwerte außer `var(--…)`, keine Tailwind-Direktiven, BEM mit dem Dateinamen als Block, kein Layout auf `:host`.
- Keine weiteren UI-Frameworks. Für Icons wird eine Bibliothek per ADR gewählt, sobald welche gebraucht werden.
