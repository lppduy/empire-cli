// Game state creation, serialization, save/load to ~/.empire-cli/saves/

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { GameState, SaveData, Army } from '../game-types.js';
import { DEFAULT_TERRITORIES, DEFAULT_FACTIONS } from '../data/default-world-map.js';

const SAVES_DIR = join(homedir(), '.empire-cli', 'saves');

function ensureSavesDir(): void {
  if (!existsSync(SAVES_DIR)) {
    mkdirSync(SAVES_DIR, { recursive: true });
  }
}

/**
 * Create a fresh game state with default map and factions.
 */
export function newGame(playerFactionId: string): GameState {
  const territories = new Map(DEFAULT_TERRITORIES.map((t) => [t.id, { ...t }]));
  const factions = new Map(DEFAULT_FACTIONS.map((f) => [f.id, { ...f, territories: [...f.territories] }]));

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

  return {
    turn: 1,
    territories,
    factions,
    armies,
    playerFactionId,
    gameLog: ['A new empire rises. Your destiny awaits.'],
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
    territories: Object.fromEntries(state.territories),
    factions: Object.fromEntries(state.factions),
    armies: Object.fromEntries(state.armies),
    playerFactionId: state.playerFactionId,
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
    territories: new Map(Object.entries(data.territories)),
    factions: new Map(Object.entries(data.factions)),
    armies: new Map(Object.entries(data.armies)),
    playerFactionId: data.playerFactionId,
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
