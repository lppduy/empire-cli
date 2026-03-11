// Default world map data: 8 territories, 4 starting factions
// Map layout:
//   [Northkeep] --- [Iron Hills]
//        |              |
//   [Greenwood] --- [Crossroads] --- [Desert Gate]
//        |              |
//   [Silver Bay] --- [Stonehaven]
//                       |
//                  [Dragon Peak]

import type { Territory, Faction } from '../game-types.js';

export const DEFAULT_TERRITORIES: Territory[] = [
  {
    id: 'northkeep',
    name: 'Northkeep',
    type: 'city',
    owner: 'iron_legion',
    armies: 3,
    resources: { gold: 4, food: 2, wood: 1, stone: 2 },
    adjacentTo: ['iron_hills', 'greenwood'],
    buildings: [],
  },
  {
    id: 'iron_hills',
    name: 'Iron Hills',
    type: 'mountain',
    owner: 'iron_legion',
    armies: 2,
    resources: { gold: 2, food: 1, wood: 0, stone: 4 },
    adjacentTo: ['northkeep', 'crossroads'],
    buildings: [],
  },
  {
    id: 'greenwood',
    name: 'Greenwood',
    type: 'forest',
    owner: 'green_pact',
    armies: 2,
    resources: { gold: 1, food: 3, wood: 4, stone: 0 },
    adjacentTo: ['northkeep', 'crossroads', 'silver_bay'],
    buildings: [],
  },
  {
    id: 'crossroads',
    name: 'Crossroads',
    type: 'plains',
    owner: null,
    armies: 0,
    resources: { gold: 2, food: 2, wood: 1, stone: 1 },
    adjacentTo: ['iron_hills', 'greenwood', 'desert_gate', 'stonehaven'],
    buildings: [],
  },
  {
    id: 'desert_gate',
    name: 'Desert Gate',
    type: 'plains',
    owner: 'sand_empire',
    armies: 2,
    resources: { gold: 3, food: 1, wood: 0, stone: 2 },
    adjacentTo: ['crossroads'],
    buildings: [],
  },
  {
    id: 'silver_bay',
    name: 'Silver Bay',
    type: 'city',
    owner: 'green_pact',
    armies: 3,
    resources: { gold: 5, food: 2, wood: 1, stone: 1 },
    adjacentTo: ['greenwood', 'stonehaven'],
    buildings: [],
  },
  {
    id: 'stonehaven',
    name: 'Stonehaven',
    type: 'mountain',
    owner: 'sand_empire',
    armies: 2,
    resources: { gold: 2, food: 1, wood: 0, stone: 5 },
    adjacentTo: ['crossroads', 'silver_bay', 'dragon_peak'],
    buildings: [],
  },
  {
    id: 'dragon_peak',
    name: 'Dragon Peak',
    type: 'mountain',
    owner: 'void_covenant',
    armies: 4,
    resources: { gold: 1, food: 0, wood: 0, stone: 6 },
    adjacentTo: ['stonehaven'],
    buildings: [],
  },
];

export const DEFAULT_FACTIONS: Faction[] = [
  {
    id: 'iron_legion',
    name: 'Iron Legion',
    personality: 'aggressive',
    color: 'red',
    territories: ['northkeep', 'iron_hills'],
    gold: 20,
    food: 10,
    wood: 5,
    stone: 15,
    totalArmies: 5,
  },
  {
    id: 'green_pact',
    name: 'Green Pact',
    personality: 'defensive',
    color: 'green',
    territories: ['greenwood', 'silver_bay'],
    gold: 15,
    food: 20,
    wood: 25,
    stone: 5,
    totalArmies: 5,
  },
  {
    id: 'sand_empire',
    name: 'Sand Empire',
    personality: 'mercantile',
    color: 'yellow',
    territories: ['desert_gate', 'stonehaven'],
    gold: 30,
    food: 8,
    wood: 2,
    stone: 10,
    totalArmies: 4,
  },
  {
    id: 'void_covenant',
    name: 'Void Covenant',
    personality: 'diplomatic',
    color: 'magenta',
    territories: ['dragon_peak'],
    gold: 10,
    food: 5,
    wood: 2,
    stone: 20,
    totalArmies: 4,
  },
];
