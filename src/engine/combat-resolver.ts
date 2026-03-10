// Combat resolution engine: calculates battle outcomes based on units, morale, terrain

import type { CombatResult, TerritoryType } from '../game-types.js';

// Terrain defense bonuses (multiplier on defender power)
const TERRAIN_BONUS: Record<TerritoryType, number> = {
  plains: 1.0,
  forest: 1.2,
  mountain: 1.5,
  city: 1.3,
};

/**
 * Resolve combat between attacker and defender armies.
 * Uses a power ratio formula to determine outcome and casualties.
 */
export function resolveCombat(
  attackerUnits: number,
  attackerMorale: number,
  defenderUnits: number,
  defenderMorale: number,
  terrain: TerritoryType
): CombatResult {
  const log: string[] = [];

  const terrainBonus = TERRAIN_BONUS[terrain];
  const attackPower = attackerUnits * (attackerMorale / 100);
  const defensePower = defenderUnits * (defenderMorale / 100) * terrainBonus;

  log.push(`Attack power: ${attackPower.toFixed(1)} vs Defense power: ${defensePower.toFixed(1)}`);
  log.push(`Terrain (${terrain}) gives defender x${terrainBonus} bonus`);

  const ratio = attackPower / (defensePower || 1);

  let outcome: CombatResult['outcome'];
  let attackerCasualties: number;
  let defenderCasualties: number;
  let captured = false;

  if (ratio >= 2.0) {
    // Decisive victory — attacker dominates
    outcome = 'decisive_victory';
    attackerCasualties = Math.max(0, Math.floor(attackerUnits * 0.1));
    defenderCasualties = defenderUnits; // all defenders lost
    captured = true;
    log.push('Decisive victory! The defenders are routed!');
  } else if (ratio >= 1.2) {
    // Regular victory
    outcome = 'victory';
    attackerCasualties = Math.max(0, Math.floor(attackerUnits * 0.25));
    defenderCasualties = Math.max(0, Math.floor(defenderUnits * 0.6));
    captured = true;
    log.push('Victory! The territory has been captured.');
  } else if (ratio >= 0.8) {
    // Pyrrhic — costly win or stalemate resolved as attacker loss
    outcome = 'pyrrhic_victory';
    attackerCasualties = Math.max(0, Math.floor(attackerUnits * 0.5));
    defenderCasualties = Math.max(0, Math.floor(defenderUnits * 0.4));
    captured = ratio >= 1.0; // only capture if slightly above even
    log.push(captured ? 'Pyrrhic victory — heavy losses on both sides.' : 'Stalemate — attackers withdraw.');
  } else {
    // Defeat
    outcome = 'defeat';
    attackerCasualties = Math.max(0, Math.floor(attackerUnits * 0.6));
    defenderCasualties = Math.max(0, Math.floor(defenderUnits * 0.15));
    captured = false;
    log.push('Defeat! The attack has failed.');
  }

  log.push(`Attacker losses: ${attackerCasualties} units`);
  log.push(`Defender losses: ${defenderCasualties} units`);

  return { attackerCasualties, defenderCasualties, outcome, captured, log };
}

/**
 * Simulate AI faction auto-attack decision: returns true if AI should attack.
 */
export function shouldAiAttack(
  personality: string,
  attackerUnits: number,
  defenderUnits: number
): boolean {
  const ratio = attackerUnits / (defenderUnits || 1);
  switch (personality) {
    case 'aggressive': return ratio >= 1.0;
    case 'defensive':  return ratio >= 2.0;
    case 'mercantile': return ratio >= 1.5;
    case 'diplomatic': return ratio >= 2.5;
    default:           return ratio >= 1.5;
  }
}
