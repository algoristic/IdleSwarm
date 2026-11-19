---
name: orchestrate
description: >-
  Bearbeitet eine komplexe Aufgabe als Orchestrator: Aufgabe sichten, alle offenen Punkte vorab mit dem
  Nutzer klären, in Teilaufgaben zerlegen, die Umsetzung an Sub-Agents (Opus, effort medium) delegieren,
  Ergebnisse prüfen und selbstständig committen (ohne Push), am Ende ein Abschlussbericht.
  Nur auf ausdrücklichen Aufruf mit /orchestrate <Aufgabe>; vorher /effort high setzen und Auto-Modus nutzen.
argument-hint: <Aufgabe, z. B. „Setze AP 1.1.3 aus docs/projektplan.md um“>
disable-model-invocation: true
model: opus
effort: high
---

# Orchestrator

Du bist der Orchestrator für diese Aufgabe:

$ARGUMENTS

Du planst, klärst, delegierst, prüfst und committest. Die eigentliche Umsetzung (Code, Tests, Doku)
machen Sub-Agents. Halte deinen eigenen Kontext schlank: lies selbst, was du zum Planen und Prüfen
brauchst, aber schreibe keinen nennenswerten Code selbst.

## Voraussetzungen

- **Effort:** `model`/`effort` aus dem Frontmatter gelten nur für den ersten Turn. Jede Rückmeldung eines
  Sub-Agents startet einen neuen Turn mit der Session-Einstellung. Der Nutzer setzt deshalb vor dem Aufruf
  `/effort high` (danach wieder zurück). Erinnere beim Plan-Schritt in Phase 1 daran.
- **Berechtigungen:** Die autonome Phase braucht den Auto-Modus (oder passende Allow-Regeln), sonst hält
  jeder Berechtigungs-Prompt den Lauf an. Ist kein Auto-Modus aktiv, weise beim „Los“ darauf hin.
- **Node:** Gibt es im Repository eine `.nvmrc`, beginnt jeder `npm`-, `npx`- und `ng`-Befehl mit
  `source ~/.nvm/nvm.sh && nvm use >/dev/null && …`, weil jeder Bash-Aufruf eine neue Shell mit dem
  Default-Node startet. Das gilt dann für dich und gehört in jeden Agent-Brief.
- **Projektstand:** Solange es noch kein Angular-Projekt gibt (vor AP 1.0.1), entfallen alle Prüfungen
  über `npm`/`ng`. Nach dem Anlegen gelten die Skripte aus `package.json` und die CI-Gates aus dem
  technischen Konzept §10.

## Befugnisse

Der Aufruf dieses Skills ist die ausdrückliche Erlaubnis des Nutzers:

- **Commits:** Du darfst die Arbeitsergebnisse dieser Aufgabe selbstständig stagen und committen. Das geht
  der Regel „nichts stagen oder committen“ aus der CLAUDE.md für diese Aufgabe vor. Committe
  ausschließlich Änderungen, die im Rahmen dieser Aufgabe entstanden sind.
- **Entscheidungen:** Nach der Klärungsphase entscheidest du Fragen, die während der Umsetzung auftauchen,
  selbst (auch Fragen der Sub-Agents) und protokollierst sie für den Bericht. Ausnahme: PO-Themen (unten).

Nicht erlaubt, auch nicht implizit: `git push`, `--amend`, `--no-verify`, `git reset --hard`, `git stash`,
`git checkout`/`git restore` auf fremde Änderungen, Force-Operationen, Branch-Wechsel, Änderungen außerhalb
des Repositories, Veröffentlichungen nach außen (Deployments, Releases, Artifacts, PRs, Issues).

### PO-Themen

Diese Punkte sind dem Nutzer als Product Owner vorbehalten:

- Game-Design-Entscheidungen, die in `docs/projektplan.md` §3.4 noch als „Vorschlag“ stehen, und die
  Entscheidungspunkte späterer Ausbaustufen (§4),
- Formeln, Startwerte und Kostenkurven, sobald sie in `docs/game-design.md` festgelegt sind,
- Pacing-Zielbänder (projektplan §3.5, `core/balance/targets.ts`) und die Balancing-Snapshots
  (technisches Konzept §5.6): nicht weiten, nicht stillschweigend aktualisieren,
- Save-Format: Versionssprung, Migrationen, Umbenennen oder Entfernen stabiler IDs in `core/data/`
  (technisches Konzept §3.4, §7),
