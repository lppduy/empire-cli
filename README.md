# ⚔️ Empire CLI 👑

[![npm version](https://img.shields.io/npm/v/empire-cli)](https://www.npmjs.com/package/empire-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Status: Feature Complete** — 2 maps, diplomacy, buildings, AI narrator. Play it!

A CLI turn-based strategy RPG where you build armies, expand your empire, and conquer the world. Open source, runs in any terminal.

## Screenshots

![Menu](assets/sc-menu-v2.png)

![Gameplay](assets/sc-gameplay.png)

## Quick Start

```bash
# Play instantly (no install needed)
npx empire-cli

# Or clone for development
git clone https://github.com/lppduy/empire-cli.git
cd empire-cli
npm install
npm start
```

## Quick Tutorial

```
1. Start a new game → pick a faction (e.g. Iron Legion)
2. "map" — see the world map
3. "info northkeep" — inspect a territory
4. "recruit northkeep 3" — train 3 units (costs 3💰 + 2🍖 each)
5. "move northkeep greenwood 3" — march 3 units to Greenwood
6. "build northkeep walls" — build walls for defense (costs 🪵🪨)
7. "attack greenwood silver" — attack Silver Bay from Greenwood
8. "next" — end your turn (or use all 3 actions, auto-advances)
8. Watch enemy factions react — then plan your next move!
```

**Goal:** Conquer all territories to win.

When starting a new game, you pick a map, choose a faction, then customize your leader name, nation name, and slogan (all optional — press Enter to skip).

## Commands

You get **3 actions per turn**. `map`, `info`, `status`, `help`, `save` are free (don't cost actions).

| Command | Description |
|---------|-------------|
| `map` | Show world map |
| `info <territory>` | Show territory details & neighbors |
| `status` | Show your resources and army count |
| `move <from> <to> [n]` | Move n units between territories (all if omitted) |
| `recruit <territory> <n>` | Recruit n units at a territory |
| `attack <from> <to>` | Attack enemy territory from yours |
| `build <territory> <type>` | Build walls/barracks/market |
| `next` | End turn early |
| `save [slot]` | Save game |
| `ally <faction>` | Propose alliance |
| `peace <faction>` | Propose peace treaty |
| `trade <faction> <n> <res> for <res>` | Trade resources |
| `diplo` | View diplomatic relations |
| `help` | Show commands |
| `quit` | Exit |

## Maps

| Map | Territories | Factions | Style |
|-----|------------|----------|-------|
| The Mainland | 12 | 6 factions | Classic continental war |
| The Shattered Isles | 14 | 6 factions | Island chain with chokepoints |

## Factions

**The Mainland:**

| Faction | Personality | Strengths |
|---------|-------------|-----------|
| 🔴 Iron Legion | Aggressive | High stone, strong start |
| 🟢 Green Pact | Defensive | High food & wood |
| 🟡 Sand Empire | Mercantile | High gold reserves |
| 🟣 Void Covenant | Diplomatic | Mountain fortress, fertile south |
| 🔵 Frost Wardens | Defensive | Stone-rich northern highlands |
| 🔴 Crimson Horde | Aggressive | Scrappy eastern raiders |

**The Shattered Isles:**

| Faction | Personality | Strengths |
|---------|-------------|-----------|
| 🔵 Tide Lords | Mercantile | High gold & food, coastal power |
| 🔵 Storm Kin | Aggressive | High wood & stone, mountain base |
| 🔴 Flame Brood | Aggressive | Massive stone, volcanic islands |
| 🟣 Mist Walkers | Diplomatic | Balanced resources, forest cover |
| 🟢 Deep Ones | Defensive | Forest & mountain, hidden islands |
| 🟡 Wraith Fleet | Aggressive | Gold-rich, sunken city raiders |

## Resources

- 💰 **Gold** — Recruit armies (3 per unit)
- 🍖 **Food** — Recruit + army upkeep (2 per unit)
- 🪵 **Wood** — Build structures
- 🪨 **Stone** — Build structures

## Buildings

| Building | Cost | Effect |
|----------|------|--------|
| 🧱 Walls | 10🪵 15🪨 | +0.3 defense bonus |
| 🏛️ Barracks | 8🪵 5🪨 | Recruit costs 2💰 instead of 3💰 |
| 🏪 Market | 10💰 5🪵 3🪨 | +2💰 income per turn |

## AI Narrator (Optional)

Enable epic fantasy narration for battles, turn summaries, and victories. The game works perfectly without it.

**Setup:** Choose "Narrator Settings" from the main menu, then pick a provider:

| Provider | Setup |
|----------|-------|
| **Gemini** (recommended) | Free API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Ollama** | Install [ollama.com](https://ollama.com), run `ollama pull llama3`, no key needed |

Config saved at `~/.empire-cli/config.json`.

## Roadmap

- [x] Core game loop with turn-based strategy
- [x] 4 factions with AI personalities
- [x] 8-territory map with adjacency
- [x] Combat system with terrain bonuses
- [x] Save/load game
- [x] Action limit per turn (3 actions)
- [x] AI Game Master (Gemini / Ollama) — optional epic narration
- [x] Diplomacy system (alliances, trade, peace)
- [x] Buildings (walls, barracks, markets)
- [x] More maps & factions (The Mainland + The Shattered Isles)
- [x] npm package (`npx empire-cli`) [![npm](https://img.shields.io/npm/v/empire-cli)](https://www.npmjs.com/package/empire-cli)

## Tech Stack

- TypeScript + Node.js 18+
- chalk (terminal colors)
- readline (input)
- JSON saves (`~/.empire-cli/saves/`)

## Development

```bash
npm start      # Play the game
npm run build  # Compile TypeScript
```

## License

MIT
