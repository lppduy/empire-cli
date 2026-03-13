// Diplomacy engine — alliances, peace treaties, trade proposals

import type { GameState, DiplomaticRelation, DiplomaticStatus, Faction } from '../game-types.js';

// Acceptance rates by personality: [alliance, peace, trade]
const ACCEPT_RATES: Record<string, [number, number, number]> = {
  aggressive:  [0.15, 0.20, 0.40],
  defensive:   [0.50, 0.70, 0.50],
  mercantile:  [0.40, 0.50, 0.80],
  diplomatic:  [0.80, 0.85, 0.70],
};

// Trade markup by personality (lower = better deal for proposer)
const TRADE_MARKUP: Record<string, number> = {
  aggressive: 1.5, defensive: 1.2, mercantile: 0.8, diplomatic: 1.0,
};

/** Canonical key — alphabetically sorted faction pair */
function relationKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Find existing relation between two factions */
export function getRelation(
  diplomacy: DiplomaticRelation[], a: string, b: string
): DiplomaticRelation | undefined {
  const [fa, fb] = relationKey(a, b);
  return diplomacy.find((r) => r.factionA === fa && r.factionB === fb);
}

/** Get diplomatic status (defaults to 'neutral') */
export function getDiplomaticStatus(
  diplomacy: DiplomaticRelation[], a: string, b: string
): DiplomaticStatus {
  return getRelation(diplomacy, a, b)?.status ?? 'neutral';
}

/** Set or update a relation between two factions */
function setRelation(
  diplomacy: DiplomaticRelation[], a: string, b: string,
  status: DiplomaticStatus, turnsRemaining: number, initiatedBy: string
): void {
  const [fa, fb] = relationKey(a, b);
  const existing = diplomacy.findIndex((r) => r.factionA === fa && r.factionB === fb);
  const rel: DiplomaticRelation = { factionA: fa, factionB: fb, status, turnsRemaining, initiatedBy };
  if (existing >= 0) diplomacy[existing] = rel;
  else diplomacy.push(rel);
}

/** Propose alliance — returns acceptance result */
export function proposeAlliance(
  state: GameState, proposer: string, target: string
): { accepted: boolean; reason: string } {
  const current = getDiplomaticStatus(state.diplomacy, proposer, target);
  if (current === 'allied') return { accepted: false, reason: 'Already allied.' };

  const faction = state.factions.get(target)!;
  let chance = ACCEPT_RATES[faction.personality]?.[0] ?? 0.5;
  if (faction.territories.length <= 1) chance += 0.30;

  if (Math.random() < chance) {
    setRelation(state.diplomacy, proposer, target, 'allied', -1, proposer);
    return { accepted: true, reason: `${faction.name} accepts your alliance!` };
  }
  return { accepted: false, reason: `${faction.name} declines your offer.` };
}

/** Propose peace treaty — returns acceptance result with duration */
export function proposePeace(
  state: GameState, proposer: string, target: string
): { accepted: boolean; reason: string; turns: number } {
  const current = getDiplomaticStatus(state.diplomacy, proposer, target);
  if (current === 'peace') return { accepted: false, reason: 'Already at peace.', turns: 0 };
  if (current === 'allied') return { accepted: false, reason: 'Already allied (stronger than peace).', turns: 0 };

  const faction = state.factions.get(target)!;
  let chance = ACCEPT_RATES[faction.personality]?.[1] ?? 0.5;
  if (faction.territories.length <= 1) chance += 0.30;

  const turns = 3 + Math.floor(Math.random() * 3); // 3-5 turns
  if (Math.random() < chance) {
    setRelation(state.diplomacy, proposer, target, 'peace', turns, proposer);
    return { accepted: true, reason: `${faction.name} accepts peace for ${turns} turns.`, turns };
  }
  return { accepted: false, reason: `${faction.name} refuses peace.`, turns: 0 };
}

/** Propose trade — calculate cost with personality markup */
export function proposeTrade(
  state: GameState, proposer: string, target: string,
  giveResource: string, giveAmount: number, getResource: string
): { accepted: boolean; reason: string; getAmount: number } {
  const faction = state.factions.get(target)!;
  const chance = ACCEPT_RATES[faction.personality]?.[2] ?? 0.5;
  const markup = TRADE_MARKUP[faction.personality] ?? 1.0;
  const getAmount = Math.max(1, Math.round(giveAmount / markup));

  // Check target has enough resources
  const targetRes = (faction as any)[getResource] as number | undefined;
  if (targetRes === undefined) return { accepted: false, reason: `Invalid resource: ${getResource}.`, getAmount: 0 };
  if (targetRes < getAmount) return { accepted: false, reason: `${faction.name} doesn't have enough ${getResource}.`, getAmount: 0 };

  if (Math.random() < chance) {
    // Execute trade
    const player = state.factions.get(proposer)!;
    (player as any)[giveResource] -= giveAmount;
    (player as any)[getResource] += getAmount;
    (faction as any)[giveResource] += giveAmount;
    (faction as any)[getResource] -= getAmount;
    return { accepted: true, reason: `${faction.name} trades ${getAmount} ${getResource} for your ${giveAmount} ${giveResource}.`, getAmount };
  }
  return { accepted: false, reason: `${faction.name} declines the trade.`, getAmount: 0 };
}

/** Break an alliance or peace treaty */
export function breakRelation(diplomacy: DiplomaticRelation[], a: string, b: string): void {
  const [fa, fb] = relationKey(a, b);
  const idx = diplomacy.findIndex((r) => r.factionA === fa && r.factionB === fb);
  if (idx >= 0) diplomacy.splice(idx, 1);
}

/** Tick diplomacy at end of turn: decrement peace timers, expire treaties */
export function tickDiplomacy(state: GameState): string[] {
  const logs: string[] = [];
  for (let i = state.diplomacy.length - 1; i >= 0; i--) {
    const rel = state.diplomacy[i];
    if (rel.status === 'peace' && rel.turnsRemaining > 0) {
      rel.turnsRemaining--;
      if (rel.turnsRemaining <= 0) {
        const nameA = state.factions.get(rel.factionA)?.name ?? rel.factionA;
        const nameB = state.factions.get(rel.factionB)?.name ?? rel.factionB;
        logs.push(`Peace treaty between ${nameA} and ${nameB} has expired.`);
        state.diplomacy.splice(i, 1);
      }
    }
  }
  return logs;
}

/** Get all relations for a faction (non-neutral only) */
export function getFactionRelations(
  diplomacy: DiplomaticRelation[], factionId: string
): DiplomaticRelation[] {
  return diplomacy.filter((r) => r.factionA === factionId || r.factionB === factionId);
}
