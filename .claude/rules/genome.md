---
paths:
  - "src/app/genome/**"
---

# Genom

Das Genom der Ära I (Game-Design §4.14, AP 1.3.2) und die Genom-Ansicht unter `/genom` (AP 1.3.3, US-05.01–05.04, US-06.02). Die Ansicht ist eine eigene Seite mit Rücklink zum HUD; in M1.4 wird sie zur K2-Ebene `#genome`. Viewmodel und Detailpanel bleiben dabei.

## Was wo liegt

| Pfad | Inhalt |
| --- | --- |
| `genome/domain/models/genome.model.ts` | `GENOME_NODE_IDS` (15 reguläre Knoten in der Reihenfolge der Spieldaten, stabile IDs), `GENOME_ROOT` (`root`, nicht gespeichert), `UNIQUE_ADAPTATION_IDS`, `GENOME_BRANCHES`, `GENOME_TIERS`, `GENOME_NODE_STATUSES` (`evolved`, `available`, `too-expensive`, `locked`, `undiscovered`; `RegularNodeStatus`, `UniqueAdaptationStatus`), `EffectSpec` (Effekt ohne Zahl), `GenomeNode`, `UniqueAdaptation`, `FragmentProgress`, `Genome` (`owned`), `isGenomeNodeId` |
| `genome/domain/models/genome-event.model.ts` | Ereignis `evolved` (`node`, `cost`, `playedMs`), `GenomeResult` |
| `genome/domain/data/genome-era1.data.ts` | `GENOME_NODES`, `GENOME_NODE_BY_ID`, `GENOME_NODE_PREDECESSORS` (genutzt von der Ladeprüfung), `UNIQUE_ADAPTATIONS`, `UNIQUE_ADAPTATION_BY_ID`; nur Struktur (Ast, Stufe, Vorgänger, Anker, Fragment, Ziel, Operation, Bedingung) |
| `genome/domain/genome-logic.ts` | `nodeCost`, `nodeEffects`, `uniqueAdaptationEffects` (Werte aus `params` über `GENOME_NODE_PARAMS`/`UNIQUE_ADAPTATION_PARAMS`), `isNodeEvolved`, `isNodeUnlocked`, `nodeStatus`, `canEvolve`, `availableNodeCount`, `evolve` (Kommando, meldet `evolved`), `fragmentProgress`, `isUniqueAdaptationUnlocked`, `uniqueAdaptationStatus`, `genomeEffects` (Quelle für `stateEffects`), `nodeEffectPreview`, `uniqueAdaptationEffectPreview` (`EffectPreview`), `withNode`, `withFragments` (Vergleichszustände für Vorschau und Upgrade-Tabelle) |
| `genome/domain/genome-tree-logic.ts` | Geometrie des radialen Baums im `viewBox` (`TREE_SIZE` 800, `NUCLEUS_RADIUS`, `MEMBRANE_RADIUS`, `ROOT_RADIUS`, `NODE_RADIUS` …): `polarPoint`, `translate`, `branchPath` (gebogene Äste), `membranePath`, `organelle`, `nodeDecoration` (Beschriftung, Kostenschild, Puls-, Auswahl- und Fokusring) |
| `genome/ui/models/genome-entry.model.ts` | `GenomeEntryId` (Wurzel, Knoten, einzigartige Adaption), `GenomeTone` (Ast oder `unique`), `EFFECT_FORMATS`, `EffectPreviewView`, `UniqueEffectView` |
| `genome/ui/genome-labels/genome-labels.ts` | `Record`-Abbildungen Code → Text bzw. Klasse: `GENOME_NODE_LABELS`, `UNIQUE_ADAPTATION_LABELS`, `GENOME_ROOT_LABEL`, `GENOME_BRANCH_LABELS`, `GENOME_UNIQUE_KIND_LABEL`, `GENOME_STATUS_LABELS`, `EFFECT_TARGET_LABELS`, `GENOME_TONE_FILLS`/`_STROKES`/`_TEXTS`/`_BACKGROUNDS`; `genomeEntryLabel`. Auch vom HUD-Log und der Modell-Seite genutzt |
| `genome/ui/genome-descriptions/genome-descriptions.ts` | Beschreibungstexte: `GENOME_ROOT_DESCRIPTION`, `GENOME_NODE_DESCRIPTIONS`, `UNIQUE_ADAPTATION_DESCRIPTIONS` |
| `genome/ui/genome-tree/` | `GenomeTreeComponent`: SVG-Baum im Zellkern (Membran, Organellen, Äste, Knoten als Knöpfe mit `aria-label`, Enter/Leertaste), Legende der Äste und Status; Output `selectedEntry`. Typen in `genome-tree.component.model.ts` (`GenomeTreeView`, `TreeNodeView`, `TreeEdgeView`, `TreeEdgeStyle`). `genome-tree.layout.ts`: `GENOME_LAYOUT` (Winkel, Radius, Seite von Beschriftung und Kostenschild je Eintrag), `ORGANELLE_LAYOUT`. `genome-tree.component.css` für Membran, Puls und Beschriftungskontur |
| `genome/ui/genome-detail/` | `GenomeDetailComponent` mit `GenomeDetailView` (`RootDetailView`, `NodeDetailView`, `UniqueDetailView`): Name, Art, Beschreibung, Effekt „vorher → nachher“, Vorgänger, Preis bzw. fehlende DNA, Fragmentfortschritt; Output `clickedEvolve` |
| `genome/feature/genome.routes.ts` | Route `''` unter `genom` (lazy in `app.routes.ts`), registriert `provideGenomeState()` |
| `genome/feature/genome/genome.page.{ts,html}` | `GenomePage`: DNA, Zahl verfügbarer Adaptionen (ICU), Baum, Detailpanel; Rücklink zum HUD |
| `genome/feature/state/genome.facade.ts` | `GenomeFacade`: `genome` (Viewmodel), lokale Auswahl (`select`), `evolve(node)` |
| `genome/feature/state/genome.utils.ts`, `genome.model.ts` | `toGenomeView` (rein): Status, Baum, Detailpanel; `GenomeSource`, `GenomeView` |

