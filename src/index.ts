#!/usr/bin/env node
// Empire CLI — main entry point: menu, game loop, command dispatch
// General (👑) commands armies from above — no player cursor

import readline from 'readline';
import chalk from 'chalk';
import type { GameState, Territory, Faction } from './game-types.js';
import { newGame, saveGame, loadGame, listSaves, checkWinCondition } from './state/game-state-manager.js';
import { processTurnResources } from './engine/resource-calculator.js';
import { resolveCombat } from './engine/combat-resolver.js';
import { recruitArmy, findArmyInTerritory, applyCasualties, getUnitsInTerritory, ensureArmyRecord } from './engine/army-manager.js';
import { buildStructure, BUILDINGS, getRecruitGoldCost } from './engine/building-manager.js';
import type { BuildingType } from './game-types.js';
import { printLine, printSeparator, printStatus, printHelp, printSpatialMap, printTerritoryInfo, ICONS } from './ui/display-helpers.js';
import { runAiTurns } from './engine/ai-turn-processor.js';
import * as narrator from './ai/narrator.js';
import { loadConfig, saveConfig, setupNarrator, getOrSetupNarrator } from './ai/narrator-config.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

// ─── Territory finder helper ─────────────────────────────────────────────────

function findTerritory(state: GameState, name: string): Territory | undefined {
  return [...state.territories.values()].find(
    (t) => t.name.toLowerCase().includes(name.toLowerCase())
  );
}

// ─── Command processing ─────────────────────────────────────────────────────

