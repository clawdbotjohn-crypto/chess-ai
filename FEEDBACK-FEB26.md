# John's Feedback — Feb 26, 2026

After reviewing the deployed app at https://nice-desert-0df9bdf1e.4.azurestaticapps.net

## MVP Requirements

### Architecture / UX
- [ ] **Multi-page app** — Not a single page. Needs: home page, new game, game history, AI editor, etc.
- [ ] **Human vs Human mode** — Local play (two players, same device)

### Time Controls
- [ ] **Time intervals** — 1 min, 3 min + 2 sec increment, 5 min, 10 min, correspondence (1+ day), etc.

### AI Fixes (Critical)
- [ ] **Human vs AI mode needs to actually work** — Currently broken/buggy
- [ ] **AI can't spot mate in 1** — Minimax bug, not just depth issue. Depth 3 should easily catch mate in 1. Needs investigation/fix.
- [ ] **Three-fold repetition draw** — Implement draw by repetition rule (chess.js has `isThreefoldRepetition()`, just wire it up)

### Visual Direction
- [ ] **Keep the current board look** — Dark navy background, warm brown/cream board squares, classic piece set. The current v1 color scheme and board style is GOOD. Don't redesign it.
- [ ] **Option A from designer was closest** — similar to current look. Use current as baseline.
- [ ] **Focus redesign on architecture/layout** — multi-page nav, AI editor, settings, game setup. NOT the board visuals.

### UX Polish
- [ ] **Tooltips for confusing items** — e.g., what "Aggression" means, what "Center Control" weight does, etc. Especially important for the AI editor sliders.
- [ ] **Icons over emojis** — Use proper SVG/icon library (e.g., Lucide, Heroicons) instead of emojis. Emojis look bot-created. Applies to section headers, buttons, presets, everywhere. **Specific example:** the "🤖 vs 🧑" game mode buttons currently use emojis — these should be Lucide icons (e.g., `Bot`, `User`, `Swords`).
- [ ] **Legal move toggle in settings** — Click a piece to show dots on legal squares. Already implemented but should be a toggleable setting.

### Layout & Controls
- [ ] **Controls area needs redesign** — The current "Status" / "Controls" / "Game Mode" cards below the board are basic and cramped. On desktop, these should be a proper sidebar panel alongside the board. On mobile, a cleaner bottom sheet or collapsible panel.
- [ ] **Board should be the hero** — Maximize board size, push controls to sidebar (desktop) or below (mobile). Current layout wastes space above and below the board.

### AI Evaluation Improvements (Iterative — John will give ongoing feedback)
- [ ] **Piece mobility** — Weight how many squares a piece can move to (blocked bishop < bishop on long diagonal)
- [ ] **Pawn structure** — Penalize doubled pawns, isolated pawns, etc.
- [ ] **King safety** — Already has some weights but may need tuning/expansion
- [ ] **More modifier options** — This will be interactive. John suggests, we iterate.

## Post-MVP Features

### Export & Integration
- [ ] **Export agent** — Export AI personality to test in other apps (Lichess, maybe Chess.com)

### Settings & Profiles
- [ ] **Settings page** — UI theme/look, volume, preferences
- [ ] **User profiles** — Account system

### Built-in Skill Level AIs
- [ ] **Proven ELO bots** — 800, 1000, 1500, etc. (ideally like Stockfish but need to check if we can use it)
- [ ] **ELO system** — Rate players and AIs

### Multiplayer
- [ ] **Find a game** — Match vs random opponent of similar ELO
- [ ] **Friend requests** — Social features

## Notes
- AI evaluation improvements will be iterative — expect back-and-forth with John
- The app needs a real design pass before building out the multi-page architecture
- Post-MVP multiplayer features will need a backend (not just static hosting)
