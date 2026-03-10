# Mockup 5: Game Result Modal

**Screen:** End-of-game overlay modal
**Component:** `GameResultModal.tsx`

---

## Overview

When a game ends (checkmate, stalemate, draw), an overlay modal appears on top of the board. The user can choose to start a new game or dismiss the modal to review the final position.

---

## Wireframe (ASCII)

### Checkmate (Black Wins)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                          (Board visible behind)                              │
│                                                                              │
│         ┌──────────────────────────────────────────────────┐                 │
│         │                                                  │                 │
│         │               ░░░░░░░░░░░░░░░░░░░░░              │                 │
│         │              ░░░░░░░░░░░░░░░░░░░░░░░             │                 │
│         │             ┌────────────────────────┐           │                 │
│         │             │                        │           │                 │
│         │             │       Checkmate!       │           │                 │
│         │             │        (text-3xl)      │           │                 │
│         │             │                        │           │                 │
│         │             │      Black wins!       │           │                 │
│         │             │      (text-lg)         │           │                 │
│         │             │                        │           │                 │
│         │             │  ┌──────────┐ ┌─────────────┐      │                 │
│         │             │  │Play Again│ │ Review Game │      │                 │
│         │             │  │ (blue)   │ │  (slate)    │      │                 │
│         │             │  └──────────┘ └─────────────┘      │                 │
│         │             │                        │           │                 │
│         │             └────────────────────────┘           │                 │
│         │              ░░░░░░░░░░░░░░░░░░░░░░░             │                 │
│         │               ░░░░░░░░░░░░░░░░░░░░░              │                 │
│         │                                                  │                 │
│         └──────────────────────────────────────────────────┘                 │
│                                                                              │
│                          (Sidebar visible)                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Modal Variants

### Checkmate Scenarios
| Result | Title | Message |
|--------|-------|---------|
| White wins | Checkmate! | White wins! |
| Black wins | Checkmate! | Black wins! |

### Draw Scenarios
| Result | Title | Message |
|--------|-------|---------|
| Stalemate | Stalemate! | The game is a draw. |
| Threefold repetition | Draw! | Threefold repetition. |
| Insufficient material | Draw! | Insufficient material. |
| 50-move rule | Draw! | The game is a draw. |

---

## Visual Specifications

### Backdrop
```css
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);  /* bg-black/60 */
  backdrop-filter: blur(4px);      /* backdrop-blur-sm */
}
```

### Modal Container
```css
.modal {
  background: #1e293b;              /* bg-slate-800 */
  border: 1px solid #334155;        /* border-slate-700 */
  border-radius: 0.75rem;           /* rounded-xl */
  padding: 2rem;                    /* p-8 */
  max-width: 24rem;                 /* max-w-sm */
  width: 100%;
  margin: 0 1rem;                   /* mx-4 */
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  text-align: center;
}
```

### Typography
| Element | Classes | Size |
|---------|---------|------|
| Title | `text-3xl font-bold text-white` | 30px |
| Message | `text-lg text-slate-300` | 18px |

### Buttons
| Button | Style |
|--------|-------|
| Play Again | `bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg` |
| Review Game | `bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-6 rounded-lg` |

### Button Layout
```css
.button-row {
  display: flex;
  gap: 0.75rem;          /* gap-3 */
  justify-content: center;
  margin-top: 1.5rem;    /* mb-6 on message element */
}
```

---

## Interaction Behavior

### Show Modal
- Triggered when `game.isGameOver()` returns true
- State variable `showResultModal` set to `true`

### "Play Again" Button
1. Calls `newGame()` function
2. Resets board to starting position
3. Clears move history
4. Hides modal
5. In AI vs AI mode: stops the game loop

### "Review Game" Button
1. Hides modal only (sets `showResultModal` to `false`)
2. Board remains at final position
3. User can analyze the game state
4. New Game button in sidebar still available

---

## Animation Ideas (Future Enhancement)

Currently no animation. Potential enhancements:

```css
/* Fade in backdrop */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Scale + fade modal */
@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal {
  animation: modalEnter 200ms ease-out;
}
```

---

## Accessibility

- Modal traps focus (future: implement focus trap)
- Buttons are keyboard-accessible
- Clear action labels
- High contrast text on backdrop

---

## Mobile Behavior

- Modal width: `max-w-sm` (384px) with `mx-4` margins
- On small screens: nearly full width with 16px margins each side
- Buttons stack vertically on very narrow screens (future enhancement)
