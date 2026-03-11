// Army recruitment, movement, and validation logic

import type { Army, Faction, Territory, GameState } from '../game-types.js';
import { canAfford, deductResources } from './resource-calculator.js';
import { getRecruitGoldCost } from './building-manager.js';

const RECRUIT_FOOD_PER_UNIT = 2;
const DEFAULT_MORALE = 80;

let armyIdCounter = 1;

function generateArmyId(): string {
  return `army_${Date.now()}_${armyIdCounter++}`;
}

/**
 * Recruit new army units in a territory owned by the faction.
 * Returns error message or null on success.
 */
export function recruitArmy(
  faction: Faction,
  territory: Territory,
  units: number,
  armies: Map<string, Army>
): string | null {
  if (territory.owner !== faction.id) {
    return `${territory.name} is not owned by ${faction.name}.`;
  }
  if (units < 1) {
    return 'Must recruit at least 1 unit.';
  }

  const goldPerUnit = getRecruitGoldCost(territory);
  const totalCost = {
    gold: goldPerUnit * units,
    food: RECRUIT_FOOD_PER_UNIT * units,
  };

  if (!canAfford(faction, totalCost)) {
    return `Not enough resources. Need ${totalCost.gold} gold and ${totalCost.food} food.`;
  }

  deductResources(faction, totalCost);
  faction.totalArmies += units;
  territory.armies += units;

  // Create or merge army in territory
  const existingArmy = findArmyInTerritory(faction.id, territory.id, armies);
  if (existingArmy) {
    existingArmy.units += units;
  } else {
    const newArmy: Army = {
      id: generateArmyId(),
      factionId: faction.id,
      units,
      morale: DEFAULT_MORALE,
      territoryId: territory.id,
    };
    armies.set(newArmy.id, newArmy);
  }

  return null;
}

/**
 * Move an army from one territory to an adjacent territory.
 * Returns error message or null on success.
 */
export function moveArmy(
  army: Army,
  fromTerritory: Territory,
  toTerritory: Territory
): string | null {
  if (army.territoryId !== fromTerritory.id) {
    return 'Army is not in the specified territory.';
  }
  if (!fromTerritory.adjacentTo.includes(toTerritory.id)) {
    return `${toTerritory.name} is not adjacent to ${fromTerritory.name}.`;
  }

  // Move the army
  fromTerritory.armies -= army.units;
  toTerritory.armies += army.units;
  army.territoryId = toTerritory.id;

  return null;
}

/**
 * Find any army belonging to a faction in a specific territory.
 */
export function findArmyInTerritory(
  factionId: string,
  territoryId: string,
  armies: Map<string, Army>
): Army | undefined {
  for (const army of armies.values()) {
    if (army.factionId === factionId && army.territoryId === territoryId) {
      return army;
    }
  }
  return undefined;
}

/**
 * Get total units a faction has in a given territory.
 */
export function getUnitsInTerritory(
  factionId: string,
  territoryId: string,
  armies: Map<string, Army>
): number {
  let total = 0;
  for (const army of armies.values()) {
    if (army.factionId === factionId && army.territoryId === territoryId) {
      total += army.units;
    }
  }
  return total;
}

/**
 * Remove casualties from army after combat. Destroys army if no units remain.
 */
export function applyCasualties(
  army: Army,
  casualties: number,
  faction: Faction,
  armies: Map<string, Army>,
  territory: Territory
): void {
  const actual = Math.min(casualties, army.units);
  army.units -= actual;
  faction.totalArmies -= actual;
  territory.armies -= actual;

  if (army.units <= 0) {
    armies.delete(army.id);
  }
}

/**
 * Ensure an Army record exists for a faction in a territory.
 * Fixes desync where territory.armies > 0 but no Army object exists.
 */
export function ensureArmyRecord(
  factionId: string,
  territory: Territory,
  armies: Map<string, Army>
): void {
  if (territory.armies > 0 && territory.owner === factionId) {
    const existing = findArmyInTerritory(factionId, territory.id, armies);
    if (!existing) {
      const id = `army_fix_${Date.now()}`;
      armies.set(id, { id, factionId, units: territory.armies, morale: 80, territoryId: territory.id });
    }
  }
}