## Besonderheiten

- Kosten und Effektwerte stehen nicht in den Spieldaten, sondern in `BalanceParams` je ID (`<id>Effect`, `<id>Fragments`; Zuordnung `GENOME_NODE_PARAMS`, `UNIQUE_ADAPTATION_PARAMS` in `balance/domain/formulas.ts`). Kosten nach Stufe über `genomeNodeCost`.
- `owned` hält die entwickelten Knoten in der Reihenfolge der Spieldaten (`evolve` und `withNode` sortieren über `withOwned` ein), ohne `root`. Die Ladeprüfung verlangt nur bekannte IDs ohne Doppel und zu jedem den Vorgänger.
- Einzigartige Adaptionen kosten keine DNA und werden nicht gespeichert: Sie wirken, sobald `finds.collected` alle Fragmente zählt (`isUniqueAdaptationUnlocked`). Der Anker legt nur die Lage im Baum fest. Ohne Freischaltung zeigen Baum und Detailpanel den Fortschritt „x / benötigt“ und keinen Kaufknopf.
- `evolve` meldet `evolved` mit Knoten, Kosten und `playedMs`; das HUD-Log zeigt es, der Runner macht daraus die Markierung „Adaption gekauft“. Ein wirkungsloses `evolve` liefert denselben Zustand ohne Ereignis.
- `genome/domain` nutzt `finds/domain` nur über Typen (`import type`), umgekehrt nutzt `finds/domain` die Genom-Daten und -Logik zur Laufzeit; `genome/ui` liest die Fragmentnamen aus `finds/ui/finds-labels`.
- `genome` hängt zur Laufzeit nicht von `engine` ab: Die Vorschauen (`nodeEffectPreview`, `uniqueAdaptationEffectPreview`) bekommen die Modifikatoren als Funktion (`modifiersOf`). `engine/domain/modifiers-logic.ts` reicht `stateModifiers` hinein (`genomeNodePreview`, `uniqueAdaptationPreview`); Viewmodels rufen nur diese.
- Positionen im Baum stehen nur in `genome-tree.layout.ts` (UI-Daten, TK §6), nicht in `genome/domain`. Beim Ändern von Winkeln, Radien oder Beschriftungsseiten prüfen, dass sich Knoten, Beschriftungen und Kostenschilder nicht überschneiden.
- Das Template rechnet nichts: Koordinaten, Pfade, `transform`-Strings, Kosten, Fortschritt und Auswahl liefert `toGenomeView`, Texte und Klassen kommen aus den Abbildungen in `genome-labels`.
- Statusdarstellung: entwickelt als gefüllte Kugel in Astfarbe mit ✓, verfügbar mit Pulsring und Kostenschild in `violet`, zu teuer mit blasser Kontur und gedämpftem Schild, gesperrt gepunktet in `locked`, einzigartig nicht gefunden gepunktet mit „?“ und Fortschritt. Kanten: `evolved` kräftig, `open` blass (Vorgänger entwickelt), `locked` gepunktet; Kanten zu einzigartigen Adaptionen sind bis zur Freischaltung gepunktet. Das Kostenschild gibt es nur bei `available` und `too-expensive`.
- Standardauswahl ohne Wahl des Spielers: der erste verfügbare Knoten, sonst der erste zu teure, sonst die Wurzel (`defaultSelection`). Die Auswahl ist lokaler UI-Zustand der Facade.
- Anzeigeformate im „vorher → nachher“ (`PREVIEW_FORMATS`): Faktoren und Anteile als Prozent, Sammelleistung als Prozent der Grundrate (relativ zu `droneCollectRate`, je Drohne wären es nur Hundertstel), Brut und Angriff als Rate, Reichweite, Platz und Pheromonpunkte als Zahl. Beträge einzigartiger Adaptionen (`DELTA_FORMATS`): `add` auf Modifikatoren und Anteile als Prozent, `mul` als Prozent über 1 (×1,25 = +25 %), sonst in der Einheit des Werts; bedingte Effekte nennen den Futterstellentyp.
- Membran-Drehung und Pulsring sind CSS-Animationen nach der K2-Ausnahme (CLAUDE.md §4) in `genome-tree.component.css` und stehen bei `prefers-reduced-motion: reduce` still (der Pulsring bleibt als ruhiger Ring).
- Farben über die Genom-Tokens aus `src/styles.css` (`branch-*`, `nucleus`, `membrane`, `organelle`, `cell`, `locked`, `locked-fg`, `cost-muted`, `cost-muted-fg`), Kostenschilder mit `text-2xs`.
- Test-IDs: `genome.nav.back`, `genome.status.{dna,available}`, `genome.tree.svg`, `genome.tree.nodes.<id>`, `genome.tree.nodes.<id>.{cost,progress,selected}`, `genome.tree.edges.<id>`, `genome.legend.{branches,statuses}`, `genome.detail.{name,kind,description,root,predecessor,price,evolve,evolved,progress}`, `genome.detail.effects.<target>`.