async function processCommand(input: string, state: GameState): Promise<boolean> {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase() ?? '';
  const args = parts.slice(1);
  const player = state.factions.get(state.playerFactionId)!;

  switch (cmd) {
    case 'map': printSpatialMap(state); break;
    case 'status': printStatus(state); break;
    case 'help': printHelp(); break;

    case 'info': {
      if (!args[0]) { printLine('Usage: info <territory>'); break; }
      printTerritoryInfo(state, args.join(' '));
      break;
    }

    case 'move': {
      // move <from> <to> [n]
      if (args.length < 2) { printLine('Usage: move <from> <to> [units]'); break; }
      const lastArg = args[args.length - 1];
      const unitCount = /^\d+$/.test(lastArg) ? parseInt(lastArg, 10) : 0;
      // Split args: try to find two territory names, optional number at end
      const nameArgs = unitCount > 0 ? args.slice(0, -1) : args;
      const { from, to } = parseTwoTerritories(state, nameArgs);
      if (!from || !to) { printLine(chalk.red('Could not find those territories. Try: move northkeep greenwood 3')); break; }
      if (!from.adjacentTo.includes(to.id)) { printLine(chalk.red(`${to.name} is not adjacent to ${from.name}.`)); break; }
      if (from.owner !== player.id) { printLine(chalk.red(`You don't own ${from.name}.`)); break; }

      ensureArmyRecord(player.id, from, state.armies);
      const army = findArmyInTerritory(player.id, from.id, state.armies);
      if (!army || army.units === 0) { printLine(chalk.red(`No army in ${from.name}.`)); break; }

      const MIN_GARRISON = 2;
      const movable = army.units - MIN_GARRISON;
      if (movable <= 0) { printLine(chalk.red(`Cannot move — need at least ${MIN_GARRISON} garrison in ${from.name}. (${army.units} units, ${movable} movable)`)); break; }
      const toMove = unitCount > 0 ? Math.min(unitCount, movable) : movable;
      const remaining = army.units - toMove;
      if (toMove === 0) { printLine(chalk.red(`No movable units. ${army.units} in ${from.name}, ${MIN_GARRISON} must garrison.`)); break; }

      // Update source
      if (remaining > 0) { army.units = remaining; from.armies = remaining; }
      else { from.armies -= toMove; state.armies.delete(army.id); }

      // Update destination — merge if friendly army exists
      const destArmy = findArmyInTerritory(player.id, to.id, state.armies);
      if (destArmy) { destArmy.units += toMove; }
      else { state.armies.set(`army_${Date.now()}`, { id: `army_${Date.now()}`, factionId: player.id, units: toMove, morale: army.morale, territoryId: to.id }); }
      to.armies += toMove;

      const leftMsg = remaining > 0 ? chalk.gray(` (${remaining} garrison ${from.name})`) : '';
      printLine(chalk.green(`${ICONS.army} Moved ${toMove} units: ${from.name} → ${to.name}${leftMsg}`));
      break;
    }

    case 'recruit': {
      // recruit <territory> <n>
      if (args.length < 2) { printLine('Usage: recruit <territory> <n>'); break; }
      const n = parseInt(args[args.length - 1], 10);
      if (!n || n < 1) { printLine('Usage: recruit <territory> <n>'); break; }
      const terrName = args.slice(0, -1).join(' ');
      const terr = findTerritory(state, terrName);
      if (!terr) { printLine(chalk.red(`Territory "${terrName}" not found.`)); break; }
      if (terr.owner !== player.id) { printLine(chalk.red(`You don't own ${terr.name}.`)); break; }

      const err = recruitArmy(player, terr, n, state.armies);
      if (err) { printLine(chalk.red(err)); break; }
      const goldCost = getRecruitGoldCost(terr);
      printLine(chalk.green(`${ICONS.shield} Recruited ${n} units in ${terr.name}. (${ICONS.gold}-${n * goldCost} ${ICONS.food}-${n * 2})`));
      break;
    }

    case 'attack': {
      // attack <from> <to>
      if (args.length < 2) { printLine('Usage: attack <from> <to>'); break; }
      const { from, to } = parseTwoTerritories(state, args);
      if (!from || !to) { printLine(chalk.red('Could not find those territories.')); break; }
      if (from.owner !== player.id) { printLine(chalk.red(`You don't own ${from.name}.`)); break; }
      if (to.owner === player.id) { printLine(chalk.red(`You already own ${to.name}.`)); break; }
      if (!from.adjacentTo.includes(to.id)) { printLine(chalk.red(`${to.name} is not adjacent to ${from.name}.`)); break; }

      ensureArmyRecord(player.id, from, state.armies);
      const attackerArmy = findArmyInTerritory(player.id, from.id, state.armies);
      if (!attackerArmy || attackerArmy.units === 0) { printLine(chalk.red(`No army in ${from.name}.`)); break; }

      printLine(chalk.yellow(`\n  ${ICONS.fire} Battle: ${from.name} (${attackerArmy.units}) → ${to.name} (${to.armies})`));
      const result = resolveCombat(attackerArmy.units, attackerArmy.morale, to.armies, 80, to.type, to);
      result.log.forEach((l) => printLine(`  ${l}`));

      const defenderFaction = to.owner ? state.factions.get(to.owner)?.name ?? 'Unknown' : 'Unclaimed';
      const preAttackUnits = attackerArmy.units;
      const preDefenderUnits = to.armies;
      applyCasualties(attackerArmy, result.attackerCasualties, player, state.armies, from);
      if (result.captured) {
        const oldOwner = to.owner ? state.factions.get(to.owner) : null;
        if (oldOwner) {
          const defArmy = findArmyInTerritory(to.owner!, to.id, state.armies);
          if (defArmy) applyCasualties(defArmy, result.defenderCasualties, oldOwner, state.armies, to);
          oldOwner.territories = oldOwner.territories.filter((id) => id !== to.id);
        }
        to.owner = player.id;
        const survivingUnits = attackerArmy?.units ?? 0;
        from.armies -= survivingUnits;
        to.armies = survivingUnits;
        if (attackerArmy) { attackerArmy.territoryId = to.id; }
        player.territories.push(to.id);
        printLine(chalk.green(`\n  ${ICONS.flag} You captured ${to.name}!`));
        state.gameLog.push(`Turn ${state.turn}: Captured ${to.name}`);
      } else {
        printLine(chalk.red(`\n  ${ICONS.skull} The attack failed.`));
      }
      // AI narrator: battle narration
      const battleNarration = await narrator.narrateBattle({
        attackerFaction: player.name, defenderFaction,
        fromTerritory: from.name, toTerritory: to.name, terrainType: to.type,
        attackerUnits: preAttackUnits, defenderUnits: preDefenderUnits,
        captured: result.captured, attackerCasualties: result.attackerCasualties,
        defenderCasualties: result.defenderCasualties,
      });
      if (battleNarration) printLine(chalk.italic.magenta(`\n  📜 ${battleNarration}`));
      break;
    }

    case 'build': {
      // build <territory> <type>
      if (args.length < 2) {
        printLine('Usage: build <territory> <walls|barracks|market>');
        printLine('');
        for (const b of Object.values(BUILDINGS)) {
          const costParts = Object.entries(b.cost).filter(([, v]) => v > 0).map(([k, v]) => `${v}${k[0]}`);
          printLine(`  ${b.icon} ${b.label.padEnd(10)} ${costParts.join(' ').padEnd(12)} ${b.description}`);
        }
        printLine('');
        break;
      }
      const buildType = args[args.length - 1].toLowerCase() as BuildingType;
      const buildTerrName = args.slice(0, -1).join(' ');
      const buildTerr = findTerritory(state, buildTerrName);
      if (!buildTerr) { printLine(chalk.red(`Territory "${buildTerrName}" not found.`)); break; }
      const buildErr = buildStructure(player, buildTerr, buildType);
      if (buildErr) { printLine(chalk.red(buildErr)); break; }
      const def = BUILDINGS[buildType];
      const costStr = Object.entries(def.cost).filter(([, v]) => v > 0).map(([k, v]) => `${ICONS[k] ?? k}-${v}`).join(' ');
      printLine(chalk.green(`${def.icon} Built ${def.label} in ${buildTerr.name}! (${costStr})`));
      break;
    }

    case 'save': {
      saveGame(state, args[0] ?? 'autosave');
      printLine(chalk.green(`Game saved to "${args[0] ?? 'autosave'}".`));
      break;
    }

    case 'next': return true;

    case 'quit': case 'exit':
      printLine(chalk.gray('Farewell, Emperor.'));
      rl.close(); process.exit(0); break;

    default:
      printLine(chalk.red(`Unknown command: "${cmd}". Type help.`));
  }
  return false;
}

