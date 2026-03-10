# Mockup 1: Main Game Screen (Human vs AI)

**Screen:** Primary game view in Human vs AI mode
**Breakpoint:** Desktop (1024px+)

---

## Wireframe (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                               Chess AI                                       │
│                          (text-4xl font-bold)                                │
│                                                                              │
├────────────────────────────────────────────┬─────────────────────────────────┤
│                                            │                                 │
│   ┌──────────────────────────────────┐    │   ┌───────────────────────────┐ │
│   │ ♜  ♞  ♝  ♛  ♚  ♝  ♞  ♜ │ 8    │   │   │         Status            │ │
│   │ ♟  ♟  ♟  ♟  ♟  ♟  ♟  ♟ │ 7    │   │   ├───────────────────────────┤ │
│   │                         │ 6    │   │   │ White to move             │ │
│   │                         │ 5    │   │   │ (or "Black is in check!") │ │
│   │                         │ 4    │   │   └───────────────────────────┘ │
│   │                         │ 3    │   │                                 │
│   │ ♙  ♙  ♙  ♙  ♙  ♙  ♙  ♙ │ 2    │   │   ┌───────────────────────────┐ │
│   │ ♖  ♘  ♗  ♕  ♔  ♗  ♘  ♖ │ 1    │   │   │        Controls           │ │
│   ├──────────────────────────────────┤    │   ├───────────────────────────┤ │
│   │  a   b   c   d   e   f   g   h   │    │   │ Game Mode                 │ │
│   └──────────────────────────────────┘    │   │ ┌─────────┐ ┌─────────┐   │ │
│                                            │   │ │👤 vs 🤖│ │🤖 vs 🤖│   │ │
│            🤔 AI is thinking...            │   │ │(active) │ │         │   │ │
│                                            │   │ └─────────┘ └─────────┘   │ │
│                                            │   │                           │ │
│                                            │   │ ┌───────────────────────┐ │ │
│                                            │   │ │      New Game         │ │ │
│                                            │   │ └───────────────────────┘ │ │
│                                            │   └───────────────────────────┘ │
│                                            │                                 │
│                                            │   ┌───────────────────────────┐ │
│                                            │   │    🧠 AI Personality  ▾   │ │
│                                            │   ├───────────────────────────┤ │
│                                            │   │ Presets:                  │ │
│                                            │   │ [Classical][Aggressive]   │ │
│                                            │   │ [Defensive][Chaotic]      │ │
│                                            │   │ [Tactical][Positional]    │ │
│                                            │   │                           │ │
│                                            │   │ Saved:                    │ │
│                                            │   │ [Andy ×][Dave ×]          │ │
│                                            │   │ ─────────────────────     │ │
│                                            │   │ ▾ ♟ Piece Values          │ │
│                                            │   │   Pawn    [====●===] 100  │ │
│                                            │   │   Knight  [====●===] 300  │ │
│                                            │   │   ...                     │ │
│                                            │   │ ▾ 📍 Positional            │ │
│                                            │   │ ▾ 🏰 King Safety           │ │
│                                            │   │ ▾ ⚔️ Tactical              │ │
│                                            │   │ ▾ 🎲 Randomness            │ │
│                                            │   │ ─────────────────────     │ │
│                                            │   │ [💾 Save Current...]      │ │
│                                            │   └───────────────────────────┘ │
│                                            │                                 │
│                                            │   ┌───────────────────────────┐ │
│                                            │   │     Move History (12)     │ │
│                                            │   ├───────────────────────────┤ │
│                                            │   │ 1. e4   e5                │ │
│                                            │   │ 2. Nf3  Nc6               │ │
│                                            │   │ 3. Bb5  a6                │ │
│                                            │   │ 4. Ba4  Nf6               │ │
│                                            │   │ 5. O-O  Be7               │ │
│                                            │   │ 6. Re1  b5                │ │
│                                            │   └───────────────────────────┘ │
│                                            │                                 │
└────────────────────────────────────────────┴─────────────────────────────────┘
│                                                                              │
│           You play as White. The AI responds as Black.                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Key UI Elements

### 1. Chessboard (Left)
- **Component:** `react-chessboard`
- **Max width:** 600px, centered
- **Features:**
  - Drag & drop piece movement
  - Click-to-move support
  - Last move highlighting (green tint)
  - Legal move indicators (dots for moves, rings for captures)
  - Check highlight (red glow on king)
  - Smooth move animations

### 2. AI Thinking Indicator
- **Position:** Below board, centered
- **State:** Visible only when AI is computing
- **Style:** Yellow text with pulse animation
- **Text:** "🤔 AI is thinking..."

### 3. Status Panel
- **Content:** Current game state
- **States:**
  - "White to move" / "Black to move"
  - "White is in check!" (red text)
  - "Checkmate! Black wins!"
  - "Stalemate!" / "Draw!"

### 4. Controls Panel
- **Mode toggle:** Human vs AI | AI vs AI
- **New Game button:** Primary blue, full width

### 5. AI Personality Editor (Collapsed sections)
- **Header:** Collapsible panel toggle
- **Presets row:** 6 preset buttons
- **Saved row:** User-saved personalities with delete (×)
- **5 sections:** Piece Values, Positional, King Safety, Tactical, Randomness
- **Save button:** "💾 Save Current Personality"

### 6. Move History
- **Layout:** 2-column grid (white moves left, black moves right)
- **Format:** Algebraic notation with move numbers
- **Scrollable:** Max height 256px

### 7. Footer Text
- Context-aware message about current mode

---

## Responsive Behavior

### Mobile (< 1024px)
- Board fills container width
- Sidebar stacks below board
- Panels remain full width
- Touch-friendly drag & drop

### Tablet (768px - 1024px)
- Board ~400px wide
- Sidebar ~300px, side-by-side if space allows

---

## States

### Initial State
- Board at starting position
- Status: "White to move"
- Move history: "No moves yet" (italic, muted)
- AI Editor: Default/Classical preset active

### During Game
- Status updates with each turn
- AI thinking indicator pulses during AI turn
- Move history grows, scrolls if needed

### Game Over
- Status shows result
- Game Result Modal overlays board (see mockup 5)
- Board remains visible for review
