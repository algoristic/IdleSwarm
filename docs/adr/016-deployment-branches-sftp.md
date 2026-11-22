# ADR-016: Branch-Modell mit zwei Rollouts (Pages für `development`, Server per SFTP für `main`)

**Status:** Angenommen
**Datum:** 2026-11-22

## Kontext

Bisher lief alles auf `main`: Jeder Push wurde geprüft, ein Push auf `main` ging auf GitHub Pages ([ADR-008](008-kein-backend-github-pages.md)). Künftig wird auf Feature-Branches gearbeitet, ein Teststand liegt auf `development`, und `main` ist der Stand für Spieler auf einem eigenen Server. Der Server ist ein Apache mit SFTP-Zugang (Anmeldung per Passwort) und liefert das Spiel unter demselben Pfad `/IdleSwarm/` aus wie GitHub Pages.

## Entscheidung

- **Branches:**
  - Feature-Branches → Pull Request (nach `development`): Prüfung ohne Rollout.
  - `development` → Push: Prüfung, dann Rollout auf **GitHub Pages**.
  - `main` → Push (Merge aus `development`): Prüfung, dann Rollout per **SFTP** auf den Server.
- **Ein Workflow, ein Build** ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)): Trigger sind `push` auf `main` und `development`, `pull_request` und `workflow_dispatch`. Pushes auf Feature-Branches ohne Pull Request lösen keinen Lauf aus (keine Doppelläufe). Der Job `verify` (Lint, Format, Unit-Tests mit Abdeckung, Build mit `--base-href /IdleSwarm/`, E2E) läuft in jedem Fall vollständig; weil beide Ziele denselben Base-Href nutzen, wird genau der geprüfte Build ausgeliefert.
- **Rollout-Jobs** hängen an `verify`:
  - `deploy-pages` (nur Push auf `development`): `actions/upload-pages-artifact` und `actions/deploy-pages` wie bisher, Environment `github-pages`.
  - `deploy-server` (nur Push auf `main`): Build als Artefakt `web` aus `verify`, dazu [`deploy/apache/.htaccess`](../../deploy/apache/.htaccess); Upload mit **lftp** über `sftp://`, Environment `production`. lftp kommt per `apt-get` auf den Runner; es ist ein CI-Werkzeug, keine Abhängigkeit des Projekts.
- **Upload-Reihenfolge:** Erst `mirror --reverse --delete` ohne `index.html` und `ngsw.json` (neue gehashte Bundles kommen an, veraltete verschwinden), danach `index.html` und `ngsw.json`. So verweisen Seite und Service Worker ([ADR-015](015-pwa-service-worker.md)) nie auf Dateien, die noch fehlen.
- **Secrets** (im Environment `production` oder im Repository): `SFTP_HOST`, `SFTP_PORT` (leer = 22), `SFTP_USER`, `SFTP_PASSWORD`, `SFTP_PATH` (Zielverzeichnis, nur für das Spiel, weil `--delete` dort Fremdes löscht), optional `SFTP_KNOWN_HOSTS` (Ausgabe von `ssh-keyscan -p <port> <host>`). Fehlt `SFTP_KNOWN_HOSTS`, übernimmt der Lauf den Host-Schlüssel per `ssh-keyscan` und warnt. Das Passwort gelangt nur über die Umgebungsvariable `LFTP_PASSWORD` an lftp, nie in die Kommandozeile.
- **Apache** ([`deploy/apache/.htaccess`](../../deploy/apache/.htaccess)): SPA-Fallback per `mod_rewrite` (vorhandene Dateien direkt, sonst `index.html`, `RewriteBase /IdleSwarm/`); `Cache-Control: no-cache` für `index.html`, `ngsw.json`, die Service-Worker-Skripte und das Manifest, ein Jahr `immutable` für Dateien mit Hash im Namen; MIME-Typ für `.webmanifest`. Auf GitHub Pages bleibt `404.html` der Fallback.

### Umsetzungsstand

**Umgesetzt:** Workflow mit Jobs `verify`, `deploy-pages` und `deploy-server`, `deploy/apache/.htaccess`.

**Offen (manuell in GitHub):** Branch `development` anlegen; im Environment `github-pages` die Deployment-Branch-Regel auf `development` umstellen; Environment `production` mit den SFTP-Secrets anlegen; optional Branch-Schutz für `main` und `development` mit Pflicht-Check „Lint, Test, Build“. Der erste Rollout auf den Server ist noch nicht geprüft.

## Konsequenzen

- Spieler sehen nur Stände, die über `development` gelaufen sind; Pages dient als Teststand.
- Ein Build für beide Ziele: Was der E2E-Smoke geprüft hat, wird ausgeliefert.
- Negativ: Pull Requests von Feature-Branches brauchen den vollen Lauf mit E2E (einige Minuten).
- Negativ: Der Upload ist nicht atomar; zwischen den beiden Schritten liefert der Server kurz die alte `index.html` mit neuen Dateien daneben, was durch die Reihenfolge unschädlich ist.
- Negativ: Passwort-Anmeldung und optionaler Host-Schlüssel sind schwächer als ein SSH-Schlüssel mit festem `known_hosts`.

## Verworfene Alternativen

- **Zwei Builds mit verschiedenem Base-Href:** unnötig, solange beide Ziele `/IdleSwarm/` nutzen.
- **Fertige SFTP-Actions aus dem Marketplace:** Drittcode mit Zugriff auf das Passwort; lftp aus den Ubuntu-Paketen reicht.
- **Prüfung bei jedem Push auf Feature-Branches:** doppelte Läufe neben dem Pull Request.
