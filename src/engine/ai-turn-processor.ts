// AI faction turn processing — simple decision-making for enemy factions
import type { GameState } from '../game-types.js';
import { resolveCombat } from './combat-resolver.js';
import { findArmyInTerritory, getUnitsInTerritory, applyCasualties } from './army-manager.js';

export function runAiTurns(state: GameState): string[] {
  const log: string[] = [];
  for (const faction of state.factions.values()) {
    if (faction.id === state.playerFactionId) continue;
    if (faction.territories.length === 0) continue;

    // Simple AI: recruit if has resources, then try to expand
    // Recruit in first territory if affordable
    if (faction.gold >= 6 && faction.food >= 4) {
      const recruitTerrId = faction.territories[0];
      const recruitTerr = state.territories.get(recruitTerrId);
      if (recruitTerr) {
        const units = Math.min(Math.floor(faction.gold / 3), Math.floor(faction.food / 2), 3);
        if (units > 0) {
          faction.gold -= units * 3;
          faction.food -= units * 2;
          faction.totalArmies += units;
          recruitTerr.armies += units;
          // Create/merge army record
          const existing = findArmyInTerritory(faction.id, recruitTerrId, state.armies);
          if (existing) { existing.units += units; }
          else {
            const id = `ai_army_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            state.armies.set(id, { id, factionId: faction.id, units, morale: 80, territoryId: recruitTerrId });
          }
          log.push(`${faction.name} recruited ${units} units in ${recruitTerr.name}`);
        }
      }
    }

    // Try to attack one adjacent weak territory
    for (const territoryId of [...faction.territories]) {
      const territory = state.territories.get(territoryId)!;
      for (const adjId of territory.adjacentTo) {
        const adj = state.territories.get(adjId)!;
        if (adj.owner === faction.id) continue;

        const attackerUnits = getUnitsInTerritory(faction.id, territoryId, state.armies);
        const defenderUnits = adj.armies;

        if (attackerUnits < 2) continue;
        if (attackerUnits < defenderUnits && faction.personality !== 'aggressive') continue;

        const result = resolveCombat(attackerUnits, 80, defenderUnits, 80, adj.type);
        log.push(`${faction.name} attacks ${adj.name} from ${territory.name}!`);

        const attackerArmy = findArmyInTerritory(faction.id, territoryId, state.armies);
        if (attackerArmy) applyCasualties(attackerArmy, result.attackerCasualties, faction, state.armies, territory);

        if (result.captured) {
          const oldOwner = adj.owner ? state.factions.get(adj.owner) : null;
          if (oldOwner) {
            oldOwner.territories = oldOwner.territories.filter((id) => id !== adjId);
            const defArmy = findArmyInTerritory(adj.owner!, adjId, state.armies);
            if (defArmy) applyCasualties(defArmy, result.defenderCasualties, oldOwner, state.armies, adj);
          }
          adj.owner = faction.id;
          adj.armies = attackerArmy?.units ?? 0;
          faction.territories.push(adjId);
          log.push(`  → ${faction.name} captured ${adj.name}! ${ICONS_FIRE}`);
        } else {
          log.push(`  → Attack on ${adj.name} failed`);
        }
        return log; // one attack per faction per turn
      }
    }
  }
  return log;
}

const ICONS_FIRE = '🔥';