// ─── Parse two territory names from args ─────────────────────────────────────
// Tries to match territory names greedily from left, then right
function parseTwoTerritories(state: GameState, args: string[]): { from: Territory | undefined; to: Territory | undefined } {
  // Try splitting at each position
  for (let i = 1; i < args.length; i++) {
    const fromName = args.slice(0, i).join(' ');
    const toName = args.slice(i).join(' ');
    const from = findTerritory(state, fromName);
    const to = findTerritory(state, toName);
    if (from && to && from.id !== to.id) return { from, to };
  }
  return { from: undefined, to: undefined };
}

// ─── Game loop ───────────────────────────────────────────────────────────────

async function runGameLoop(state: GameState): Promise<void> {
  printLine(chalk.bold.cyan(`\n  ${ICONS.crown} Welcome to Empire CLI ${ICONS.army}\n`));
  printHelp();

  const MAX_ACTIONS = 3; // actions per turn (look/info/status/help don't count)
  const FREE_CMDS = new Set(['map', 'info', 'status', 'help', 'save']);

  while (!state.isOver) {
    printStatus(state);
    let turnEnded = false;
    let actionsUsed = 0;
    while (!turnEnded) {
      const remaining = MAX_ACTIONS - actionsUsed;
      const input = await ask(chalk.cyan(`  Turn ${state.turn} [${remaining}/${MAX_ACTIONS} actions] > `));
      const cmd = input.trim().split(/\s+/)[0]?.toLowerCase() ?? '';

      // Free commands don't consume actions
      if (FREE_CMDS.has(cmd)) {
        turnEnded = await processCommand(input, state);
        continue;
      }
      if (cmd === 'next') { turnEnded = true; continue; }
      if (cmd === 'quit' || cmd === 'exit') { await processCommand(input, state); continue; }

      // Action commands consume 1 action
      turnEnded = await processCommand(input, state);
      if (!turnEnded) actionsUsed++;

      // Auto-end turn when actions exhausted
      if (actionsUsed >= MAX_ACTIONS && !turnEnded) {
        printLine(chalk.yellow(`\n  ⏰ No actions remaining — turn ends automatically.`));
        turnEnded = true;
      }
    }

    // === End of Turn ===
    printLine(''); printSeparator();
    printLine(chalk.bold.yellow(`  --- End of Turn ${state.turn} ---`));
    printLine('');

    const resLogs: string[] = [];
    for (const f of state.factions.values()) resLogs.push(...processTurnResources(f, state.territories));
    const playerResLogs = resLogs.filter((l) => l.includes(state.factions.get(state.playerFactionId)!.name));
    playerResLogs.forEach((l) => printLine(chalk.gray(`  ${l}`)));

    const aiLogs = runAiTurns(state);
    if (aiLogs.length > 0) {
      printLine(''); printLine(chalk.bold.red(`  ${ICONS.fire} Enemy Actions:`));
      aiLogs.forEach((l) => printLine(chalk.red(`  ${l}`)));
    } else {
      printLine(chalk.gray('  The other factions bide their time...'));
    }

    [...resLogs, ...aiLogs].forEach((l) => state.gameLog.push(l));

    // AI narrator: turn summary
    const pFaction = state.factions.get(state.playerFactionId)!;
    const turnNarration = await narrator.narrateTurnEnd({
      playerFaction: pFaction.name, turn: state.turn,
      territoriesOwned: pFaction.territories.length,
      totalTerritories: state.territories.size,
      enemyActions: aiLogs,
    });
    if (turnNarration) printLine(chalk.italic.magenta(`\n  📜 ${turnNarration}`));

    printLine(''); printSeparator();
    state.turn++;

    const winner = checkWinCondition(state);
    if (winner) {
      state.isOver = true; state.winner = winner;
      printLine(chalk.bold.yellow(`\n  ${ICONS.crown} ${state.factions.get(winner)!.name} has conquered the world! Game over.\n`));
      // AI narrator: game over
      const endNarration = await narrator.narrateGameOver({
        winnerFaction: state.factions.get(winner)!.name,
        playerFaction: state.factions.get(state.playerFactionId)!.name,
        turn: state.turn, isPlayerWinner: winner === state.playerFactionId,
      });
      if (endNarration) printLine(chalk.italic.magenta(`  📜 ${endNarration}\n`));
      printLine('  1. Play Again');
      printLine('  2. Exit\n');
      const choice = await ask('  Choose: ');
      if (choice.trim() === '1') { return mainMenu(); }
      else { rl.close(); process.exit(0); }
    }
  }
}