- neue Laufzeit-Abhängigkeiten oder Abweichungen vom Stack und den ADRs (technisches Konzept §2, §12),
- Änderungen an Abnahmekriterien (Meilenstein-Ergebnis in projektplan §3.2, User Stories in
  `docs/produktplanung.md`) oder am Umfang eines AP, auch das Aufteilen eines AP.

Such in Phase 1 aktiv danach und kläre sie dort. Tauchen sie erst während der Umsetzung auf, nimm den
konservativen Weg: nichts festschreiben, keine Zielbänder weiten, keine neue Abhängigkeit, Snapshots und
Save-Version nicht stillschweigend anpassen. Arbeite am Rest weiter und führe den Punkt im Bericht unter
„Für dich zu entscheiden“ auf. Sub-Agents melden solche Punkte, statt sie zu entscheiden.

## Phase 1: Sichten und klären (mit dem Nutzer)

1. **Ausgangszustand:** `git status` und `git log --oneline -5`. Gibt es bereits uncommittete Änderungen,
   frag in der Klärungsrunde, wie damit umzugehen ist; committe sie nie ungefragt mit.
2. **Aufgabe verstehen:** Lies die CLAUDE.md, die betroffenen Abschnitte aus `docs/projektplan.md`,
   `docs/produktplanung.md` (User Stories mit Akzeptanzkriterien), `docs/technisches-konzept.md`,
   gegebenenfalls `docs/game-design.md` und `docs/adr/`, das UI-Leitbild `docs/mockups/k2-kurzgesagt.html` (Ebenen und Bedienung aus `k2-zoom.html`) bei
   UI-Aufgaben und den betroffenen Code. Für breite Suchen darfst du `Explore`-Agents einsetzen.
   Ist die Aufgabe ein Arbeitspaket aus `docs/projektplan.md` §3.3: Sind die Abhängigkeiten erledigt
   (Meilenstein-Reihenfolge §3.2)? Welche Entscheidungen aus §3.4 betrifft es? Welche Tests verlangen die
   Definition of Done (§6) und die Qualitätssicherung (technisches Konzept §10)? Muss die Modell-Seite
   ergänzt werden?
3. **Klären:** Sammle **alles**, was für die Umsetzung offen ist (fachliche Fragen, Lücken oder
   Widersprüche in den Dokumenten, PO-Themen, Scope-Grenzen, ein zu großes AP, Umgang mit
   Vorab-Änderungen) und kläre es mit `AskUserQuestion`, gebündelt in möglichst wenigen Runden, jeweils
   mit deiner Empfehlung als erster Option. Frag nichts, was du aus Code, Dokumenten oder vernünftigen
   Defaults selbst beantworten kannst.
4. **Plan vorlegen:** Zeig den Plan kurz im Chat: Teilaufgaben mit Ziel und Dateien, Reihenfolge und
   Abhängigkeiten, was parallel läuft, geplante Commits, Prüfungen. Erinnere an `/effort high` und den
   Auto-Modus. Hol dir mit einer letzten `AskUserQuestion` das „Los“ (Optionen: „Los“, „Plan anpassen“).
   Bei „Plan anpassen“ den Plan überarbeiten und Schritt 4 wiederholen. Ab dem „Los“ arbeitest du ohne
   Rückfragen.

## Phase 2: Umsetzen (autonom)

### Arbeitsprotokoll

Lege zu Beginn im Scratchpad-Verzeichnis der Session eine Datei `orchestrate-log.md` an und halte sie
aktuell: Plan, Status je Teilaufgabe, laufende Agents, Commits, Entscheidungen (Frage, Entscheidung,
Begründung), PO-Themen, Abweichungen und offene Punkte. Sie übersteht eine Kontext-Zusammenfassung und
neue Turns und ist die Quelle für den Abschlussbericht. Lies sie nach jeder Benachrichtigung, wenn du
den Faden verloren hast.

### Zuschnitt der Teilaufgaben

- Eine Teilaufgabe ist eine in sich geschlossene, prüfbare Einheit, die einen sinnvollen Commit ergibt
  (z. B. Regeln und Formeln in `core/` mit Tests, dann Service in `game/`, dann Komponente in `ui/`,
  dann Modell-Seite, dann Doku).
- Standard ist **sequenziell**. Parallel nur, wenn die Teilaufgaben garantiert disjunkte Dateien ändern und
  keine von der anderen abhängt; höchstens 3 Agents gleichzeitig. Alle arbeiten im selben Working Tree.
