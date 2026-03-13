// Narrator facade — public API for game loop integration

import type { NarratorConfig } from './narrator-config.js';
import { generateNarration } from './narrator-client.js';
import {
  buildBattlePrompt,
  buildTurnSummaryPrompt,
  buildGameOverPrompt,
} from './narrator-prompts.js';
import type { BattleContext, TurnSummaryContext, GameOverContext } from './narrator-prompts.js';

let config: NarratorConfig | null = null;

export function init(cfg: NarratorConfig): void {
  config = cfg;
}

export function isEnabled(): boolean {
  return config?.enabled ?? false;
}

export async function narrateBattle(ctx: BattleContext): Promise<string | null> {
  if (!isEnabled() || !config) return null;
  return generateNarration(buildBattlePrompt(ctx), config);
}

export async function narrateTurnEnd(ctx: TurnSummaryContext): Promise<string | null> {
  if (!isEnabled() || !config) return null;
  return generateNarration(buildTurnSummaryPrompt(ctx), config);
}

export async function narrateGameOver(ctx: GameOverContext): Promise<string | null> {
  if (!isEnabled() || !config) return null;
  return generateNarration(buildGameOverPrompt(ctx), config);
}
