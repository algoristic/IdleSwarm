---
paths:
  - 'src/app/dev/**'
  - 'src/app/dev-routes*.ts'
---

# dev

Werkzeuge nur für den Dev-Build. Richtung `dev → game → shared` (ESLint, auch in Specs); `game` und `shared` importieren nichts aus `dev`.

## Dateiersetzung (App-Wurzel)

- `src/app/dev-routes.ts` exportiert `appDevRoutes = []`; `app.routes.ts` setzt sie vor die Spielroute.
- Die Build-Konfigurationen `development` (`npm start`) und `pages` (GitHub Pages, `npm run build:pages`) ersetzen die Datei per `fileReplacements` durch `src/app/dev-routes.dev.ts`: eine lazy Route `path: ''` auf `@app/dev/feature/dev.routes` (`devRoutes`).
- `production` ersetzt nichts; die Dev-Domäne fehlt dort ganz.
- Im Dev-Build lädt der Router den Dev-Chunk bei der ersten Navigation, weil die Route `''` vor der Spielroute steht.

## Seiten (`feature`)

- `devRoutes`: `katalog` → `CatalogPage` (`/katalog`), bisher nur ein Platzhalter mit Überschrift (`dev.catalog.title`). Der Katalog folgt in AP 6.
