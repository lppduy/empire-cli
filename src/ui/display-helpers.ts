// UI display helpers: icons, status, map, help text
import chalk from 'chalk';
import type { GameState } from '../game-types.js';
import { findArmyInTerritory } from '../engine/army-manager.js';

export const ICONS: Record<string, string> = {
  city: '🏰', forest: '🌲', mountain: '⛰️ ', plains: '🌾',
  gold: '💰', food: '🍖', wood: '🪵', stone: '🪨',
  army: '⚔️ ', skull: '💀', crown: '👑', shield: '🛡️ ',
  flag: '🚩', peace: '🕊️ ', fire: '🔥',
};

export function printLine(msg: string = ''): void {
  console.log(msg);
}

export function printSeparator(): void {
  console.log(chalk.gray('─'.repeat(60)));
}

export function printStatus(state: GameState): void {
  const player = state.factions.get(state.playerFactionId)!;
  const colorFn = (chalk as any)[player.color] ?? chalk.white;
  printSeparator();
  printLine(colorFn(`  ${ICONS.crown} ${player.name}  —  Turn ${state.turn}`));
  printLine(`  ${ICONS.gold} ${chalk.yellow(player.gold)}  ${ICONS.food} ${chalk.green(player.food)}  ${ICONS.wood} ${chalk.blue(player.wood)}  ${ICONS.stone} ${chalk.gray(player.stone)}`);
  printLine(`  ${ICONS.army} Armies: ${player.totalArmies}  |  ${ICONS.flag} Territories: ${player.territories.length}/${state.territories.size}`);
  printSeparator();
}

export function printHelp(): void {
  printLine(chalk.cyan('\n  Commands:'));
  printLine('  look                        — show world map');
  printLine('  info <territory>            — show territory details');
  printLine('  status                      — show your resources');
  printLine('  move <from> <to> [n]        — move n units between territories (all if omitted)');
  printLine('  recruit <territory> <n>     — recruit n units (3💰 + 2🍖 each)');
  printLine('  attack <from> <to>          — attack enemy territory from yours');
  printLine('  next                        — end turn (enemies act after this)');
  printLine('  save [slot]                 — save game');
  printLine('  quit                        — exit game');
  printLine('  help                        — show this help');
  printLine('');
}

export function printMap(state: GameState): void {
  const playerId = state.playerFactionId;
  printLine(chalk.cyan('\n  World Map:'));
  printLine('');
  for (const t of state.territories.values()) {
    const ownerFaction = t.owner ? state.factions.get(t.owner) : null;
    const ownerName = ownerFaction?.name ?? chalk.gray('Unclaimed');
    const colorFn = ownerFaction ? ((chalk as any)[ownerFaction.color] ?? chalk.white) : chalk.gray;
    const icon = ICONS[t.type] ?? '?';
    const armies = t.armies > 0 ? ` ${ICONS.army} ${t.armies}` : '';
    const yours = t.owner === playerId ? chalk.green(' ★') : '';
    printLine(`  ${icon} ${colorFn(t.name.padEnd(14))} ${colorFn(ownerName)}${armies}${yours}`);
    const adjNames = t.adjacentTo.map((id) => state.territories.get(id)?.name ?? id).join(', ');
    printLine(chalk.gray(`     ↔ ${adjNames}`));
  }
  printLine('');
}

// Show detailed info about a specific territory
export function printTerritoryInfo(state: GameState, territoryName: string): void {
  const t = [...state.territories.values()].find(
    (t) => t.name.toLowerCase().includes(territoryName.toLowerCase())
  );
  if (!t) { printLine(chalk.red(`Territory "${territoryName}" not found.`)); return; }

  const ownerFaction = t.owner ? state.factions.get(t.owner) : null;
  const colorFn = ownerFaction ? ((chalk as any)[ownerFaction.color] ?? chalk.white) : chalk.gray;
  const icon = ICONS[t.type] ?? '';
  const playerId = state.playerFactionId;

  printLine(`\n  ${icon} ${colorFn(t.name)} (${t.type})`);
  printLine(`  Owner: ${ownerFaction?.name ?? 'Unclaimed'}`);
  printLine(`  ${ICONS.army} Armies: ${t.armies}`);
  printLine(`  Resources/turn: ${ICONS.gold}${t.resources.gold} ${ICONS.food}${t.resources.food} ${ICONS.wood}${t.resources.wood} ${ICONS.stone}${t.resources.stone}`);
  printLine(`  Neighbors:`);
  for (const adjId of t.adjacentTo) {
    const adj = state.territories.get(adjId)!;
    const adjOwner = adj.owner ? state.factions.get(adj.owner)?.name ?? '?' : 'Unclaimed';
    const adjIcon = ICONS[adj.type] ?? '';
    const threat = adj.owner !== playerId && adj.armies > 0 ? chalk.red(` ${ICONS.army}${adj.armies}`) : '';
    const friendly = adj.owner === playerId ? chalk.green(` ★`) : '';
    printLine(`    → ${adjIcon} ${adj.name} — ${adjOwner}${friendly}${threat}`);
  }
  printLine('');
}
