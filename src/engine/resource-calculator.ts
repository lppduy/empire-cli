// Resource collection and upkeep calculations for each faction per turn

import type { Faction, Territory, Resources } from '../game-types.js';
import { getMarketGoldBonus } from './building-manager.js';

const ARMY_FOOD_UPKEEP = 1; // food per army unit per turn
const ARMY_GOLD_UPKEEP = 0; // gold per army unit (free for now)

/**
 * Calculate total resource income for a faction based on owned territories.
 */
export function collectResources(
  faction: Faction,
  territories: Map<string, Territory>
): Resources {
  const income: Resources = { gold: 0, food: 0, wood: 0, stone: 0 };

  for (const territoryId of faction.territories) {
    const territory = territories.get(territoryId);
    if (!territory) continue;

    income.gold += territory.resources.gold + getMarketGoldBonus(territory);
    income.food += territory.resources.food;
    income.wood += territory.resources.wood;
    income.stone += territory.resources.stone;
  }

  return income;
}

/**
 * Calculate food upkeep cost for all armies in a faction.
 */
export function calculateUpkeep(faction: Faction): Resources {
  return {
    gold: faction.totalArmies * ARMY_GOLD_UPKEEP,
    food: faction.totalArmies * ARMY_FOOD_UPKEEP,
    wood: 0,
    stone: 0,
  };
}

/**
 * Apply income and deduct upkeep from faction. Mutates faction in place.
 * Returns net change log messages.
 */
export function processTurnResources(
  faction: Faction,
  territories: Map<string, Territory>
): string[] {
  const income = collectResources(faction, territories);
  const upkeep = calculateUpkeep(faction);
  const log: string[] = [];

  faction.gold += income.gold - upkeep.gold;
  faction.food += income.food - upkeep.food;
  faction.wood += income.wood - upkeep.wood;
  faction.stone += income.stone - upkeep.stone;

  // Clamp negatives — starvation means morale hit (handled elsewhere)
  if (faction.food < 0) {
    log.push(`${faction.name} is starving! Food deficit: ${faction.food}`);
    faction.food = 0;
  }
  if (faction.gold < 0) {
    log.push(`${faction.name} is bankrupt! Gold deficit: ${faction.gold}`);
    faction.gold = 0;
  }

  log.push(
    `${faction.name} collected: +${income.gold}g +${income.food}f +${income.wood}w +${income.stone}s`
  );

  return log;
}

/**
 * Check if a faction can afford a given resource cost.
 */
export function canAfford(faction: Faction, cost: Partial<Resources>): boolean {
  if (cost.gold !== undefined && faction.gold < cost.gold) return false;
  if (cost.food !== undefined && faction.food < cost.food) return false;
  if (cost.wood !== undefined && faction.wood < cost.wood) return false;
  if (cost.stone !== undefined && faction.stone < cost.stone) return false;
  return true;
}

/**
 * Deduct resources from faction. Assumes canAfford check done first.
 */
export function deductResources(faction: Faction, cost: Partial<Resources>): void {
  if (cost.gold) faction.gold -= cost.gold;
  if (cost.food) faction.food -= cost.food;
  if (cost.wood) faction.wood -= cost.wood;
  if (cost.stone) faction.stone -= cost.stone;
}
