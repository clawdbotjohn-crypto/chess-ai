# Mockup 6: AI Evaluation Feedback (Optional Enhancement)

**Screen:** Visual feedback showing how the AI evaluated the position
**Status:** Design concept — not yet implemented

---

## Overview

This optional feature shows users insight into the AI's "thinking" process. It visualizes the evaluation breakdown, showing how much each factor (material, position, king safety, etc.) contributed to the AI's decision.

---

## Feature Variants

### Variant A: Evaluation Bar (Minimal)

A simple evaluation bar similar to chess.com/Lichess showing position advantage.

```
┌─────────────────────────────────────────────────────────────┐
│  Evaluation                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │ White                                         Black │   │
│  └─────────────────────────────────────────────────────┘   │
│                        +1.35                                │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Horizontal bar, center = equal
- Left = White advantage, Right = Black advantage
- Numerical value below (positive = White, negative = Black)
- Updates after each move

---

### Variant B: Evaluation Breakdown (Detailed)

A collapsible panel showing contribution from each evaluation component.

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Evaluation Breakdown                                ▾   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Total Score: +1.35 (White advantage)                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ♟ Material                                   +0.50   │   │
│  │ [████████████████████░░░░░░░░░░░░░░░░░░░░░░]         │   │
│  │                                                      │   │
│  │ 📍 Positional                                +0.25   │   │
│  │ [████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]         │   │
│  │                                                      │   │
│  │ 🏰 King Safety                               +0.40   │   │
│  │ [█████████████████░░░░░░░░░░░░░░░░░░░░░░░░░]         │   │
│  │                                                      │   │
│  │ ⚔️ Tactical                                  +0.15   │   │
│  │ [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]         │   │
│  │                                                      │   │
│  │ 🔀 Mobility                                  +0.05   │   │
│  │ [███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Collapsible panel (defaults collapsed)
- Total score at top
- Per-component breakdown
- Mini bar for each component showing relative contribution
- Positive values = White advantage, negative = Black

---

### Variant C: Move Candidates (Advanced)

Show the AI's top move candidates with their evaluations.

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 AI Analysis                                         ▾   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Best Move: e4 → e5                                         │
│  Evaluation: +1.35                                          │
│                                                             │
│  Top Candidates:                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. e4   +1.35  [██████████████████████████████████] │   │
│  │ 2. d4   +1.20  [████████████████████████████████░░] │   │
│  │ 3. Nf3  +0.95  [██████████████████████████░░░░░░░░] │   │
│  │ 4. c4   +0.80  [████████████████████████░░░░░░░░░░] │   │
│  │ 5. Nc3  +0.65  [██████████████████████░░░░░░░░░░░░] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 Why this move?                                          │
│  "Controls the center, opens lines for bishop and queen."  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Best move highlighted
- Top 5 candidate moves ranked by score
- Visual bar comparing scores
- (Aspirational) Natural language explanation

---

## Board Visualization Overlays

### Heatmap: Piece Influence

Show which squares each side controls.

```
┌─────────────────────────────────────────────────────────────┐
│   8 │ ▓▓│ ░░│ ▓▓│ ░░│ ▓▓│ ░░│ ▓▓│ ░░│                      │
│   7 │ ░░│ ▓▓│ ░░│ ▓▓│ ░░│ ▓▓│ ░░│ ▓▓│                      │
│   6 │ ██│ ██│ ██│ ██│ ░░│ ░░│ ░░│ ░░│                      │
│   5 │ ██│ ██│ ██│ ██│ ░░│ ░░│ ░░│ ░░│  ██ = White control  │
│   4 │ ░░│ ░░│ ██│ ██│ ▓▓│ ▓▓│ ░░│ ░░│  ▓▓ = Black control  │
│   3 │ ░░│ ░░│ ░░│ ░░│ ░░│ ░░│ ░░│ ░░│  ░░ = Neutral        │
│   2 │ ░░│ ░░│ ░░│ ░░│ ░░│ ░░│ ░░│ ░░│                      │
│   1 │ ░░│ ░░│ ░░│ ░░│ ░░│ ░░│ ░░│ ░░│                      │
│     └────────────────────────────────                       │
│       a   b   c   d   e   f   g   h                         │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Overlay colored squares on board
- Blue tint = White controls
- Red tint = Black controls
- Intensity = number of attackers minus defenders

---

### Attack Arrows

Show which pieces are attacking/defending key squares.

```
       [♚]
        ↑
        │
        │ (defensive arrow)
       [♙]
        
       [♗]────────────→[♞] (attack arrow)
```

**Implementation:**
- Use react-chessboard's arrow drawing API
- Show arrows for:
  - Pieces attacking enemy pieces
  - Pieces defending friendly pieces
  - Top threats in the position

---

## Color Palette for Evaluation

| Score Range | Color | Meaning |
|-------------|-------|---------|
| > +3.0 | `#22c55e` (green-500) | Winning for White |
| +1.0 to +3.0 | `#86efac` (green-300) | White advantage |
| -1.0 to +1.0 | `#94a3b8` (slate-400) | Equal |
| -3.0 to -1.0 | `#fca5a5` (red-300) | Black advantage |
| < -3.0 | `#ef4444` (red-500) | Winning for Black |

---

## Implementation Notes

### Data Source

The evaluation data would come from the existing `evaluate.ts` engine:

```typescript
interface EvaluationResult {
  total: number;          // Overall centipawn score
  material: number;       // Material balance
  positional: number;     // Positional factors
  kingSafety: number;     // King safety score
  tactical: number;       // Tactical factors
  mobility: number;       // Mobility score
}

// Modify evaluate() to return breakdown, not just total
function evaluate(fen: string, config: EvaluationConfig): EvaluationResult {
  // ... existing logic, but track each component
}
```

### Performance Considerations

- Evaluation breakdown computation is already done during move selection
- Just need to expose intermediate values
- No additional computation required
- Can be toggled off for performance-sensitive users

---

## User Preferences

Add toggle in settings (future enhancement):

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Display Options                                         │
├─────────────────────────────────────────────────────────────┤
│  [ ] Show evaluation bar                                    │
│  [ ] Show evaluation breakdown                              │
│  [ ] Show board heatmap                                     │
│  [ ] Show attack arrows                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Priority

This is an **optional enhancement** for post-MVP. The core chess experience (play against AI, tune personality, watch AI vs AI) works without this feature.

**Recommended implementation order:**
1. Evaluation bar (simple, high value)
2. Evaluation breakdown panel
3. Move candidates
4. Board heatmap
5. Attack arrows

---

## Related Issues

- Requires modifying `evaluate.ts` to return component breakdown
- May impact AI response time if not cached
- Board overlays require react-chessboard customization
