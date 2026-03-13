// UI display helpers: icons, status, map, help text
import chalk from 'chalk';
import type { GameState } from '../game-types.js';
import { findArmyInTerritory } from '../engine/army-manager.js';
import { BUILDINGS } from '../engine/building-manager.js';
import { getFactionRelations } from '../engine/diplomacy-manager.js';

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
  // Diplomatic relations summary
  const rels = getFactionRelations(state.diplomacy, state.playerFactionId);
  if (rels.length > 0) {
    const relStrs = rels.map((r) => {
      const otherId = r.factionA === state.playerFactionId ? r.factionB : r.factionA;
      const other = state.factions.get(otherId);
      if (!other) return '';
      const icon = r.status === 'allied' ? '🤝' : r.status === 'peace' ? '🕊️ ' : '⚔️ ';
      const extra = r.turnsRemaining > 0 ? `(${r.turnsRemaining}t)` : '';
      return `${icon}${other.name}${extra}`;
    }).filter(Boolean);
    printLine(`  ${relStrs.join('  ')}`);
  }
  printSeparator();
}

export function printHelp(): void {
  printLine(chalk.cyan('\n  Commands:'));
  printLine('  map                         — show world map');
  printLine('  info <territory>            — show territory details');
  printLine('  status                      — show your resources');
  printLine('  move <from> <to> [n]        — move n units between territories (all if omitted)');
  printLine('  recruit <territory> <n>     — recruit n units (3💰 + 2🍖 each)');
  printLine('  attack <from> <to>          — attack enemy territory from yours');
  printLine('  build <territory> <type>    — build a structure (see below)');
  printLine('  next                        — end turn (enemies act after this)');
  printLine('  save [slot]                 — save game');
  printLine('  quit                        — exit game');
  printLine('  help                        — show this help');
  printLine('');
  printLine(chalk.cyan('  Diplomacy:'));
  printLine('  ally <faction>              — propose alliance');
  printLine('  peace <faction>             — propose peace treaty');
  printLine('  trade <faction> <n> <res> for <res> — trade resources');
  printLine('  diplo                       — view diplomatic relations');
  printLine('');
  printLine(chalk.cyan('  Buildings:'));
  for (const b of Object.values(BUILDINGS)) {
    const costParts = Object.entries(b.cost).filter(([, v]) => v > 0).map(([k, v]) => `${v}${ICONS[k] ?? k}`);
    printLine(`  ${b.icon} ${b.label.padEnd(10)} ${costParts.join(' ').padEnd(10)} ${b.description}`);
  }
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
    const bldgs = (t.buildings ?? []).map((b) => BUILDINGS[b]?.icon ?? '').join('');
    printLine(`  ${icon} ${colorFn(t.name.padEnd(14))} ${colorFn(ownerName)}${armies}${yours}${bldgs ? ' ' + bldgs : ''}`);
    const adjNames = t.adjacentTo.map((id) => state.territories.get(id)?.name ?? id).join(', ');
    printLine(chalk.gray(`     ↔ ${adjNames}`));
  }
  printLine('');
}

// Spatial ASCII map showing territory layout with connections
export function printSpatialMap(state: GameState): void {
  const g = (id: string) => {
    const t = state.territories.get(id);
    if (!t) return '???';
    const owner = t.owner ? state.factions.get(t.owner) : null;
    const colorFn = owner ? ((chalk as any)[owner.color] ?? chalk.white) : chalk.gray;
    const icon = ICONS[t.type] ?? '?';
    const armies = t.armies > 0 ? `⚔${t.armies}` : '';
    const star = t.owner === state.playerFactionId ? chalk.bold.green('★') : '';
    const bldg = (t.buildings ?? []).map((b) => BUILDINGS[b]?.icon ?? '').join('');
    // Pad name to 10 chars for alignment
    const label = t.name.slice(0, 10).padEnd(10);
    return `${icon}${colorFn(label)}${armies}${star}${bldg}`;
  };

  printLine(chalk.cyan('\n  ⚔️  World Map'));
  printLine('');
  printLine(`      ${g('northkeep')}────${g('iron_hills')}`);
  printLine(`           │                  │`);
  printLine(`      ${g('greenwood')}────${g('crossroads')}────${g('desert_gate')}`);
  printLine(`           │                  │`);
  printLine(`      ${g('silver_bay')}────${g('stonehaven')}`);
  printLine(`                              │`);
  printLine(`                         ${g('dragon_peak')}`);
  printLine('');

  // Legend
  const factions = [...state.factions.values()];
  const player = state.factions.get(state.playerFactionId)!;
  const playerColorFn = (chalk as any)[player.color] ?? chalk.white;
  printLine(`  ${chalk.bold.green('★')} = You (${playerColorFn(player.name)})`);
  const legend = [...state.factions.values()].map((f) => {
    const colorFn = (chalk as any)[f.color] ?? chalk.white;
    return colorFn(`■ ${f.name}(${f.territories.length})`);
  }).join('  ');
  printLine(`  ${legend}`);
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
  const bldgs = (t.buildings ?? []).map((b) => `${BUILDINGS[b]?.icon ?? ''} ${BUILDINGS[b]?.label ?? b}`).join(', ');
  printLine(`  Buildings: ${bldgs || 'none'}`);
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
