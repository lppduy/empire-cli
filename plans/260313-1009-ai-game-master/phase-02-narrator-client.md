# Phase 2: Narrator Client

## Context
- [plan.md](./plan.md)
- [phase-01](./phase-01-config-management.md) — config types
- Gemini SDK: `@google/generative-ai` v0.24.0 already installed
- Model: `gemini-2.5-flash` (free: 10 RPM, 250 RPD)

## Overview
- **Priority**: High (blocks phases 3-4)
- **Status**: pending
- **Description**: API client abstraction for Gemini and Ollama providers

## Key Insights
- Gemini SDK is already a dependency — use `GoogleGenerativeAI` class
- Ollama local API: `POST http://localhost:11434/api/generate` with `{model, prompt, stream: false}`
- All calls must have a 3-second timeout to avoid blocking gameplay
- Return `null` on any failure — never throw

## Requirements

### Functional
- `generateNarration(prompt: string, config: NarratorConfig): Promise<string | null>`
- Gemini provider: use SDK's `generateContent()`
- Ollama provider: raw `fetch()` to localhost
- 3s timeout on all API calls
- Return null on timeout, network error, empty response, or API error

### Non-functional
- No retries (game shouldn't wait)
- Reuse Gemini model instance across calls (avoid re-init overhead)

## Related Code Files

### Create
- `src/ai/narrator-client.ts` — provider-agnostic generation function

## Implementation Steps

1. Import `GoogleGenerativeAI` from `@google/generative-ai`
2. Create module-level cache for Gemini model instance:
   ```ts
   let geminiModel: GenerativeModel | null = null;
   function getGeminiModel(apiKey: string): GenerativeModel { ... }
   ```
3. Implement `callGemini(prompt: string, apiKey: string): Promise<string | null>`
   - Use `model.generateContent(prompt)`
   - Extract `response.text()`
   - Wrap in timeout via `AbortSignal.timeout(3000)` or `Promise.race`
4. Implement `callOllama(prompt: string, model: string): Promise<string | null>`
   - `fetch('http://localhost:11434/api/generate', { method: 'POST', body: JSON.stringify({model, prompt, stream: false}), signal: AbortSignal.timeout(3000) })`
   - Parse JSON response, extract `.response` field
5. Export `generateNarration(prompt, config)` — routes to correct provider
6. All functions wrapped in try/catch returning null on any error

## Todo List
- [ ] Create `src/ai/narrator-client.ts`
- [ ] Gemini model caching
- [ ] callGemini with timeout
- [ ] callOllama with timeout
- [ ] generateNarration router
- [ ] Error handling (silent null returns)

## Success Criteria
- Valid Gemini key → returns text within 3s
- Invalid key → returns null, no crash
- Ollama running → returns text
- Ollama not running → returns null, no crash
- Timeout after 3s → returns null

## Risk
- Gemini SDK v0.24.0 may not support `gemini-2.5-flash`. If so, fall back to `gemini-1.5-flash`. Check at implementation time.
- `AbortSignal.timeout()` requires Node 18+. Already required by project.
