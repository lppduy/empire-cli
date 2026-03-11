// Building construction logic: walls (defense), barracks (cheaper recruits), market (gold income)

import type { BuildingType, Faction, Territory, Resources } from '../game-types.js';

export interface BuildingDef {
  type: BuildingType;
  label: string;
  icon: string;
  cost: Partial<Resources>;
  description: string;
}

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  walls:    { type: 'walls',    label: 'Walls',    icon: '🧱', cost: { wood: 10, stone: 15 }, description: '+0.3 defense bonus' },
  barracks: { type: 'barracks', label: 'Barracks', icon: '🏛️', cost: { wood: 8, stone: 5 },   description: 'recruit costs 2g instead of 3g' },
  market:   { type: 'market',   label: 'Market',   icon: '🏪', cost: { gold: 10, wood: 5, stone: 3 }, description: '+2 gold income/turn' },
};

/**
 * Build a structure in a territory. Returns error message or null on success.
 */
export function buildStructure(
  faction: Faction,
  territory: Territory,
  buildingType: BuildingType
): string | null {
  if (territory.owner !== faction.id) {
    return `You don't own ${territory.name}.`;
  }

  const def = BUILDINGS[buildingType];
  if (!def) return `Unknown building: ${buildingType}. Available: walls, barracks, market`;

  if (territory.buildings.includes(buildingType)) {
    return `${territory.name} already has ${def.label}.`;
  }

  // Check cost
  const cost = def.cost;
  if ((cost.gold ?? 0) > faction.gold) return `Not enough gold. Need ${cost.gold}, have ${faction.gold}.`;
  if ((cost.wood ?? 0) > faction.wood) return `Not enough wood. Need ${cost.wood}, have ${faction.wood}.`;
  if ((cost.stone ?? 0) > faction.stone) return `Not enough stone. Need ${cost.stone}, have ${faction.stone}.`;

  // Deduct resources
  faction.gold -= cost.gold ?? 0;
  faction.wood -= cost.wood ?? 0;
  faction.stone -= cost.stone ?? 0;

  territory.buildings.push(buildingType);
  return null;
}

/**
 * Get defense bonus from buildings in a territory (added to terrain bonus).
 */
export function getBuildingDefenseBonus(territory: Territory): number {
  return territory.buildings.includes('walls') ? 0.3 : 0;
}

/**
 * Get recruit cost discount from barracks.
 */
export function getRecruitGoldCost(territory: Territory): number {
  return territory.buildings.includes('barracks') ? 2 : 3;
}

/**
 * Get bonus gold income from market.
 */
export function getMarketGoldBonus(territory: Territory): number {
  return territory.buildings.includes('market') ? 2 : 0;
}
