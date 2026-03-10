# Chess AI

A web-based chess game with a **custom AI personality editor** — tune evaluation weights to create unique AI opponents with distinct playing styles.

## Features

- 🎯 **Tunable Evaluation Weights** — Adjust material values, positional scoring, king safety, aggression, and more
- 🎭 **AI Presets** — Start from built-in personalities (Aggressive, Defensive, Positional, Tactical, Chaos)
- 💾 **Save & Load** — Name and save custom AI personalities ("Aggressive Andy", "Defensive Dave")
- ♟️ **Full Chess Rules** — Castling, en passant, promotion, draw detection
- 🖱️ **Drag & Drop** — Interactive board with legal move highlighting
- 📝 **Move History** — Algebraic notation with full game tracking
- 🤖 **AI vs AI Mode** — *(Coming soon)* Pit custom personalities against each other

## Tech Stack

- **React 19** + TypeScript + Vite
- **chess.js** — Move validation and game logic
- **react-chessboard** — Interactive board UI
- **Tailwind CSS v4** — Styling
- **Custom JS Engine** — Minimax/alpha-beta with tunable evaluation function
- **Azure Static Web Apps** — Hosting

## Local Development

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
cd app
npm run build
```

Output goes to `app/dist/`.

## Deployment

Deployed automatically via GitHub Actions to **Azure Static Web Apps** on push to `master`.

## Project Structure

```
chess-ai/
├── app/                          # Vite + React application
│   ├── src/
│   │   ├── App.tsx              # Main component
│   │   ├── components/          # UI components
│   │   ├── engine/              # Custom chess AI engine
│   │   └── types/               # TypeScript types
│   ├── public/                  # Static assets
│   ├── staticwebapp.config.json # Azure SWA config
│   └── package.json
├── docs/                        # Requirements & decisions
├── .github/workflows/           # CI/CD
└── README.md
```

## License

MIT
