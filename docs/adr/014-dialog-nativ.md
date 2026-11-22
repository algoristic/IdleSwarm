# ADR-014: Modale Dialoge mit dem nativen `<dialog>`

**Status:** Angenommen
**Datum:** 2026-11-20

## Kontext

Mit M1.5 bekommt das Spiel seine ersten modalen Dialoge: die Rückkehr-Zusammenfassung nach dem Offline-Catch-up ([US-07.03](../produktplanung.md), AP 1.5.1), danach Einstellungen und die Bestätigung beim Zurücksetzen. CLAUDE.md §3 („Dialoge“) ließ offen, welche Technik Dialoge und Overlays verwenden; zur Wahl standen das Angular CDK (`@angular/cdk/dialog`) und eine eigene Lösung.

Ein modaler Dialog braucht: Fokus beim Öffnen hinein und beim Schließen zurück, eine Fokusfalle, Esc zum Schließen, eine für Tastatur und Screenreader gesperrte Restseite, eine Ebene über allem (auch über den `fixed`-Overlays der K2-Shell mit `z-10`) und einen abgedunkelten Hintergrund. Randbedingungen: jede neue Laufzeitabhängigkeit braucht eine ADR, das Styling folgt Tailwind mit Tokens ([ADR-010](010-tailwind-tokens.md)), keine weiteren UI-Frameworks (CLAUDE.md §4).

## Entscheidung

- Modale Dialoge verwenden das **native `<dialog>`-Element mit `showModal()`**. Es gibt **keine neue Abhängigkeit**, auch nicht `@angular/cdk`.
- Der Baustein ist `ModalDialogComponent` (`shared/ui/modal-dialog`, präsentational): Input `open` (offen/geschlossen bestimmt der Aufrufer), `heading` (sichtbarer Titel, per `aria-labelledby` der Name des Dialogs), `testId`; Output `closed` bei Esc (`cancel`, mit `preventDefault`), beim Schließen-Knopf und wenn der Browser den Dialog selbst schließt. `showModal()`/`close()` ruft ein `afterRenderEffect` über `viewChild`. Der Inhalt kommt per Projektion aus einer `dialog-<name>/`-Komponente der jeweiligen Domäne; geöffnet wird im `feature`-Layer.
- Der Browser übernimmt Fokusfalle, Esc, `inert` für die übrige Seite, den Top-Layer und die Rückgabe des Fokus.
- Optik nach K2-K wie die Panels (`bg-surface`, `rounded-3xl`, `shadow-panel`); `::backdrop` und das Einblenden (`@starting-style`) stehen in `modal-dialog.component.css` über die Tokens `--sw-backdrop` und `--sw-dialog-duration`. Auf dem Smartphone (`max-md:`) ist der Dialog ein Bottom-Sheet in voller Breite mit `env(safe-area-inset-bottom)`. Bei reduzierter Bewegung (`data-motion='reduced'`) blendet er nur kurz über.
- Die **Schubladen** der Szene (auf dem Smartphone Bottom-Sheets, AP 1.4.5) bleiben die eigene Lösung: Sie sind nicht modal, das Spiel bleibt daneben bedienbar.

### Umsetzungsstand

**Umgesetzt** in [AP 1.5.1](../projektplan.md#m15--idle-balancing--release): `ModalDialogComponent` mit Spec (Öffnen/Schließen nach `open`, Esc und Schließen-Knopf melden `closed`), Tokens in `src/styles.css`, Rückkehr-Zusammenfassung (`hud/feature/return-summary`, Inhalt `hud/ui/dialog-return-summary`) in allen Modi der Shell. Die `ShellInputDirective` ignoriert Tasten, solange ein `dialog[open]` existiert (Esc schließt dann nur den Dialog); der Dialog steht außerhalb von `<main>`, damit das Mausrad im Dialog die Shell nicht erreicht.

**Umgesetzt** in AP 1.5.2/1.5.3: Dialog „Einstellungen“ (`settings/feature/settings-dialog`, Inhalt `settings/ui/dialog-settings`). Er bleibt im DOM und schließt über `open`, damit `close()` den Fokus an den Zahnrad-Knopf zurückgibt; die Bestätigungen für Import und Zurücksetzen sind Ansichten im selben Dialog statt eines zweiten Dialogs.

**Umgesetzt** nach der Browser-Prüfung von M1.5: Titelzeile und Aktionen stehen fest, nur der Inhalt dazwischen scrollt (`<dialog>` mit `open:flex`, Scrollbereich `<testId>.body`). Aktionen kommen über den Projektions-Slot `[dialogActions]` in die Fußleiste `<testId>.actions` (ohne Aktionen fällt sie weg): „Weiter“ der Rückkehr-Zusammenfassung (`hud/ui/dialog-return-summary-actions`), Zurück, Bestätigen und Abbrechen der Einstellungs-Ansichten (`settings/ui/dialog-settings-actions`, die Übersicht hat keine). So bleiben sie auch im Querformat (844 × 390, 740 × 360) ohne Scrollen erreichbar. Nach dem Quittieren der Rückkehr-Zusammenfassung setzt die Shell den Fokus auf den Titel des Modus (`acknowledgedSummary`), weil der Dialog beim Laden ohne vorher fokussiertes Element öffnet.

**Offen:** Kein Ausblenden beim Schließen (die Rückkehr-Zusammenfassung entfernt ihren Inhalt sofort).

## Konsequenzen

- Keine zusätzliche Abhängigkeit und kein Bundle-Zuwachs; Barrierearmut kommt vom Browser statt aus eigenem Code.
- Der Top-Layer liegt über jedem `z-index`; Overlays der Shell müssen nicht angepasst werden.
- Der Dialog ist zustandsgesteuert: Esc schließt nicht selbst, sondern meldet `closed`; so kann ein Aufrufer (etwa eine Bestätigung) das Schließen verhindern. Nimmt der Browser Esc ohne vorherige Eingabe nicht als abbrechbar an (Close Watcher), schließt er selbst, und der Dialog meldet es nachträglich.
- Tastenkürzel, die am Dokument lauschen, müssen offene Dialoge selbst beachten (wie die Shell).
- Negativ: jsdom kennt `showModal()` nicht; Specs bilden es nach.
- Negativ: Ausblend-Animationen beim Schließen bräuchten `transition-behavior: allow-discrete` und einen Inhalt, der bis zum Ende bleibt; das fehlt bewusst.

## Verworfene Alternativen

- **Angular CDK (`@angular/cdk/dialog`):** ausgereift (Fokusfalle, Overlay, Scroll-Sperre), aber eine neue Abhängigkeit für Dinge, die der Browser inzwischen selbst kann; das CDK-Overlay liegt zudem im normalen Stapel und konkurriert mit den `z-10`-Overlays der Shell.
- **Eigener Dialog aus `div`s:** volle Kontrolle, aber Fokusfalle, `inert`, Esc und Fokus-Rückgabe müssten selbst gebaut und getestet werden.
