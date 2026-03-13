# Phase 3: Prompt Templates

## Context
- [plan.md](./plan.md)
- Game types: `src/game-types.ts`

## Overview
- **Priority**: Medium
- **Status**: pending
- **Description**: Prompt builders for each narration event, producing short epic fantasy flavor text

## Key Insights
- Prompts must be SHORT to minimize token usage and latency
- System instruction: "You are a dramatic fantasy narrator for a strategy game. Write 1-2 sentences max. Be vivid and concise."
- Context injection: faction names, territory names, battle outcome, unit counts
- Batch turn-end events into a single prompt to reduce API calls (stay under 10 RPM)

## Requirements

### Functional
- `buildBattlePrompt(context)` — after combat resolution
- `buildCapturePrompt(context)` — after territory captured
- `buildTurnSummaryPrompt(context)` — end-of-turn with resource/enemy info
- `buildGameOverPrompt(context)` — victory or defeat
- `getSystemInstruction()` — shared system prompt for all narrations

### Non-functional
- Total prompt size < 500 tokens (fast response)
- Context types should be simple plain objects, not full GameState

## Related Code Files

### Create
- `src/ai/narrator-prompts.ts`

## Implementation Steps

1. Define event context types:
   ```ts
   interface BattleContext {
     attackerFaction: string; defenderFaction: string;
     fromTerritory: string; toTerritory: string; terrainType: string;
     attackerUnits: number; defenderUnits: number;
     outcome: string; captured: boolean;
     attackerCasualties: number; defenderCasualties: number;
   }
   interface TurnSummaryContext {
     playerFaction: string; turn: number;
     territoriesOwned: number; totalTerritories: number;
     enemyActions: string[]; // raw log lines
   }
   interface GameOverContext {
     winnerFaction: string; playerFaction: string;
     turn: number; isPlayerWinner: boolean;
   }
   ```
2. Implement `getSystemInstruction()`:
   ```
   "You are the narrator of an epic fantasy strategy game. Write exactly 1-2 vivid sentences. No lists, no questions. Use dramatic tone."
   ```
3. Implement each prompt builder — inject context into a short template:
   - Battle: "The {attacker} ({units}) attacked {territory} held by {defender} ({units}). Outcome: {outcome}. Narrate this battle."
   - Capture: "The {faction} conquered {territory} ({terrain}). Their empire now holds {n}/{total} territories. Narrate."
   - Turn summary: "Turn {n} ended. {faction} holds {n} territories. Events: {events}. Narrate briefly."
   - Game over: "{faction} has conquered the world on turn {n}. Narrate the {victory|defeat}."

## Todo List
- [ ] Create `src/ai/narrator-prompts.ts`
- [ ] Context type definitions
- [ ] getSystemInstruction
- [ ] buildBattlePrompt
- [ ] buildCapturePrompt (can reuse battle context when captured=true)
- [ ] buildTurnSummaryPrompt
- [ ] buildGameOverPrompt

## Success Criteria
- Each prompt < 200 words
- Context types are minimal (no full GameState dependency)
- Prompts produce coherent narration when tested manually with Gemini
