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

- `devRoutes` (relativ zu `katalog`): Layout-Route `''` → `CatalogPage` mit den Kindern `''` (`pathMatch: 'full'`, `redirectTo` auf `CATALOG_ENTRY_IDS[0]`) und `:entryId` → `CatalogEntryPage` mit `canActivate: [catalogEntryGuard()]`. Eine eigene Übersichtsseite gibt es nicht.
- `catalogEntryGuard()` (`state/dev.guards.ts`): unbekannte IDs leiten per `RedirectCommand` mit `replaceUrl` auf `/katalog`, von dort auf den ersten Eintrag.
- `CatalogPage`: Sidebar wie bei Storybook mit Titel, Suche als Signal Form (`searchModel`/`searchForm`, `CatalogSearchModel` in `catalog.model.ts`) und `app-catalog-list` der Treffer je Kategorie; daneben `<main>` mit `<router-outlet />`. Ab `lg` steht die Sidebar fest links (`lg:sticky lg:h-dvh`). Darunter ist sie eingeklappt: Die Kopfzeile mit „Einträge“ öffnet sie als Schublade (`menuOpen`, Klassen als `computed`-Mapping mit vollständigen Namen, weil Tailwind `[hidden]` mit `!important` setzt). Schließen über den Abdunkler, Escape (Host-Listener `document:keydown.escape`) oder die Wahl eines Eintrags.
- `CatalogEntryPage`: Eintrag aus `entryId`, Vorgänger und Nachfolger, Regler (`controlsModel` als `linkedSignal`, beim Eintragswechsel auf `CATALOG_DEFAULT_CONTROLS` zurück, ausgewertet mit `parseCatalogControls`) und die Vorschau nach `preview`. Vorschau und Regler stehen erst ab `xl` nebeneinander. Lokaler Zustand für Dialog, Blatt, Toasts und Segment der `shared/ui`-Vorschau; wie `controlsModel` ein `linkedSignal` mit dem Eintrag als `source`, damit er beim Wechsel von `:entryId` (die Seite wird wiederverwendet) zurückgesetzt wird.
- Bewusste Ausnahme zu `.claude/rules/components.md` (Zugriff nur über Facades): `CatalogEntryPage` injiziert das Token `GAME_CONFIG` aus `game/data-access` direkt (nur das Config-Token, kein Store und kein Dienst), damit spätere Kalibrier-Überschreibungen auch im Katalog wirken.

Logik (`domain`):

- `models/catalog.model.ts`: `CATALOG_CATEGORY_IDS` (`units`, `swarm`, `sites`, `finds`, `backdrops`, `travel`, `neuron`, `ui`), `CATALOG_ENTRY_IDS` (gleich den Pfaden der Deep-Links, z. B. `swarm-canvas`, `map-site`, `backdrop-stack`, `neuron-pair`, `pipes`), `CATALOG_CONTROL_IDS`, `CATALOG_PREVIEW_KINDS` (`art`, `map`, `neuron`, `shared`, `parallax`), `CatalogEntry` (optional `parent`: Eintrag steht in der Sidebar eingerückt unter diesem), `CatalogControlsModel` (Strings, `level` als Zahl), `CatalogControls` (ausgewertet, Auswahlen als `CatalogChoice<K>`).
- `data/catalog.data.ts`: `CATALOG_ENTRIES` (Kategorie, Vorschau, Regler je Eintrag), `CATALOG_CHOICE_OPTIONS` (`as const`; `CatalogChoice<K>` ist der Typ der Optionen eines Reglers), `CATALOG_LEVEL_MAX` = 18, `CATALOG_DEFAULT_CONTROLS` (`CatalogDefaultControls`).
- Die Optionen spiegeln Werte aus `game/ui` (Kartenzone, Hervorhebungen, Ton der Soma, Ketten-Einheit, Hintergrundart), die `domain` nicht importieren darf. Abgesichert in beide Richtungen: Die Input-Bindungen der Vorschauen verlangen gültige game-Werte, und je Vorschau prüft eine Typkonstante `_OPTIONS_COVER_GAME`, dass jeder game-Wert eine Option hat. Ein neuer Wert in `game/ui` ist so ein Typfehler im Katalog.
- `catalog-logic.ts`: `isCatalogEntryId`, `catalogEntry`, `catalogNeighbours`, `searchCatalog` (Name oder Kategorie, ohne Groß- und Kleinschreibung), `catalogChildEntries` (je ID, ob sie einen `parent` hat; die Einrückung bleibt auch bei Treffern ohne den Elterneintrag), `unitsForLevel` (Einheiten je Stufe logarithmisch), `parseLevel` (begrenzt, sonst Standard), `parseCatalogControls` (unbekannte Werte → Standard, ohne Cast).

Regler: Stufe (Einheiten), Stellentyp, Hintergrund, Zone, Ferne, Richtung, Form-Seed, Füllstand, Kartenzone, Hervorhebung von Stelle und Fundstück, ausgetrocknet, hier, Ketten-Einheit, Zustand von Ausbau- und Ketten-Knoten, Rang, Ton der Soma, Ketten-Neuron, Bewegung, Weichzeichner (`blur`).

Bausteine (`ui`):

