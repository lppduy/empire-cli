# Phase 4: Game Loop Integration

## Context
- [plan.md](./plan.md)
- Main loop: `src/index.ts` (409 lines)
- Phases 1-3 provide: config, client, prompts

## Overview
- **Priority**: High
- **Status**: pending
- **Description**: Wire narrator into game loop. Create facade module and add calls at key points.

## Key Insights
- `index.ts` is already 409 lines (over 200-line guideline). Add minimal code; facade handles complexity.
- Narration is fire-and-print: `const text = await narrator.narrate(event, ctx); if (text) printLine(text);`
- Must not slow down gameplay. Use `Promise.race` with timeout in client (phase 2), so integration code is simple await.
- Narrator state (enabled + config) loaded once at game start, passed through or stored in module scope.

## Requirements

### Functional
- `src/ai/narrator.ts` — facade with `init(config)`, `narrateBattle(ctx)`, `narrateTurnEnd(ctx)`, `narrateGameOver(ctx)`
- Integration in `index.ts`:
  1. After faction select (new game) or load: call narrator setup if needed, then `narrator.init(config)`
  2. After attack command resolution: `await narrator.narrateBattle(battleCtx)`
  3. After end-of-turn AI actions: `await narrator.narrateTurnEnd(turnCtx)`
  4. After win condition: `await narrator.narrateGameOver(gameOverCtx)`
- Menu option "5. Narrator Settings" in main menu (reconfigure without new game)

### Non-functional
- If narrator disabled, all narrate* calls return immediately (no async overhead)
- Max 2 API calls per turn (battle + turn summary). Skip capture narration if battle already narrated.

## Related Code Files

### Create
- `src/ai/narrator.ts` — public facade

### Modify
- `src/index.ts` — add narrator calls at 4 integration points + menu option

## Implementation Steps

1. Create `src/ai/narrator.ts`:
   ```ts
   let config: NarratorConfig | null = null;

   export function init(cfg: NarratorConfig): void { config = cfg; }
   export function isEnabled(): boolean { return config?.enabled ?? false; }

   export async function narrateBattle(ctx: BattleContext): Promise<string | null> {
     if (!isEnabled()) return null;
     const prompt = buildBattlePrompt(ctx);
     return generateNarration(prompt, config!);
   }
   // ... narrateTurnEnd, narrateGameOver similar
   ```

2. Modify `index.ts` — import narrator module:
   ```ts
   import * as narrator from './ai/narrator.js';
   import { loadConfig, getOrSetupNarrator } from './ai/narrator-config.js';
   ```

3. In `mainMenu()` after faction select / game load:
   ```ts
   const appConfig = loadConfig();
   if (!appConfig.narrator) {
     const narratorCfg = await getOrSetupNarrator(ask);
     appConfig.narrator = narratorCfg;
   }
   narrator.init(appConfig.narrator);
   ```

4. In `processCommand` attack case, after combat resolution (line ~119-140):
   ```ts
   // After result.log.forEach...
   const narration = await narrator.narrateBattle({
     attackerFaction: player.name,
     defenderFaction: oldOwnerName,
     fromTerritory: from.name,
     toTerritory: to.name,
     terrainType: to.type,
     attackerUnits, defenderUnits: to.armies,
     outcome: result.outcome,
     captured: result.captured,
     attackerCasualties: result.attackerCasualties,
     defenderCasualties: result.defenderCasualties,
   });
   if (narration) printLine(chalk.italic.magenta(`\n  ${narration}`));
   ```

5. In game loop after AI turns and resource logs (~line 247-256):
   ```ts
   const turnNarration = await narrator.narrateTurnEnd({
     playerFaction: player.name, turn: state.turn,
     territoriesOwned: player.territories.length,
     totalTerritories: state.territories.size,
     enemyActions: aiLogs,
   });
   if (turnNarration) printLine(chalk.italic.magenta(`\n  ${turnNarration}`));
   ```

6. After win condition (~line 262):
   ```ts
   const endNarration = await narrator.narrateGameOver({
     winnerFaction: state.factions.get(winner)!.name,
     playerFaction: player.name,
     turn: state.turn,
     isPlayerWinner: winner === state.playerFactionId,
   });
   if (endNarration) printLine(chalk.italic.magenta(`\n  ${endNarration}\n`));
   ```

7. Add menu option 5 in mainMenu:
   ```ts
   printLine('  5. Narrator Settings');
   // In choice handling:
   if (choice === '5') {
     const cfg = await getOrSetupNarrator(ask);
     saveConfig({ narrator: cfg });
     narrator.init(cfg);
     return mainMenu();
   }
   ```

## Todo List
- [ ] Create `src/ai/narrator.ts` facade
- [ ] Wire narrator init into game start flow
- [ ] Add battle narration after attack command
- [ ] Add turn-end narration
- [ ] Add game-over narration
- [ ] Add narrator settings menu option
- [ ] Print narration in italic magenta (visually distinct)

## Success Criteria
- Game starts and plays normally with narrator disabled
- With Gemini key: battle narration appears after attacks
- Turn summary narration appears at end of each turn
- Game over produces dramatic narration
- API failure: no crash, no visible error, game continues
- Menu option 5 allows reconfiguring narrator

## Risk
- index.ts growing larger. Keep integration code minimal (just imports + 1-line calls). Facade does the work.
- Await in processCommand makes attack slightly slower (~1-3s). Acceptable for dramatic effect.