// ─── Main menu ───────────────────────────────────────────────────────────────

async function mainMenu(): Promise<void> {
  printLine(chalk.bold.cyan('\n  ╔════════════════════════════╗'));
  printLine(chalk.bold.cyan('  ║  ⚔️  E M P I R E  CLI  👑  ║'));
  printLine(chalk.bold.cyan('  ╚════════════════════════════╝\n'));
  printLine('  1. New Game');
  printLine('  2. Load Game');
  printLine('  3. Tutorial');
  printLine('  4. Narrator Settings');
  printLine('  5. Quit\n');

  const choice = await ask('  Choose: ');
  if (choice.trim() === '3') {
    await showTutorial();
    return mainMenu();
  }
  if (choice.trim() === '4') {
    const cfg = await setupNarrator(ask);
    saveConfig({ narrator: cfg });
    narrator.init(cfg);
    return mainMenu();
  }
  if (choice.trim() === '5') { rl.close(); process.exit(0); }
  if (choice.trim() === '1') {
    printLine('\nChoose your faction:');
    printLine('  1. 🔴 Iron Legion (aggressive)');
    printLine('  2. 🟢 Green Pact (defensive)');
    printLine('  3. 🟡 Sand Empire (mercantile)');
    printLine('  4. 🟣 Void Covenant (diplomatic)\n');
    const fc = await ask('  Choose: ');
    const fm: Record<string, string> = { '1': 'iron_legion', '2': 'green_pact', '3': 'sand_empire', '4': 'void_covenant' };
    // Init narrator from saved config
    const appConfig = loadConfig();
    narrator.init(appConfig.narrator);
    await runGameLoop(newGame(fm[fc.trim()] ?? 'iron_legion'));
  } else if (choice.trim() === '2') {
    const saves = listSaves();
    if (saves.length === 0) { printLine(chalk.red('No saves found.')); return mainMenu(); }
    saves.forEach((s, i) => printLine(`  ${i + 1}. ${s}`));
    const slot = await ask('  Slot name: ');
    const state = loadGame(slot.trim());
    if (!state) { printLine(chalk.red('Save not found.')); return mainMenu(); }
    const appConfig2 = loadConfig();
    narrator.init(appConfig2.narrator);
    await runGameLoop(state);
  } else { rl.close(); process.exit(0); }
}

// ─── Tutorial ────────────────────────────────────────────────────────────────

