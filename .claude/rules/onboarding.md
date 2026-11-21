---
paths:
  - "src/app/onboarding/**"
---

# Onboarding

Freischaltungen und Hinweise (US-09.04, Game-Design §4.18, TK §8.7), gespeichert im Spielstand (`GameState.onboarding`, seit Version 5). Welche Teile ausgeblendet sind, entscheiden die nutzenden Domänen über ihre Viewmodels (`hud`: Einheiten, Schubladen, Ressourcen; `shell`: Modi, Zoom-Leiste, Guard); die Hinweiskarte liegt hier (AP 1.5.4).

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `onboarding/domain/models/onboarding.model.ts` | `ONBOARDING_UNLOCK_IDS` (`pheromones`, `map`, `finds`, `genome`), `HINT_IDS` (`collect`, `pheromones`, `map`, `finds`, `genome`, `auto-move`), `HINT_UNLOCKS` (Hinweis → Freischaltung, `collect` → `null`, `auto-move` → `map`), `Onboarding` (`unlocked`, `seenHints`), Typwächter |
| `onboarding/feature/state/onboarding.facade.ts` | `OnboardingFacade`: `pendingHints` (`computed` über `state.onboarding`, neue Referenz nur bei Änderung), `dismissHint(hint)` (→ `markHintSeen`) |
| `onboarding/feature/state/onboarding.providers.ts` | `provideOnboardingState()`, registriert an der Shell-Route |
| `onboarding/feature/state/onboarding.utils.ts` | `HINT_MODES` (Hinweis → Modus: `auto-move` → `map`, alle anderen → `scene`; im Genom keiner), `hintForMode(pending, mode)` (erster offener Hinweis des Modus oder `null`) |
| `onboarding/feature/onboarding-hint/` | `OnboardingHintComponent` (Input `mode`): Live-Region `role="status"`, immer im DOM, darin höchstens eine `HintCardComponent`; `onDismiss` meldet `releasedFocus`, wenn der Fokus beim Wegklicken in der Karte lag; den Platz gibt die Shell vor |
| `onboarding/ui/hint-card/` | `HintCardComponent` (Input `hint`, Output `clickedDismiss`): Panel (`bg-surface`, `shadow-panel`) mit Kicker „Hinweis“, Titel, Text, Primärknopf „Verstanden“ (44 px); Einblenden per `hint-card.component.css`, bei reduzierter Bewegung nur Überblenden |
| `onboarding/ui/hint-labels/` | `HINT_TEXTS` (`Record<HintId, HintTexts>`): Titel und Text je Hinweis |
| `onboarding/domain/onboarding-logic.ts` | `START_ONBOARDING` (eingefroren, leer); Freischaltregeln `UnlockProgress`, `unlockProgress(state)`, `isUnlockReached(id, progress, params)`, `reachedUnlocks(unlocked, progress, params)`, `updateUnlocks(state, params)`, `isUnlocked`; Hinweise `isHintAvailable`, `pendingHints`, `hintsOfUnlocks`, `markHintSeen`, `resetHints` |

## Besonderheiten

- Freischaltregeln (Game-Design §4.18): `pheromones` bei `k > 0` oder `N ≥ Preis_P` (`glandPrice`); `map` bei `V ≤ mapUnlockStockShare · G` (0,25, `balance/domain`, über `params` überschreibbar), `z > 0` oder laufender Reise; `finds` bei `finds.total > 0`; `genome` bei DNA `> 0` oder einem entwickelten Knoten.
- Monoton: Nichts wird zurückgenommen. `updateUnlocks` läuft am Ende jedes `step` und in `applyCommand` nach jedem wirksamen Kommando; `createInitialState` ruft es einmal (überschriebene `params` der Modell-Seite). Ändert sich nichts, kommt dieselbe Referenz zurück; sind alle Teile frei, prüft es nichts mehr (Kosten im Takt, Runner und `catchUp`).
- Beide Listen liegen ohne Doppelte in der Reihenfolge der ID-Listen vor; Funktionen, die ergänzen, sortieren dorthin ein. Das Laden normalisiert die Reihenfolge.
- `UnlockProgress` statt `GameState`, damit die Migration 4→5 die Regeln auf den rohen Stand anwenden kann (mit `V5_UNLOCK_PARAMS`).
- Hinweise ändern nur die Kommandos `markHintSeen` und `resetHints`; die Domäne kennt nur IDs und „gesehen“. Wann `auto-move` erscheint (erstes Öffnen der Umgebung), entscheidet die Oberfläche; `pendingHints` liefert ihn, sobald `map` frei ist.
- Bots und Modell-Seite ignorieren das Onboarding; es ändert keine Spielwerte.
- Hinweiskarte: nicht modal, nimmt keinen Fokus; Wegklicken nur über „Verstanden“. Dialoge (Rückkehr, Einstellungen) liegen im Top-Layer darüber. Lage und Zurücktreten bei offener Schublade bzw. offenem Sheet regelt die Shell (Regeldatei `shell`).
- Test-IDs: `onboarding.hint.<hintId>` (Hülle), `onboarding.hint.{card,title,text,dismiss}`.
- Neue IDs anhängen; Umbenennen oder Entfernen braucht eine Migration (Regeldatei `persistence`).
