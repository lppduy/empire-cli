# Phase 1: Config Management

## Context
- [plan.md](./plan.md)
- Existing saves dir: `~/.empire-cli/saves/`
- State manager: `src/state/game-state-manager.ts`

## Overview
- **Priority**: High (blocks all other phases)
- **Status**: pending
- **Description**: Config file for narrator settings + first-run setup prompt

## Key Insights
- `~/.empire-cli/` dir already exists (created by game-state-manager.ts `ensureSavesDir()`)
- Config is separate from save files — lives at `~/.empire-cli/config.json`
- Must handle: no config (first run), config exists, config corrupt (fallback to defaults)

## Requirements

### Functional
- Load/save config from `~/.empire-cli/config.json`
- Default config: narrator disabled
- Type-safe config interface with optional fields
- First-run prompt: "Enable AI narrator? (y/n)" → if yes, ask provider + API key

### Non-functional
- Graceful on any fs error (permission, corrupt JSON)
- No blocking operations during gameplay

## Related Code Files

### Create
- `src/ai/narrator-config.ts` — config types, load, save, first-run setup

### Modify
- `src/index.ts` — call setup prompt before game loop (in `mainMenu()` or after faction select)

## Implementation Steps

1. Create `src/ai/` directory
2. Define `NarratorConfig` interface:
   ```ts
   interface NarratorConfig {
     enabled: boolean;
     provider: 'gemini' | 'ollama';
     apiKey?: string;
     ollamaModel?: string;
   }
   ```
3. Define `AppConfig` wrapping narrator config:
   ```ts
   interface AppConfig {
     narrator: NarratorConfig;
   }
   ```
4. Implement `loadConfig(): AppConfig` — read JSON, merge with defaults, handle errors
5. Implement `saveConfig(config: AppConfig): void` — write JSON
6. Implement `setupNarrator(askFn): Promise<NarratorConfig>` — interactive first-run setup
   - askFn is a `(prompt: string) => Promise<string>` to decouple from readline
   - Ask enable y/n → provider choice → API key (for Gemini) or model name (for Ollama)
7. Export `getOrSetupNarrator(askFn): Promise<NarratorConfig>` — loads config, runs setup if narrator field missing

## Todo List
- [ ] Create `src/ai/narrator-config.ts`
- [ ] NarratorConfig + AppConfig interfaces
- [ ] loadConfig / saveConfig functions
- [ ] setupNarrator interactive flow
- [ ] getOrSetupNarrator convenience function
- [ ] Wire into index.ts mainMenu (optional prompt on new game)

## Success Criteria
- `loadConfig()` returns valid defaults when no file exists
- `saveConfig()` persists and round-trips correctly
- Setup flow works: y → gemini → key → saved
- Setup flow works: n → narrator disabled → saved
- Corrupt config.json → defaults, no crash

## Risk
- User may not have write permissions to `~/.empire-cli/`. Mitigation: try/catch, disable narrator silently.