async function showTutorial(): Promise<void> {
  const pages = [
    // Page 1: Overview
    [
      chalk.bold.cyan('\n  ═══ HOW TO PLAY ═══\n'),
      chalk.bold('  🎯 Goal'),
      '  Conquer all 8 territories on the map to win.',
      '  You start with 2 territories. Enemy factions hold the rest.',
      '',
      chalk.bold('  ⏳ Turns'),
      '  Each turn you get 3 actions. Actions are:',
      '    • recruit — train new soldiers',
      '    • move    — march armies between territories',
      '    • attack  — invade enemy territory',
      '    • build   — construct buildings',
      '',
      '  Free commands (unlimited): map, info, status, help, save',
      '  Type "next" to end your turn early.',
    ],
    // Page 2: Economy & Resources
    [
      chalk.bold.cyan('\n  ═══ RESOURCES ═══\n'),
      chalk.bold('  💰 Gold  — recruit armies (3g each, 2g with barracks)'),
      chalk.bold('  🍖 Food  — recruit armies (2f each) + army upkeep (1f/unit/turn)'),
      chalk.bold('  🪵 Wood  — build structures'),
      chalk.bold('  🪨 Stone — build structures'),
      '',
      '  Each territory produces resources every turn.',
      '  More territories = more income = bigger army.',
      '',
      chalk.bold('  💡 Tip: ') + 'Use "info <territory>" to see resource output.',
    ],
    // Page 3: Combat
    [
      chalk.bold.cyan('\n  ═══ COMBAT ═══\n'),
      '  Attack from YOUR territory into an ADJACENT enemy territory.',
      '  Example: attack crossroads greenwood',
      '',
      chalk.bold('  Terrain defense bonuses:'),
      '    🌾 Plains   — x1.0 (no bonus)',
      '    🌲 Forest   — x1.2',
      '    🏰 City     — x1.3',
      '    ⛰️  Mountain — x1.5',
      '',
      chalk.bold('  Outcomes depend on power ratio:'),
      '    2:1+ → Decisive victory (low losses)',
      '    1.2:1 → Victory (moderate losses)',
      '    ~1:1 → Pyrrhic (heavy losses both sides)',
      '    Below → Defeat (you lose units, they don\'t)',
      '',
      chalk.bold('  💡 Tip: ') + 'Outnumber defenders 2:1 for clean wins.',
    ],
    // Page 4: Buildings
    [
      chalk.bold.cyan('\n  ═══ BUILDINGS ═══\n'),
      '  Build structures to strengthen your territories.',
      '  Command: build <territory> <type>',
      '',
      '  🧱 Walls      10🪵 15🪨   +0.3 defense bonus',
      '  🏛️ Barracks    8🪵  5🪨   recruit costs 2💰 instead of 3💰',
      '  🏪 Market     10💰  5🪵 3🪨  +2💰 income per turn',
      '',
      '  Each territory can have all 3 buildings.',
      '  Buildings show as icons on the map next to your territory.',
      '',
      chalk.bold('  💡 Tip: ') + 'Build markets early for economy, walls on borders.',
    ],
    // Page 5: Strategy
    [
      chalk.bold.cyan('\n  ═══ STRATEGY TIPS ═══\n'),
      '  1. Don\'t rush — build your economy first (markets!)',
      '  2. Recruit in bulk, then attack with overwhelming force',
      '  3. Mountains are hard to capture — bring 2x defenders',
      '  4. Each territory keeps a garrison of 2 when moving',
      '  5. Watch enemy actions at end of turn — defend borders',
      '  6. Build barracks in your main recruiting territory',
      '  7. Build walls on border territories facing enemies',
      '',
      chalk.bold('  🏆 Factions:'),
      '  🔴 Iron Legion  — starts strong, aggressive AI',
      '  🟢 Green Pact   — high food/wood, defensive AI',
      '  🟡 Sand Empire  — rich in gold, balanced AI',
      '  🟣 Void Covenant — mountain fortress, cautious AI',
    ],
  ];

  for (let i = 0; i < pages.length; i++) {
    pages[i].forEach((line) => printLine(line));
    printLine('');
    if (i < pages.length - 1) {
      await ask(chalk.gray(`  [Page ${i + 1}/${pages.length}] Press Enter for next page...`));
    } else {
      await ask(chalk.gray(`  [Page ${pages.length}/${pages.length}] Press Enter to return to menu...`));
    }
  }
}


mainMenu().catch((err) => { console.error(chalk.red('Fatal:'), err); process.exit(1); });
