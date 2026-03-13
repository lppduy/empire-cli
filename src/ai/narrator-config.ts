// Narrator configuration — load/save config, first-run setup prompt

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface NarratorConfig {
  enabled: boolean;
  provider: 'gemini' | 'ollama';
  apiKey?: string;
  ollamaModel?: string;
}

export interface AppConfig {
  narrator: NarratorConfig;
}

const CONFIG_DIR = join(homedir(), '.empire-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: AppConfig = {
  narrator: { enabled: false, provider: 'gemini' },
};

/** Load config from ~/.empire-cli/config.json, returns defaults on any error */
export function loadConfig(): AppConfig {
  try {
    if (!existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/** Save config to ~/.empire-cli/config.json */
export function saveConfig(config: AppConfig): void {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch {
    // silently fail — narrator is optional
  }
}

/** Interactive narrator setup. askFn wraps readline question. */
export async function setupNarrator(
  askFn: (prompt: string) => Promise<string>
): Promise<NarratorConfig> {
  const enable = await askFn('\n  Enable AI narrator? (adds epic flavor text) [y/n]: ');
  if (enable.trim().toLowerCase() !== 'y') {
    return { enabled: false, provider: 'gemini' };
  }

  console.log('\n  Choose AI provider:');
  console.log('  1. Gemini (free API key from Google)');
  console.log('  2. Ollama (local, no key needed)\n');
  const providerChoice = await askFn('  Choose [1/2]: ');

  if (providerChoice.trim() === '2') {
    const model = await askFn('  Ollama model name [llama3]: ');
    return {
      enabled: true,
      provider: 'ollama',
      ollamaModel: model.trim() || 'llama3',
    };
  }

  // Default: Gemini
  const apiKey = await askFn('  Gemini API key: ');
  if (!apiKey.trim()) {
    console.log('  No key provided — narrator disabled.');
    return { enabled: false, provider: 'gemini' };
  }
  return { enabled: true, provider: 'gemini', apiKey: apiKey.trim() };
}

/** Load config; if narrator not configured yet, run setup and save. */
export async function getOrSetupNarrator(
  askFn: (prompt: string) => Promise<string>
): Promise<NarratorConfig> {
  const config = loadConfig();
  if (config.narrator.enabled || config.narrator.apiKey || config.narrator.ollamaModel) {
    return config.narrator;
  }
  const narratorCfg = await setupNarrator(askFn);
  config.narrator = narratorCfg;
  saveConfig(config);
  return narratorCfg;
}
