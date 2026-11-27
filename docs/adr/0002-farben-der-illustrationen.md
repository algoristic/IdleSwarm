# ADR 0002: Farben der Illustrationen

- **Status:** angenommen
- **Datum:** 27.11.2026

## Kontext

Der eingefrorene Prototyp zeichnet Einheiten, Stellen, Hintergründe, Karte und Neuron mit rund 150 fest eingetragenen Farben in SVG-Markup, Skript und CSS-Regeln. CLAUDE.md §4 erlaubt Farben nur als Tokens in `src/styles.css` mit Textkontrast ≥ 4,5:1 und verbietet Hex-Werte in Komponenten-CSS. Für Illustrationen passt das nicht: Jede Farbe als Token würde `styles.css` und `@theme` aufblähen, ohne dass Utility-Klassen sie brauchen, und der Canvas-Renderer braucht Farben als Strings in TypeScript, nicht als CSS-Variablen. AP 6 portiert die Darstellung 1:1, Farben inklusive.

## Entscheidung

- Alle Farben der Illustrationen (SVG-Kunst und Canvas) stehen in einer Angular-freien Palette `src/app/game/ui/art/art-palette.ts`, gegliedert nach Bereich (Einheiten, Szene, Karte, Neuron) als `as const`-Objekte mit englischen Schlüsseln, die Werte 1:1 aus dem Prototyp.
- SVG-Templates binden Palettenfarben per Attribut (`[attr.fill]`, `[attr.stroke]`) aus Komponenten-Feldern oder `computed`; reine Zeichenfunktionen und der Canvas-Renderer lesen die Palette direkt.
- UI-Farben (Text, Flächen, Knöpfe, HUD) bleiben Tokens in `src/styles.css`. Eine Farbe, die zufällig in beiden vorkommt, steht in beiden; die Palette verweist nicht auf Tokens.
- Komponenten-CSS bleibt ohne Hex-Werte. Farben aus CSS-Regeln des Prototyps (z. B. `.dend`, `.m-label`) wandern in die Palette und werden im Template gebunden.

## Konsequenzen

- Die Kontrastregel ≥ 4,5:1 gilt für UI-Text, nicht für Illustrationen. Beschriftungen in SVG-Kunst (Karte, Neuron) übernehmen die Farben des Prototyps.
- Sichtung und Kalibrierung ändern Kunstfarben an einer Stelle, in der Palette.
- Dark Mode oder Themes erreichen die Illustrationen nicht über Tokens; das wäre eine eigene Entscheidung.

## Verworfene Alternativen

- **Ein Token je Kunstfarbe in `src/styles.css`:** rund 150 zusätzliche Variablen ohne Utility-Nutzung; der Canvas müsste sie zur Laufzeit per `getComputedStyle` auslesen.
- **Hex-Werte direkt in Templates und Zeichenfunktionen:** verstreut, schwer zu kalibrieren und ein Verstoß gegen §4 ohne gemeinsame Quelle.
