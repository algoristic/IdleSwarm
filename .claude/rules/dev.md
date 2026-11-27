---
paths:
  - 'src/app/dev/**'
  - 'src/app/dev-routes*.ts'
---

# dev

Werkzeuge nur für den Dev-Build. Richtung `dev → game → shared` (ESLint, auch in Specs); `game` und `shared` importieren nichts aus `dev`.

## Dateiersetzung (App-Wurzel)

- `src/app/dev-routes.ts` exportiert `appDevRoutes = []`; `app.routes.ts` setzt sie vor die Spielroute.
- Die Build-Konfigurationen `development` (`npm start`) und `pages` (GitHub Pages, `npm run build:pages`) ersetzen die Datei per `fileReplacements` durch `src/app/dev-routes.dev.ts`: eine lazy Route `path: 'katalog'` auf `@app/dev/feature/dev.routes` (`devRoutes`).
- `production` ersetzt nichts; die Dev-Domäne fehlt dort ganz.
- Der Router lädt den Dev-Chunk erst bei der Navigation nach `/katalog`. Eine lazy Route `''` vor der Spielroute verhinderte, dass `/` die Spielroute erreicht (das Spiel blieb im Dev-Build leer); deshalb liegt die Dev-Route unter `katalog`.

## Katalog

Zeigt alle Assets aus `game/ui` (`.claude/rules/game.md`, Asset-Bibliothek) und die Elemente aus `shared/ui` mit echten Komponenten und Renderern.

Routen und Seiten (`feature`):

- `devRoutes` (relativ zu `katalog`): `''` (`pathMatch: 'full'`) → `CatalogPage` und `:entryId` → `CatalogEntryPage` mit `canActivate: [catalogEntryGuard()]`.
- `catalogEntryGuard()` (`state/dev.guards.ts`): unbekannte IDs leiten per `RedirectCommand` mit `replaceUrl` auf `/katalog`.
- `CatalogPage`: Suche als Signal Form (`searchModel`/`searchForm`, `CatalogSearchModel` in `catalog.model.ts`) und Liste `app-catalog-list` der Treffer je Kategorie.
- `CatalogEntryPage`: Eintrag aus `entryId`, Vorgänger und Nachfolger, Regler (`controlsModel` als `linkedSignal`, beim Eintragswechsel auf `CATALOG_DEFAULT_CONTROLS` zurück, ausgewertet mit `parseCatalogControls`) und die Vorschau nach `preview`. Lokaler Zustand für Dialog, Blatt, Toasts und Segment der `shared/ui`-Vorschau; wie `controlsModel` ein `linkedSignal` mit dem Eintrag als `source`, damit er beim Wechsel von `:entryId` (die Seite wird wiederverwendet) zurückgesetzt wird.
- Bewusste Ausnahme zu CLAUDE.md §6: `CatalogEntryPage` injiziert das Token `GAME_CONFIG` aus `game/data-access` direkt (nur das Config-Token, kein Store und kein Dienst), damit spätere Kalibrier-Überschreibungen auch im Katalog wirken.

Logik (`domain`):