- Querschnittsdateien bekommt pro Runde nur ein Agent: `core/state/game-state.ts`,
  `core/rules/commands.ts`, `core/balance/constants.ts`, `core/balance/targets.ts`,
  `core/data/texts.de.ts`, `core/save/` (Version, Migrationen), Routen-Dateien, `package.json` mit
  Lockfile, `angular.json`, ESLint-Konfiguration, `docs/projektplan.md`, `docs/game-design.md`.
- Nie gleichzeitig: `npm install`, Builds, volle Test-Suiten, Bot-Läufe und Balancing-Snapshots,
  Playwright (ein Browser). Parallele Agents beschränken sich auf gezielte Vitest-Specs und Lint auf ihre
  Dateien.

### Sub-Agents starten

`Agent` mit `subagent_type: "general-purpose"`, `model: "opus"`, `effort: "medium"`. Der Brief ist der
einzige Kontext des Agents; er enthält:

- **Ziel** und Abgrenzung (was ausdrücklich nicht dazugehört), **zugewiesene Dateien/Ordner**.
- **Kontext:** relevante Abschnitte der Dokumente (mit Pfad und §), betroffene User Stories, Vorbilder im
  Code, Ergebnisse vorheriger Teilaufgaben, mit dem Nutzer geklärte Entscheidungen.
- **Umgebung:** gegebenenfalls Node-Präfix (siehe Voraussetzungen). Befehle, die länger als ein paar
  Minuten laufen, mit `run_in_background` starten.
- **Regeln:**
  - CLAUDE.md des Projekts befolgen.
  - Schichtenregel aus dem technischen Konzept §3.1: `core/` ist reines TypeScript ohne Angular und
    importiert nichts aus `game/`, `ui/` oder `model/`. Zufall nur über den seeded RNG, State
    unveränderlich, abgeleitete Werte nicht im State, große Zahlen über `Num`.
  - Nur die zugewiesenen Dateien ändern; andere Änderungen im Tree stammen von anderen Agents und werden
    nie zurückgesetzt oder umformatiert. `ng lint --fix` und `prettier --write` nur auf eigene Dateien,
    nie repo-weit.
  - Kein `git add`/`commit`/`stash`/`checkout`/`restore`/`reset`.
  - Den Nutzer nicht fragen: offene Punkte mit einer vertretbaren, möglichst kleinen Annahme lösen und im
    Bericht nennen. PO-Themen (Liste oben in den Brief kopieren) nicht entscheiden, sondern melden; ist
    eine Annahme zu riskant, an der Stelle anhalten und die Frage berichten.
  - Neue Spieltexte auf Deutsch in `core/data/texts.de.ts`, verknüpft über stabile IDs (technisches
    Konzept §6); nur, wenn der Brief dem Agent diese Datei zuweist.
- **Prüfungen**, die der Agent selbst ausführt: gezielte Specs (`npx vitest run …` bzw. das Test-Skript
  aus `package.json` mit Dateifilter), Lint und Prettier auf die geänderten Dateien. Keine vollen Suiten.
- **Rückmeldung** im Format: geänderte Dateien; was umgesetzt ist; ausgeführte Prüfungen mit Ergebnis;
  getroffene Annahmen und Entscheidungen; PO-Themen; offene Fragen und bekannte Lücken.

Nach dem Start: Protokoll aktualisieren, den Turn mit einer kurzen Statuszeile beenden (welche Agents
laufen) und auf die Benachrichtigung warten. Nicht pollen, nichts selbst parallel umsetzen.

### Ergebnisse prüfen

Nach jeder Teilaufgabe, bevor du committest:

1. `git status` und `git diff` lesen. Passt die Änderung zum Auftrag, zu den Dokumenten und zu den
   CLAUDE.md-Regeln? Gibt es Änderungen außerhalb des Auftrags?
2. Prüfungen selbst laufen lassen (die gezielten Specs, Lint auf die Dateien, bei Typänderungen den
   Typecheck bzw. Build). Verlass dich nicht nur auf den Bericht des Agents. Laufen parallel noch andere
   Agents, berücksichtige, dass deren halbfertige Änderungen Prüfungen stören können.
3. Fachlich nachrechnen, wo Formeln, Balancing oder Pacing betroffen sind (Plausibilität der Werte und
   Kurven, nicht nur Doku↔Code). Wo es die Modell-Seite oder den Headless-Runner schon gibt, nutze sie.
4. Mängel gehen per `SendMessage` an denselben Agent zurück (er hat den Kontext), mit konkretem Befund.
   Nach zwei erfolglosen Runden: frischer Agent mit präziserem Brief oder neuer Zuschnitt.
   Kleinigkeiten (Tippfehler, Formatierung) darfst du selbst korrigieren.
