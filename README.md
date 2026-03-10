# ⚔️ Empire CLI 👑

> **Status: Early MVP** — Core gameplay works. AI game master (Gemini/Ollama/Claude) coming soon.

A CLI turn-based strategy RPG where you build armies, expand your empire, and conquer the world. Open source, runs in any terminal.

## Quick Start

```bash
git clone https://github.com/user/empire-cli.git
cd empire-cli
npm install
npm start
```

## Quick Tutorial

```
1. Start a new game → pick a faction (e.g. Iron Legion)
2. Type "look" to see the world map
3. Type "info northkeep" to inspect a territory
4. Type "recruit northkeep 3" to train 3 units (costs 3💰 + 2🍖 each)
5. Type "move northkeep greenwood 3" to march 3 units to Greenwood
6. Type "attack greenwood silver" to attack Silver Bay from Greenwood
7. Type "next" to end your turn (or use all 3 actions)
8. Watch enemy factions react — then plan your next move!
```

**Goal:** Conquer all 8 territories to win.

## Commands

You get **3 actions per turn**. `look`, `info`, `status`, `help`, `save` are free (don't cost actions).

| Command | Description |
|---------|-------------|
| `look` | Show world map |
| `info <territory>` | Show territory details & neighbors |
| `status` | Show your resources and army count |
| `move <from> <to> [n]` | Move n units between territories (all if omitted) |
| `recruit <territory> <n>` | Recruit n units at a territory |
| `attack <from> <to>` | Attack enemy territory from yours |
| `next` | End turn early |
| `save [slot]` | Save game |
| `help` | Show commands |
| `quit` | Exit |

## Factions

| Faction | Personality | Strengths |
|---------|-------------|-----------|
| 🔴 Iron Legion | Aggressive | High stone, strong start |
| 🟢 Green Pact | Defensive | High food & wood |
| 🟡 Sand Empire | Mercantile | High gold reserves |
| 🟣 Void Covenant | Diplomatic | Mountain fortress |

## Resources

- 💰 **Gold** — Recruit armies (3 per unit)
- 🍖 **Food** — Recruit + army upkeep (2 per unit)
- 🪵 **Wood** — Future: buildings
- 🪨 **Stone** — Future: fortifications

## Roadmap

- [x] Core game loop with turn-based strategy
- [x] 4 factions with AI personalities
- [x] 8-territory map with adjacency
- [x] Combat system with terrain bonuses
- [x] Save/load game
- [x] Action limit per turn (3 actions)
- [ ] AI Game Master (Gemini free tier / Ollama / Claude) — dynamic narration
- [ ] Diplomacy system (alliances, trade, peace)
- [ ] Buildings (walls, barracks, markets)
- [ ] More maps & factions
- [ ] npm package (`npx empire-cli`)

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
