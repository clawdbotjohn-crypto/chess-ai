# Chess AI Lichess Bot

A Lichess bot powered by our custom chess engine with personality presets. Plays games on Lichess using the Bot API with configurable play styles.

## Setup

### 1. Create a Lichess BOT Account

1. Create a **new** Lichess account at [lichess.org/signup](https://lichess.org/signup)
   - ⚠️ The account must **never have played any games** — it will be upgraded to a BOT account
   - BOT accounts cannot play manually and are labeled with a BOT badge
2. Generate an API token at [lichess.org/account/oauth/token](https://lichess.org/account/oauth/token)
   - Select the **`bot:play`** scope
   - Copy the token (starts with `lip_`)
3. Upgrade the account to BOT (one-time, irreversible):
   ```bash
   curl -X POST https://lichess.org/api/bot/account/upgrade \
     -H "Authorization: Bearer lip_YOUR_TOKEN_HERE"
   ```

### 2. Install Dependencies

```bash
cd projects/chess-ai/bot
npm install
```

### 3. Run the Bot

```bash
LICHESS_TOKEN=lip_YOUR_TOKEN_HERE npx tsx src/bot.ts
```

With a personality:
```bash
LICHESS_TOKEN=lip_YOUR_TOKEN_HERE npx tsx src/bot.ts --personality AGGRESSIVE
```

### Available Personalities

| Name | Style | Description |
|------|-------|-------------|
| `DEFAULT` | Classical | Balanced play with standard piece values |
| `AGGRESSIVE` | Aggressive | High aggression, low defense, prefers attacks |
| `DEFENSIVE` | Defensive | High defense, strong castle, avoids trades |
| `CHAOTIC` | Chaotic | High randomness, erratic and unpredictable play |
| `TACTICAL` | Tactical | High attack & defense weights, precise calculation |
| `POSITIONAL` | Positional | High center control, pawn advancement, low randomness |

### Custom Personality

Create a JSON file with your config:

```json
{
  "name": "My Custom Bot",
  "config": {
    "pieceValues": { "pawn": 100, "knight": 300, "bishop": 325, "rook": 500, "queen": 900 },
    "positional": { "centerControl": 10, "pawnAdvancement": 5, "mobility": 2, "pawnStructure": 5 },
    "kingSafety": { "castleBonus": 60, "pawnShield": 25, "exposurePenalty": 50 },
    "tactical": { "attackWeight": 0, "defenseWeight": 0, "aggression": 50 },
    "search": { "depth": 4 },
    "randomness": { "threshold": 0 }
  }
}
```

Then run:
```bash
LICHESS_TOKEN=lip_xxx npx tsx src/bot.ts --config my-personality.json
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LICHESS_TOKEN` | (required) | Lichess API token with `bot:play` scope |
| `ACCEPT_RATED` | `true` | Accept rated challenges |
| `ACCEPT_CASUAL` | `true` | Accept casual challenges |
| `MAX_CONCURRENT` | `3` | Maximum simultaneous games |
| `OPENING_BOOK` | `true` | Use opening book for known positions |

## How It Works

1. **Event Stream** — Connects to Lichess `/api/stream/event` for incoming challenges
2. **Challenge Filter** — Accepts standard chess challenges (configurable rated/casual)
3. **Game Stream** — For each game, streams state via `/api/bot/game/stream/{gameId}`
4. **Move Generation** — On our turn:
   - Checks the opening book for known positions
   - Falls back to minimax search with alpha-beta pruning
   - Converts SAN moves to UCI format for Lichess
5. **Multiple Games** — Can play up to N games simultaneously

## Architecture

```
bot/
├── src/
│   ├── bot.ts            — Main entry point & game loop
│   ├── lichessClient.ts  — Lichess HTTP/NDJSON streaming client
│   ├── engine.ts         — Node.js engine wrapper + UCI conversion
│   └── config.ts         — CLI args, env vars, personality loading
├── package.json
├── tsconfig.json
└── README.md

Engine files imported from: ../app/src/engine/
├── search.ts       — Minimax + alpha-beta + iterative deepening
├── evaluate.ts     — Position evaluation with PST, mobility, king safety
├── openingBook.ts  — Trie-based opening book lookup
├── types.ts        — EvaluationConfig type definition
└── presets.ts      — Personality presets
```
