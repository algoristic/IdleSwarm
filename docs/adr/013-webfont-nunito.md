# ADR-013: Webfont Nunito selbst gehostet

**Status:** Angenommen
**Datum:** 2026-11-19

## Kontext

Das UI-Leitbild [K2-K](../mockups/k2-kurzgesagt.html) verlangt eine abgerundete, kräftige Sans-Serif ([Konzept §8.6](../technisches-konzept.md#86-grafikstil-k2-k)). Das Mockup nennt Nunito mit Systemschriften als Fallback (`"Varela Round"`, `"Segoe UI Rounded"`, `"Arial Rounded MT Bold"`, `"Trebuchet MS"`, `system-ui`). Keine dieser Systemschriften ist auf allen Geräten vorhanden; ohne Webfont sieht das HUD je nach System anders aus, auf vielen Geräten kantig statt rund. AP 1.4.3 entscheidet, ob eine Webfont eingebunden wird.

Randbedingungen: kein Backend und Hosting auf GitHub Pages ([ADR-008](008-kein-backend-github-pages.md)), Offline-Betrieb als PWA ab AP 1.5.6, keine Anfragen an Dritte ohne Not, und jede neue Laufzeitabhängigkeit braucht eine ADR.

## Entscheidung

- Das Spiel verwendet **Nunito** als variable Schrift (Achse `wght` 200–1000, nur aufrecht) und hostet sie selbst.
- Eingebunden sind nur die Subsets **latin** und **latin-ext** als woff2. Die Schriftdateien liegen unter [`src/fonts/nunito/`](../../src/fonts/nunito/) und werden nur gebündelt ausgeliefert; die Lizenz (`OFL.txt`, SIL Open Font License 1.1) liegt unter [`public/fonts/nunito/`](../../public/fonts/nunito/) und wird mit der Seite ausgeliefert.
- Quelle ist das npm-Paket `@fontsource-variable/nunito` 5.3.0 (Dateien `nunito-latin-wght-normal.woff2`, `nunito-latin-ext-wght-normal.woff2`). Die Dateien werden einmalig kopiert; das Paket ist **keine** Projektabhängigkeit. Ein Update ist ein bewusstes Ersetzen der Dateien.
- `@font-face` steht in [`src/styles.css`](../../src/styles.css) mit `font-display: swap` und `unicode-range` je Subset. Die `url()` ist relativ (`./fonts/nunito/…`); der Angular-Build bündelt die Dateien mit Hash nach `media/` und schreibt eine relative URL in die CSS, die auch unter dem Base-Href `/IdleSwarm/` stimmt.
- Der Schrift-Stack ist der des Mockups (`--font-sans` in `@theme`): `Nunito` zuerst, danach die Systemschriften als Fallback. Das Grundgewicht ist 600 wie im Mockup.

### Umsetzungsstand

**Umgesetzt** in [AP 1.4.3](../projektplan.md#m14--k2-präsentation--mobile) (erster Teil: Palette, Grundstil, Webfont): Schriftdateien unter `src/fonts/nunito/` (latin 39 KB, latin-ext 36 KB), Lizenz unter `public/fonts/nunito/OFL.txt`, `@font-face` und `--font-sans` in `src/styles.css`, `body` mit `font-sans font-semibold`.

**Offen:** Kein `<link rel="preload">`: Die gebündelten Dateien tragen einen Hash im Namen, den `index.html` nicht kennt. Die Schriftdateien liegen bewusst nicht unter `public/`, damit der Build sie nicht zusätzlich ungebündelt kopiert. Der Service Worker der PWA (AP 1.5.6) muss die Dateien aus `media/` vorab cachen.

## Konsequenzen

- Gleiches Schriftbild auf allen Geräten, ohne Anfrage an Dritte und offline nutzbar.
- Die variable Schrift deckt alle Gewichte von 200 bis 1000 mit zwei Dateien ab (zusammen rund 75 KB); geladen wird je Seite nur das Subset, dessen Zeichen vorkommen.
- `font-display: swap` zeigt zuerst die Fallback-Schrift; beim ersten Laden kann das Layout kurz springen.
- Negativ: Updates der Schrift kommen nicht automatisch, sondern durch erneutes Kopieren.
- Negativ: Kursive Schnitte fehlen; `italic` wird vom Browser schräg gestellt.

## Verworfene Alternativen

- **Nur Systemschriften:** keine zusätzlichen Bytes, aber auf vielen Geräten keine runde Schrift; das Leitbild wäre nicht erreichbar.
- **`@fontsource-variable/nunito` als npm-Abhängigkeit:** bequemere Updates, aber eine weitere Abhängigkeit (mit ADR- und Versionspflege) für zwei statische Dateien.
- **Google-Fonts-CDN:** jede Seitenansicht ginge an einen Dritten (Datenschutz, IP-Adresse an Google), und offline bzw. als PWA wäre die Schrift nicht verlässlich verfügbar.
