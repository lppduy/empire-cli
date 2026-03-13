// Prompt templates for AI narrator — builds short context-aware prompts

export interface BattleContext {
  attackerFaction: string;
  defenderFaction: string;
  fromTerritory: string;
  toTerritory: string;
  terrainType: string;
  attackerUnits: number;
  defenderUnits: number;
  captured: boolean;
  attackerCasualties: number;
  defenderCasualties: number;
}

export interface TurnSummaryContext {
  playerFaction: string;
  turn: number;
  territoriesOwned: number;
  totalTerritories: number;
  enemyActions: string[];
}

export interface GameOverContext {
  winnerFaction: string;
  playerFaction: string;
  turn: number;
  isPlayerWinner: boolean;
}

/** System instruction shared across all narration prompts */
export function getSystemInstruction(): string {
  return 'You are the narrator of an epic fantasy strategy game. Write exactly 1-2 vivid sentences. No lists, no questions. Use dramatic tone. Be concise.';
}

export function buildBattlePrompt(ctx: BattleContext): string {
  const outcome = ctx.captured ? 'victory — territory captured' : 'defeat — attack repelled';
  return `The ${ctx.attackerFaction} (${ctx.attackerUnits} soldiers) attacked ${ctx.toTerritory} (${ctx.terrainType} terrain) held by the ${ctx.defenderFaction} (${ctx.defenderUnits} defenders). Result: ${outcome}. Losses: ${ctx.attackerCasualties} attackers, ${ctx.defenderCasualties} defenders fell. Narrate this battle.`;
}

export function buildTurnSummaryPrompt(ctx: TurnSummaryContext): string {
  const events = ctx.enemyActions.length > 0
    ? ctx.enemyActions.join('; ')
    : 'The enemy factions were quiet';
  return `Turn ${ctx.turn} has ended. The ${ctx.playerFaction} holds ${ctx.territoriesOwned}/${ctx.totalTerritories} territories. Events this turn: ${events}. Narrate a brief end-of-turn summary.`;
}

export function buildGameOverPrompt(ctx: GameOverContext): string {
  if (ctx.isPlayerWinner) {
    return `The ${ctx.winnerFaction} has conquered all territories on turn ${ctx.turn}, unifying the realm under their banner. Narrate this glorious victory.`;
  }
  return `The ${ctx.winnerFaction} has conquered the world on turn ${ctx.turn}, crushing the ${ctx.playerFaction}. Narrate this bitter defeat.`;
}