- `models/catalog.model.ts`: `CATALOG_CATEGORY_IDS` (`units`, `swarm`, `sites`, `finds`, `backdrops`, `travel`, `neuron`, `ui`), `CATALOG_ENTRY_IDS` (gleich den Pfaden der Deep-Links, z. B. `swarm-canvas`, `map-site`, `neuron-pair`, `pipes`), `CATALOG_CONTROL_IDS`, `CATALOG_PREVIEW_KINDS` (`art`, `map`, `neuron`, `shared`), `CatalogEntry`, `CatalogControlsModel` (Strings, `level` als Zahl), `CatalogControls` (ausgewertet, Auswahlen als `CatalogChoice<K>`).
- `data/catalog.data.ts`: `CATALOG_ENTRIES` (Kategorie, Vorschau, Regler je Eintrag), `CATALOG_CHOICE_OPTIONS` (`as const`; `CatalogChoice<K>` ist der Typ der Optionen eines Reglers), `CATALOG_LEVEL_MAX` = 18, `CATALOG_DEFAULT_CONTROLS` (`CatalogDefaultControls`).
- Die Optionen spiegeln Werte aus `game/ui` (Kartenzone, Hervorhebungen, Ton der Soma, Ketten-Einheit, Hintergrundart), die `domain` nicht importieren darf. Abgesichert in beide Richtungen: Die Input-Bindungen der Vorschauen verlangen gültige game-Werte, und je Vorschau prüft eine Typkonstante `_OPTIONS_COVER_GAME`, dass jeder game-Wert eine Option hat. Ein neuer Wert in `game/ui` ist so ein Typfehler im Katalog.
- `catalog-logic.ts`: `isCatalogEntryId`, `catalogEntry`, `catalogNeighbours`, `searchCatalog` (Name oder Kategorie, ohne Groß- und Kleinschreibung), `unitsForLevel` (Einheiten je Stufe logarithmisch), `parseLevel` (begrenzt, sonst Standard), `parseCatalogControls` (unbekannte Werte → Standard, ohne Cast).

Regler: Stufe (Einheiten), Stellentyp, Hintergrund, Zone, Ferne, Richtung, Form-Seed, Füllstand, Kartenzone, Hervorhebung von Stelle und Fundstück, ausgetrocknet, hier, Ketten-Einheit, Zustand von Ausbau- und Ketten-Knoten, Rang, Ton der Soma, Ketten-Neuron, Bewegung.

Bausteine (`ui`):

- Vorschauen `app-catalog-art-preview` (Einheiten, Schwarm-Canvas an der Stelle und auf der Reise, Szene, Hintergründe), `app-catalog-map-preview`, `app-catalog-neuron-preview` (Beispiel-Viewmodels in `catalog-neuron-preview.utils.ts`), `app-catalog-shared-preview`.
- `app-catalog-stage`: skaliert eine Vorschau fester Größe auf die verfügbare Breite (`ResizeObserver` über `DOCUMENT.defaultView`, Aufräumen über `DestroyRef`; `stageLayout` in `catalog-stage.utils.ts`).
- `app-catalog-list`, `app-form-catalog-controls` (`controlsModel` per `model()`, Zeilen je Regler), `app-form-choice` (`FormValueControl<string>` über `app-segment`).
- Texte in `ui/texts/catalog-texts.ts`: `CATALOG_CATEGORY_NAMES`, `CATALOG_ENTRY_NAMES`, `CATALOG_CONTROL_NAMES`, `CATALOG_OPTION_NAMES` (IDs `@@uiDev-catalogTexts-…`); Seitentexte `@@featureDev-…`.

Test-IDs `dev.catalog.*`: `title`, `search`, `empty`, `category.<id>`, `entry.<id>`, `entry.title`, `entry.category`, `back`, `previous`, `next`, `preview` (mit `data-entry`), `controls`, `control.<id>` und `control.<id>.<option>`, `control.level.input|units`, dazu IDs der Vorschauen (z. B. `mapSite`, `unit.<id>`, `site.<type>`, `button.<variant>`, `tag.<tone>`, `segment.<id>`, `toast.show|item`, `dialog.open|close`, `sheet.toggle`, `pipes.numbers|times`).

Tests:

- `domain/catalog-logic.spec.ts`: eindeutige IDs, Erkennen der IDs, Nachbarn am Rand, Suche, Einheiten je Stufe, Begrenzen der Stufe, Auswerten der Regler.
- `e2e/catalog.e2e.ts`: Kategorien, Suche, Eintrag per Link und Deep-Link, Regler ändert die Vorschau, Umleitung unbekannter IDs. Läuft nur mit `E2E_BUILD_CONFIGURATION=pages`, sonst übersprungen (der `production`-Build hat keinen Katalog). Die CI setzt den Wert aus `BUILD_CONFIGURATION` auf Job-Ebene; lokal `npm run build:pages && E2E_BUILD_CONFIGURATION=pages npx playwright test` (`npm run e2e` baut `production` und überspringt den Katalog).
