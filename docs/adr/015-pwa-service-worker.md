# ADR-015: PWA mit `@angular/service-worker`

**Status:** Angenommen
**Datum:** 2026-11-21

## Kontext

[US-07.06](../produktplanung.md) verlangt ein installierbares Spiel, das auch ohne Netz startet; laut [Konzept §11](../technisches-konzept.md#11-deployment--pwa) cacht ein Service Worker das App-Shell, und neue Versionen werden beim nächsten Start aktiv, mit dem Hinweis „Neue Version verfügbar“. Das Spiel ist statisch auf GitHub Pages unter dem Pfad `/IdleSwarm/` gehostet ([ADR-008](008-kein-backend-github-pages.md)); die Webfont liegt gebündelt mit Hash unter `media/` und muss offline verfügbar sein ([ADR-013](013-webfont-nunito.md)).

Randbedingungen: jede neue Laufzeitabhängigkeit braucht eine ADR, Versionen sind exakt, Zustand läuft über Signals statt RxJS (CLAUDE.md §6), Plattformzugriffe liegen hinter Tokens (CLAUDE.md §7).

## Entscheidung

- Der Service Worker ist **`@angular/service-worker`**, exakt in der Version von `@angular/core` (22.2.6), als Laufzeitabhängigkeit. Er wird **von Hand** eingerichtet, nicht über `ng add @angular/pwa` (das Schema legt eigene Icons und Konfiguration an).
- [`ngsw-config.json`](../../ngsw-config.json):
  - Gruppe `app` (`prefetch`): `index.html`, Manifest, `favicon.ico`, alle `*.css` und `*.js` außer Web Workern, `media/*.woff2` (Nunito) und `icons/*`. Auch die Lazy Chunks werden vorab geladen: Ihre Namen tragen nur einen Hash (`chunk-*.js`), das Shell-Chunk ist für den Offline-Start nötig, und ein Chunk, der erst beim Aufruf gecacht würde, fehlte nach einem Versionswechsel offline. Das schließt das ECharts-Chunk der Modell-Seite ein (rund 190 KB übertragen, einmal je Version).
  - Gruppe `assets` (`lazy`): Web Worker (`worker-*.js`, Sim-Worker der Modell-Seite) und sonstige Bilder und Schriften, die nicht im Vorab-Cache stehen.
  - `navigationUrls` bleiben beim Standard: Jede Navigation ohne Dateiendung (`/`, `/umgebung`, `/genom`, `/modell?dev`) bekommt `index.html` aus dem Cache.
- `angular.json` setzt `serviceWorker` nur in der Konfiguration `production`. Der Build schreibt `ngsw.json` mit dem Base-Href (`/IdleSwarm/…`), daher sind in der Konfiguration nur Pfade relativ zur App-Wurzel nötig.
- `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })` in `app.config.ts`; der Pfad ist relativ und folgt dem Base-Href.
- Manifest [`public/manifest.webmanifest`](../../public/manifest.webmanifest): Name „IdleSwarm“, deutsche Beschreibung, `lang: de`, `display: standalone`, `orientation: any`, `id`, `start_url` und `scope` relativ (`./`), damit sie unter `/IdleSwarm/` stimmen. `background_color` und `theme_color` sind `#090a26` (= `--sw-bg`). Das Manifest kann keine CSS-Variablen lesen; der Wert ist hier und in `<meta name="theme-color">` fest eingetragen und muss bei einer Änderung von `--sw-bg` mitgezogen werden.
- Icons unter `public/icons/`: eigenes Motiv im K2-K-Stil (Drohne der Aktionsleiste vergrößert, mit Nahrungskugel und zwei kleinen Drohnen auf `--sw-bg-deep`, Farben aus den Tokens). Quelle ist `icon.svg` (abgerundetes Quadrat) bzw. `icon-maskable.svg` (vollflächig, Motiv innerhalb der Safe-Zone von 40 % Radius); daraus PNG 192 und 512, maskable 512, `apple-touch-icon.png` (180, vollflächig) und `favicon.ico` (16, 32, 48). SVGs, PNGs und `favicon.ico` erzeugt `node tools/make-icons.mjs public` ohne Abhängigkeit aus einer Formliste (deterministisch).
- Updates: `AppUpdateService` (`shared/data-access/app-update`) wandelt `SwUpdate.versionUpdates` sofort per `toSignal()` um; `updateReady` wird beim Ereignis `VERSION_READY` wahr und bleibt es. `SwUpdate` wird optional injiziert; ohne Service Worker (Dev-Server, Tests) bleibt `updateReady` falsch. Die `HudFacade` zeigt daraus den Hinweis `update-ready` „Neue Version verfügbar. Sie startet beim nächsten Öffnen.“ mit der Aktion „Neu laden“: Sie speichert über den `PersistenceService` und lädt über das Plattform-Token `PAGE_RELOAD` neu. Ohne Neuladen startet die neue Version beim nächsten Öffnen (der Angular-Service-Worker gibt neuen Navigationen die neueste Version).

### Umsetzungsstand

**Umgesetzt** in [AP 1.5.6](../projektplan.md#m15--idle-balancing--release): Abhängigkeit, `ngsw-config.json`, `angular.json`, `provideServiceWorker` in `app.config.ts`, Manifest und Icons unter `public/`, Tags in `src/index.html` (`manifest`, `theme-color`, `apple-touch-icon`, `apple-mobile-web-app-*`, Favicon ICO und SVG), `AppUpdateService` mit Spec, Token `PAGE_RELOAD`, Hinweis „Neue Version verfügbar“ mit „Neu laden“ in `SaveStatusComponent`. Geprüft: `ngsw.json` des Builds mit `--base-href /IdleSwarm/` enthält Schriften, Icons und Manifest, die Hash-Tabelle stimmt mit den Dateien überein; ein statischer Server liefert `ngsw-worker.js`, Manifest und Icons aus.

**Geprüft** in der Browser-Prüfung zum Abschluss von M1.5: Offline-Start, Schrift Nunito und Manifest, Konsole ohne Fehler.

**Offen:** Installation auf einem Smartphone und Lighthouse-Prüfung der Installierbarkeit. Kein regelmäßiges `checkForUpdate()`: Bleibt der Tab tagelang offen, erfährt er von einer neuen Version erst beim nächsten Start. Das Ereignis `unrecoverable` (Cache und Server passen nicht zusammen) wird nicht eigens behandelt.

## Konsequenzen

- Das Spiel startet nach dem ersten Besuch offline, mit Schrift und Icons; installierbar auf Desktop und Smartphone.
- Neue Versionen laden im Hintergrund; der Spieler entscheidet, wann er neu lädt, und verliert dabei keinen Fortschritt.
- `404.html` (Kopie von `index.html` in der CI) steht nicht in `ngsw.json`; mit Service Worker beantwortet er Navigationen ohnehin aus dem Cache.
- Negativ: Eine weitere Laufzeitabhängigkeit, die mit Angular im Gleichschritt aktualisiert werden muss.
- Negativ: Der erste Besuch lädt auch das Chunk der Modell-Seite in den Cache.
- Negativ: Farben in Manifest und `theme-color` sind Kopien des Tokens `--sw-bg`.

## Verworfene Alternativen

- **`ng add @angular/pwa`:** richtet dasselbe ein, legt aber Standard-Icons und eine Konfiguration an, die wieder angepasst werden müssten.
- **Eigener Service Worker oder Workbox:** volle Kontrolle über Caching-Strategien, aber eigener Code bzw. eine fremde Abhängigkeit; die Hash-Tabelle und das Versions-Handling von `@angular/service-worker` passen ohne Mehraufwand zum Angular-Build.
- **Lazy Chunks nur bei Bedarf cachen:** spart den Vorab-Download der Modell-Seite, aber die Chunks lassen sich nicht am Namen unterscheiden, und nach einem Versionswechsel fehlte offline das Shell-Chunk.