5. Fragen des Agents beantwortest du selbst und trägst sie ins Entscheidungsprotokoll ein; PO-Themen
   behandelst du wie oben beschrieben.

### Committen

- Pro abgeschlossener, geprüfter Teilaufgabe ein Commit über den `commit`-Skill (Skill-Tool). Übergib als
  Argument die konkreten Pfade der Teilaufgabe und den Hinweis „nicht nachfragen; Zweifelhaftes (fremde
  Änderungen, Build-Ausgaben, Secrets) weglassen und melden“. Nie `git add -A`, wenn parallel noch ein
  Agent arbeitet oder fremde Änderungen im Tree liegen. Ausgelassenes kommt ins Protokoll.
- Commit-Regeln des Projekts gelten (Conventional Commits wie in den letzten Commits, AP-Nummer im
  Betreff, wenn die Aufgabe ein AP ist). Texte in `texts.de.ts` gehören in denselben Commit wie der Code,
  der sie nutzt.
- Schlägt ein Hook fehl, Ursache beheben (lassen) und neu committen; nie `--no-verify`.

## Phase 3: Abschließen

1. **Definition of Done:** Bei APs projektplan §6 vollständig abarbeiten: Code mit Tests im Core
   (Abdeckungsziel aus technischem Konzept §10), CI-Prüfungen lokal grün, Akzeptanzkriterien der Stories
   erfüllt, Modell-Seite um neue Mechaniken ergänzt (falls betroffen). Dokumente nachziehen, wo die
   Umsetzung abweicht oder sie präzisiert (`docs/technisches-konzept.md`, `docs/game-design.md`,
   `docs/adr/`). Bei UI-Änderungen die App mit `ng serve` im Hintergrund starten und im Browser prüfen
   (Desktop- und Smartphone-Viewport, technisches Konzept §8.4), oder von genau einem Agent prüfen
   lassen; danach Dev-Server stoppen und Browser schließen.
2. **Gesamtprüfung:** erst wenn kein Agent mehr Dateien ändert: die CI-Gates aus dem technischen Konzept
   §10 lokal (Lint, Unit-Tests, Build, E2E sobald vorhanden, Balancing-Snapshots sobald vorhanden), mit
   den Skripten aus `package.json`, lange Läufe mit `run_in_background`, und auf die Benachrichtigung
   warten. Fehler von Agents beheben lassen, als eigenen Commit, dann erneut prüfen.
3. Am Ende ist der Working Tree sauber bis auf das, was vorher schon da war. Ist er es nicht, sag warum.

### Abbrechen

Halte an und schreib den Abschlussbericht (bestehende Commits bleiben), wenn:

- sich die Aufgabe als grundlegend anders oder undurchführbar erweist als geklärt,
- ein Fehler auch nach zwei Korrekturrunden und einem frischen Agent nicht behebbar ist,
- der nächste Schritt eine Aktion außerhalb deiner Befugnisse bräuchte.

Unabhängige Teilaufgaben, die davon nicht betroffen sind, darfst du vorher noch abschließen.

## Abschlussbericht

Zum Schluss, auf Deutsch, im Chat:

```
## Abschlussbericht: <Aufgabe>

**Ergebnis:** <1–3 Sätze: was jetzt funktioniert, ob die Aufgabe vollständig erledigt oder abgebrochen ist>

### Commits
- `<hash>` <Betreff>
…
(Nicht gepusht. Die Gesamtprüfung wurde auf dem Stand des letzten Commits ausgeführt, nicht auf jedem.)

### Umgesetzt
<pro Teilaufgabe 1–2 Zeilen>

### Entscheidungen während der Umsetzung
| Frage | Entscheidung | Begründung |
…

### Für dich zu entscheiden
<PO-Themen mit dem gewählten konservativen Zwischenstand; oder „keine“>

### Abweichungen von Dokumenten oder Plan
<oder „keine“>

### Prüfungen
<Befehl → Ergebnis, z. B. Lint → grün; Unit-Tests → grün; Browser-Prüfung → …>

### Offene Punkte und Empfehlungen
<was nicht erledigt ist, Risiken, was der Nutzer sich ansehen sollte; oder „keine“>

Arbeitsprotokoll: <absoluter Pfad zu orchestrate-log.md>
```

Der Bericht stützt sich auf das Arbeitsprotokoll und auf `git log`, nicht auf das Gedächtnis.
Melde ehrlich, was fehlgeschlagen oder übersprungen ist.
