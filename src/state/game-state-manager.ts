// Game state creation, serialization, save/load to ~/.empire-cli/saves/

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { GameState, SaveData, Army, WorldMap, PlayerIdentity } from '../game-types.js';
import { MAINLAND_MAP } from '../data/default-world-map.js';

const SAVES_DIR = join(homedir(), '.empire-cli', 'saves');

function ensureSavesDir(): void {
  if (!existsSync(SAVES_DIR)) {
    mkdirSync(SAVES_DIR, { recursive: true });
  }
}

/**
 * Create a fresh game state from a world map.
 */
const DEFAULT_IDENTITY: PlayerIdentity = {
  leaderName: 'Emperor',
  nationName: '',
  slogan: 'Glory awaits!',
};

export function newGame(
  playerFactionId: string,
  worldMap: WorldMap = MAINLAND_MAP,
  identity?: Partial<PlayerIdentity>,
): GameState {
  const territories = new Map(worldMap.territories.map((t) => [t.id, { ...t }]));
  const factions = new Map(worldMap.factions.map((f) => [f.id, { ...f, territories: [...f.territories] }]));

  // Build initial armies from territory data
  const armies = new Map<string, Army>();
  let armyCounter = 1;
  for (const territory of territories.values()) {
    if (territory.owner && territory.armies > 0) {
      const armyId = `army_start_${armyCounter++}`;
      armies.set(armyId, {
        id: armyId,
        factionId: territory.owner,
        units: territory.armies,
        morale: 80,
        territoryId: territory.id,
      });
    }
  }

  const playerFaction = factions.get(playerFactionId)!;
  const pid: PlayerIdentity = {
    leaderName: identity?.leaderName || DEFAULT_IDENTITY.leaderName,
    nationName: identity?.nationName || playerFaction.name,
    slogan: identity?.slogan || DEFAULT_IDENTITY.slogan,
  };

  return {
    turn: 1,
    mapId: worldMap.id,
    territories,
    factions,
    armies,
    playerFactionId,
    playerIdentity: pid,
    diplomacy: [],
    gameLog: [`${pid.leaderName} rises to lead ${pid.nationName}. ${pid.slogan}`],
    isOver: false,
    winner: null,
  };
}

/**
 * Serialize GameState to JSON-compatible SaveData.
 */
export function toSaveData(state: GameState): SaveData {
  return {
    turn: state.turn,
    mapId: state.mapId,
    playerIdentity: state.playerIdentity,
    territories: Object.fromEntries(state.territories),
    factions: Object.fromEntries(state.factions),
    armies: Object.fromEntries(state.armies),
    playerFactionId: state.playerFactionId,
    diplomacy: state.diplomacy,
    gameLog: state.gameLog.slice(-50), // keep last 50 entries
    isOver: state.isOver,
    winner: state.winner,
    savedAt: new Date().toISOString(),
  };
}

/**
 * Deserialize SaveData back into a live GameState.
 */
export function fromSaveData(data: SaveData): GameState {
  // Backfill buildings for old saves
  for (const t of Object.values(data.territories)) {
    if (!t.buildings) (t as any).buildings = [];
  }
  return {
    turn: data.turn,
    mapId: data.mapId ?? 'mainland',
    playerIdentity: data.playerIdentity ?? { leaderName: 'Emperor', nationName: '', slogan: 'Glory awaits!' },
    territories: new Map(Object.entries(data.territories)),
    factions: new Map(Object.entries(data.factions)),
    armies: new Map(Object.entries(data.armies)),
    playerFactionId: data.playerFactionId,
    diplomacy: data.diplomacy ?? [],
    gameLog: data.gameLog,
    isOver: data.isOver,
    winner: data.winner,
  };
}

/**
 * Save game to ~/.empire-cli/saves/<slot>.json
 */
export function saveGame(state: GameState, slot: string = 'autosave'): void {
  ensureSavesDir();
  const filePath = join(SAVES_DIR, `${slot}.json`);
  const data = toSaveData(state);
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Load game from ~/.empire-cli/saves/<slot>.json
 * Returns null if save not found.
 */
export function loadGame(slot: string = 'autosave'): GameState | null {
  ensureSavesDir();
  const filePath = join(SAVES_DIR, `${slot}.json`);
  if (!existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data: SaveData = JSON.parse(raw);
    return fromSaveData(data);
  } catch {
    return null;
  }
}

/**
 * List available save slots.
 */
export function listSaves(): string[] {
  ensureSavesDir();
  return readdirSync(SAVES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''));
}

/**
 * Check win condition: a faction owns all territories.
 */
export function checkWinCondition(state: GameState): string | null {
  const totalTerritories = state.territories.size;
  for (const faction of state.factions.values()) {
    if (faction.territories.length >= totalTerritories) {
      return faction.id;
    }
  }
  return null;
}
