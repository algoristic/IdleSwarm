import type { BalanceParams } from '@app/balance/domain/constants';
import type { CommandPlan } from '@app/engine/domain/bot-logic';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { GENOME_NODES } from '@app/genome/domain/data/genome-era1.data';
import { isNodeEvolved, nodeCost } from '@app/genome/domain/genome-logic';
import {
  GENOME_BRANCHES,
  GenomeBranch,
  GenomeNode,
  GenomeNodeId,
} from '@app/genome/domain/models/genome.model';

/** Bevorzugte Äste eines Bots in ihrer Reihenfolge (Game-Design §6.3). */
export type BranchPreference = readonly GenomeBranch[];

/**
 * Nächster nicht entwickelter Knoten je Ast in der Reihenfolge `branches`. Die Äste sind lineare
 * Ketten, sein Vorgänger ist also entwickelt; ein voller Ast liefert keinen.
 */
function nextNodes(state: GameState, branches: readonly GenomeBranch[]): GenomeNode[] {
  return branches.flatMap((branch) => {
    const next = GENOME_NODES.filter((node) => node.branch === branch)
      .sort((a, b) => a.tier - b.tier)
      .find((node) => !isNodeEvolved(state.genome, node.id));
    return next === undefined ? [] : [next];
  });
}

/** Günstigster Knoten; bei gleichen Kosten der erste in der Ast-Reihenfolge. */
function cheapest(nodes: readonly GenomeNode[], params: BalanceParams): GenomeNodeId | null {
  let best: GenomeNode | null = null;
  for (const node of nodes) {
    if (best === null || nodeCost(node.id, params).lt(nodeCost(best.id, params))) {
      best = node;
    }
  }
  return best?.id ?? null;
}

/**
 * Genom-Ziel nach Game-Design §6.3: der günstigste nicht entwickelte Knoten der bevorzugten Äste,
 * sind diese voll, der übrigen. `null`, wenn das Genom vollständig ist.
 */
export function genomeTarget(
  state: GameState,
  preferred: BranchPreference,
  params: BalanceParams,
): GenomeNodeId | null {
  const others = GENOME_BRANCHES.filter((branch) => !preferred.includes(branch));
  return (
    cheapest(nextNodes(state, preferred), params) ?? cheapest(nextNodes(state, others), params)
  );
}

/**
 * Entwickelt, solange die DNA reicht, jeweils das Genom-Ziel; ist es zu teuer, spart der Bot darauf
 * und entwickelt nichts anderes. Einzigartige Adaptionen kommen über die Funde von selbst.
 */
export function evolveGenome(plan: CommandPlan, preferred: BranchPreference): void {
  for (
    let node = genomeTarget(plan.state, preferred, plan.view.params);
    node !== null && plan.canEvolve(node);
    node = genomeTarget(plan.state, preferred, plan.view.params)
  ) {
    plan.evolve(node);
  }
}