- Vorschauen `app-catalog-art-preview` (Einheiten, Schwarm-Canvas an der Stelle und auf der Reise, Szene, Hintergründe), `app-catalog-map-preview`, `app-catalog-neuron-preview` (Beispiel-Viewmodels in `catalog-neuron-preview.utils.ts`), `app-catalog-shared-preview`.
- Eintrag `unit-sprite` (Regler `motion`): alle Einheiten aus `g[app-unit-sprite]`, darunter je eine Gruppe „Fressling-Varianten (Pantoffeltierchen)“ und „Brutling-Varianten (Amöbe)“ (`UNIT_VARIANT_TITLES` in `catalog-texts.ts`) mit allen 5 Varianten (`PARAMECIUM_VARIANT_COUNT`, `AMOEBA_VARIANT_COUNT`) je voll und reduziert (`SPRITE_DETAILS`).
- Eintrag `eater-designs` „Einheiten-Entwürfe“ (Kategorie `units`, Regler `zone` und `motion`, `parent: 'unit-sprite'`): alle Entwürfe aus `g[app-eater-design]` ohne die gewählten (die zeigt `unit-sprite`), je groß und als Schwarmprobe in Spielgröße (12 Figuren aus `SWARM_PROBE_FIGURES` in `catalog-art-preview.utils.ts`, `app-catalog-stage` 120 × 72 mit `maxScale` 1) auf `ZONE_MOODS[zone].deep`. Namen `EATER_DESIGN_NAMES` in `catalog-texts.ts`.
- `app-catalog-parallax-preview` (Eintrag `backdrop-stack`, Regler Zone und Weichzeichner): Ferne, Dunst und Karte (Wasser, drei Stellen, aktuelle Stelle) gestapelt wie in der Kartenansicht des Prototyps, in `app-catalog-stage` 640 × 640 (Rahmen `max-w-160`). Ziehen per Pointer-Ereignissen verschiebt die Ebenen mit Parallaxe; „Mitte“ setzt zurück. Reine Werte in `catalog-parallax-preview.utils.ts`: `clampPan` (Kreis mit `REACH_PX` wie `setPan`) und `parallaxLayers(pan, blur)` (Ferne ×0,35 `scale(1.15)` `blur(4px) brightness(0.95)`, Dunst ×0,65 `scale(1.05)` `blur(1.5px)`, Karte ×1; ohne Weichzeichner entfällt nur der Blur wie `.no-blur`). Während des Ziehens ohne Transition.
- `app-catalog-stage`: skaliert eine Vorschau fester Größe auf die verfügbare Breite (`ResizeObserver` über `DOCUMENT.defaultView`, Aufräumen über `DestroyRef`; `stageLayout` in `catalog-stage.utils.ts`).
- `app-catalog-list` (senkrechte Liste der Sidebar, Einträge mit `parent` eingerückt über `[class.pl-7]` und `text-xs`, aktiver Eintrag über `routerLinkActive` mit `aria-current`, Output `selectedEntry`), `app-form-catalog-controls` (`controlsModel` per `model()`, Zeilen je Regler), `app-form-choice` (`FormValueControl<string>` über `app-segment`).
- Texte in `ui/texts/catalog-texts.ts`: `CATALOG_CATEGORY_NAMES`, `CATALOG_ENTRY_NAMES`, `CATALOG_CONTROL_NAMES`, `CATALOG_OPTION_NAMES` (IDs `@@uiDev-catalogTexts-…`); Seitentexte `@@featureDev-…`.

Test-IDs `dev.catalog.*`: `title`, `search`, `empty`, `sidebar`, `menu`, `menu.close`, `category.<id>`, `entry.<id>`, `entry.title`, `entry.category`, `previous`, `next`, `preview` (mit `data-entry`), `controls`, `control.<id>` und `control.<id>.<option>`, `control.level.input|units`, dazu IDs der Vorschauen (z. B. `mapSite`, `unit.<id>`, `site.<type>`, `button.<variant>`, `tag.<tone>`, `segment.<id>`, `toast.show|item`, `dialog.open|close|confirm`, `sheet.toggle`, `pipes.numbers|times`, `parallax.frame|far|haze|map|reset`, `eaterDesign.<id>`, `unitVariant.<unit>.<n>.full|reduced`).

Tests:

- `domain/catalog-logic.spec.ts`: eindeutige IDs, Erkennen der IDs, Nachbarn am Rand, Suche, Einheiten je Stufe, Begrenzen der Stufe, Auswerten der Regler.
- `ui/catalog-parallax-preview/catalog-parallax-preview.utils.spec.ts`: Begrenzen der Verschiebung, Ebenen mit und ohne Weichzeichner.
- `e2e/catalog.e2e.ts`: Umleitung auf den ersten Eintrag, Kategorien in der Sidebar, Suche, Eintrag über die Sidebar (`aria-current`) und per Deep-Link, Schublade mobil (zu, auf, Abdunkler, Escape, Wahl schließt), Regler ändert die Vorschau, Name „Einheiten-Entwürfe“ in der Sidebar, Varianten von Fressling und Brutling (voll und reduziert sichtbar, Bewegung aus entfernt die Animationselemente), Mini-Schwarm mit gleitenden Fresslingen (`animateMotion`) und kriechenden Brutlingen (`animateTransform`), Bewegung aus entfernt sie, Einheiten-Entwürfe (alle sichtbar und animiert, Bewegung aus entfernt alle Animationselemente), Ziehen und Weichzeichner im Ebenenstapel, Umleitung unbekannter IDs. Läuft nur mit `E2E_BUILD_CONFIGURATION=pages`, sonst übersprungen (der `production`-Build hat keinen Katalog). Die CI setzt den Wert aus `BUILD_CONFIGURATION` auf Job-Ebene; lokal `npm run build:pages && E2E_BUILD_CONFIGURATION=pages npx playwright test` (`npm run e2e` baut `production` und überspringt den Katalog).
