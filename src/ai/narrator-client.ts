// AI narrator client — Gemini SDK + Ollama fetch with timeout

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GenerativeModel } from '@google/generative-ai';
import type { NarratorConfig } from './narrator-config.js';
import { getSystemInstruction } from './narrator-prompts.js';

const TIMEOUT_MS = 5000;
let geminiModel: GenerativeModel | null = null;

function getGeminiModel(apiKey: string): GenerativeModel {
  if (!geminiModel) {
    const genAI = new GoogleGenerativeAI(apiKey);
    geminiModel = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: getSystemInstruction(),
    });
  }
  return geminiModel;
}

/** Call Gemini API with timeout */
async function callGemini(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const model = getGeminiModel(apiKey);
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
    ]);
    if (!result) return null;
    const response = (result as any).response;
    return response?.text?.()?.trim() || null;
  } catch {
    return null;
  }
}

/** Call Ollama local API with timeout */
async function callOllama(prompt: string, model: string): Promise<string | null> {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `${getSystemInstruction()}\n\n${prompt}`,
        stream: false,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json() as { response?: string };
    return data.response?.trim() || null;
  } catch {
    return null;
  }
}

/** Generate narration text using configured provider. Returns null on any failure. */
export async function generateNarration(
  prompt: string,
  config: NarratorConfig
): Promise<string | null> {
  if (!config.enabled) return null;
  if (config.provider === 'ollama') {
    return callOllama(prompt, config.ollamaModel ?? 'llama3');
  }
  if (!config.apiKey) return null;
  return callGemini(prompt, config.apiKey);
}
