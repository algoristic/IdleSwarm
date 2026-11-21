---
paths:
  - "src/app/onboarding/**"
---

# Onboarding

Freischaltungen und Hinweise (US-09.04, Game-Design §4.18), gespeichert im Spielstand (`GameState.onboarding`, seit Version 5). Bisher nur `domain`; welche Teile das HUD, die Zoom-Leiste und die Umgebung ausblenden und wie Hinweise erscheinen, bauen AP 1.5.2–1.5.4 in den nutzenden Domänen.

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `onboarding/domain/models/onboarding.model.ts` | `ONBOARDING_UNLOCK_IDS` (`pheromones`, `map`, `finds`, `genome`), `HINT_IDS` (`collect`, `pheromones`, `map`, `finds`, `genome`, `auto-move`), `HINT_UNLOCKS` (Hinweis → Freischaltung, `collect` → `null`, `auto-move` → `map`), `Onboarding` (`unlocked`, `seenHints`), Typwächter |
| `onboarding/domain/onboarding-logic.ts` | `START_ONBOARDING` (eingefroren, leer); Freischaltregeln `UnlockProgress`, `unlockProgress(state)`, `isUnlockReached(id, progress, params)`, `reachedUnlocks(unlocked, progress, params)`, `updateUnlocks(state, params)`, `isUnlocked`; Hinweise `isHintAvailable`, `pendingHints`, `hintsOfUnlocks`, `markHintSeen`, `resetHints` |

## Besonderheiten

- Freischaltregeln (Game-Design §4.18): `pheromones` bei `k > 0` oder `N ≥ Preis_P` (`glandPrice`); `map` bei `V ≤ mapUnlockStockShare · G` (0,25, `balance/domain`, über `params` überschreibbar), `z > 0` oder laufender Reise; `finds` bei `finds.total > 0`; `genome` bei DNA `> 0` oder einem entwickelten Knoten.
- Monoton: Nichts wird zurückgenommen. `updateUnlocks` läuft am Ende jedes `step` und in `applyCommand` nach jedem wirksamen Kommando; `createInitialState` ruft es einmal (überschriebene `params` der Modell-Seite). Ändert sich nichts, kommt dieselbe Referenz zurück; sind alle Teile frei, prüft es nichts mehr (Kosten im Takt, Runner und `catchUp`).
- Beide Listen liegen ohne Doppelte in der Reihenfolge der ID-Listen vor; Funktionen, die ergänzen, sortieren dorthin ein. Das Laden normalisiert die Reihenfolge.
- `UnlockProgress` statt `GameState`, damit die Migration 4→5 die Regeln auf den rohen Stand anwenden kann (mit `V5_UNLOCK_PARAMS`).
- Hinweise ändern nur die Kommandos `markHintSeen` und `resetHints`; die Domäne kennt nur IDs und „gesehen“. Wann `auto-move` erscheint (erstes Öffnen der Umgebung), entscheidet die Oberfläche; `pendingHints` liefert ihn, sobald `map` frei ist.
- Bots und Modell-Seite ignorieren das Onboarding; es ändert keine Spielwerte.
- Neue IDs anhängen; Umbenennen oder Entfernen braucht eine Migration (Regeldatei `persistence`).
