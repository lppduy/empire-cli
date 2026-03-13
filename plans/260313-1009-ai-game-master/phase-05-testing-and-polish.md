# Phase 5: Testing & Polish

## Context
- [plan.md](./plan.md)
- All phases 1-4 completed

## Overview
- **Priority**: Medium
- **Status**: pending
- **Description**: Manual testing, edge cases, build verification

## Requirements

### Test Scenarios
1. **No config file**: first run → setup prompt appears → narrator works after setup
2. **Narrator disabled**: game plays identically to current behavior
3. **Invalid API key**: narration silently skipped, game continues
4. **Ollama not running**: narration silently skipped
5. **Ollama running**: narration appears
6. **Corrupt config.json**: defaults loaded, no crash
7. **Rapid actions**: 3 attacks in one turn → doesn't exceed rate limit (batching)
8. **Save/load**: config persists across sessions (separate from save files)
9. **Menu option 5**: can switch provider, disable, re-enable

### Build Verification
- `npm run build` — no TypeScript errors
- `npm start` — game runs, narrator setup works
- Test with real Gemini API key
- Test with Ollama (if available)

## Implementation Steps

1. Run `npm run build` — fix any TS errors
2. Play through: new game → attack → verify battle narration
3. Play through: full turn → verify turn summary narration
4. Win game → verify game over narration
5. Test with narrator disabled → verify no API calls
6. Delete `~/.empire-cli/config.json` → verify first-run flow
7. Set invalid API key → verify graceful fallback
8. Check narration output styling (italic magenta, readable, not too long)

## Todo List
- [ ] TypeScript build passes
- [ ] Manual playtest with Gemini
- [ ] Manual playtest with narrator disabled
- [ ] Edge case: invalid key
- [ ] Edge case: corrupt config
- [ ] Edge case: missing config file
- [ ] Verify narration styling looks good in terminal

## Success Criteria
- Zero crashes in all test scenarios
- Build clean (no TS errors)
- Narration adds flavor without disrupting gameplay flow
- Game is playable and enjoyable with and without narrator
