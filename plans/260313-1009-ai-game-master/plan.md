---
title: "AI Game Master (Narrator)"
description: "Optional AI narrator adding flavor text to battles, captures, and turn summaries"
status: pending
priority: P2
effort: 6h
branch: feat/ai-game-master
tags: [feature, ai, gemini, narrator]
created: 2026-03-13
---

# AI Game Master Plan

## Summary

Add optional AI narrator to empire-cli. Uses Gemini 2.5 Flash free tier (10 RPM, 250 RPD). Game works identically without it. Narrator adds short flavor text after battles, territory captures, and turn summaries.

## Architecture

```
src/
  ai/
    narrator-config.ts    — config load/save, API key management (~80 lines)
    narrator-client.ts    — Gemini API call + Ollama fallback (~90 lines)
    narrator-prompts.ts   — prompt templates for each event type (~60 lines)
    narrator.ts           — public API: narrate(event, context) (~70 lines)
```

Single integration point: `narrator.narrate(event, gameState)` returns `Promise<string | null>`. Null = skip silently.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | Config management (`~/.empire-cli/config.json`) | pending | 1h |
| 2 | Narrator client (Gemini SDK + Ollama fetch) | pending | 2h |
| 3 | Prompt templates | pending | 1h |
| 4 | Integration into game loop | pending | 1.5h |
| 5 | Testing & polish | pending | 0.5h |

## Key Decisions

- **Gemini SDK** already in package.json (`@google/generative-ai`). Use it instead of raw fetch.
- **Model**: `gemini-2.5-flash` (free tier: 10 RPM, 250 RPD). Sufficient for ~3-5 calls/turn.
- **Ollama**: raw fetch to `http://localhost:11434/api/generate`. No extra deps.
- **Claude**: skip for now. Requires paid API. Can add later.
- **Async non-blocking**: fire narration request, await with 3s timeout. If slow/fails, skip.
- **No new deps needed**. Gemini SDK present; Ollama uses native fetch.

## Config Schema

```json
{
  "narrator": {
    "enabled": true,
    "provider": "gemini",
    "apiKey": "AIza...",
    "ollamaModel": "llama3.2"
  }
}
```

Stored at `~/.empire-cli/config.json` alongside existing `saves/` dir.

## Integration Points in index.ts

1. **Game start** (after `newGame()`): ask "Enable AI narrator?" if no config exists
2. **After combat** (attack command): narrate battle outcome
3. **After territory capture**: narrate conquest
4. **End of turn**: narrate turn summary (enemy actions + resource changes)
5. **Game over**: narrate victory/defeat

## Narration Style

Short (1-2 sentences). Epic fantasy tone. Context-aware (knows faction names, territory, outcome). Example:
> "The Iron Legion's charge at Greenwood echoed through the forest. The defenders broke ranks under the onslaught."

## Risk

- Gemini free tier rate limits (10 RPM) could be hit on action-heavy turns. Mitigation: batch turn-end events into single prompt, 3s timeout.
- API key storage in plaintext. Acceptable for CLI game; warn user in setup.

## Dependencies

- `@google/generative-ai` (already installed)
- Node 18+ native `fetch` (for Ollama)
