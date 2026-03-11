// Core game type definitions for Empire CLI strategy RPG

export type TerritoryType = 'plains' | 'forest' | 'mountain' | 'city';

export type BuildingType = 'walls' | 'barracks' | 'market';

export type FactionPersonality = 'aggressive' | 'defensive' | 'diplomatic' | 'mercantile';

export interface Resources {
  gold: number;
  food: number;
  wood: number;
  stone: number;
}

export interface Territory {
  id: string;
  name: string;
  type: TerritoryType;
  owner: string | null; // faction id or null for unclaimed
  armies: number;
  resources: Resources; // base income per turn
  adjacentTo: string[]; // territory ids
  buildings: BuildingType[]; // built structures
}

export interface Faction {
  id: string;
  name: string;
  personality: FactionPersonality;
  color: string; // chalk color name
  territories: string[]; // territory ids
  gold: number;
  food: number;
  wood: number;
  stone: number;
  totalArmies: number;
}

export interface Army {
  id: string;
  factionId: string;
  units: number;
  morale: number; // 0-100
  territoryId: string;
}

export interface CombatResult {
  attackerCasualties: number;
  defenderCasualties: number;
  outcome: 'decisive_victory' | 'victory' | 'pyrrhic_victory' | 'defeat';
  captured: boolean;
  log: string[];
}

export interface GameState {
  turn: number;
  territories: Map<string, Territory>;
  factions: Map<string, Faction>;
  armies: Map<string, Army>;
  playerFactionId: string;
  gameLog: string[];
  isOver: boolean;
  winner: string | null;
}

export interface Command {
  type: string;
  args: string[];
}

// Serializable version for JSON save files
export interface SaveData {
  turn: number;
  territories: Record<string, Territory>;
  factions: Record<string, Faction>;
  armies: Record<string, Army>;
  playerFactionId: string;
  gameLog: string[];
  isOver: boolean;
  winner: string | null;
  savedAt: string;
}
