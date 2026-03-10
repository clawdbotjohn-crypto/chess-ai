# Chess AI — Design Mockups

**Created:** 2026-02-26
**Status:** Complete

This directory contains UI/UX design documentation for the Chess AI app.

---

## Mockup Index

| # | File | Screen | Status |
|---|------|--------|--------|
| 1 | `01-main-game-screen.md` | Main game view (Human vs AI) | ✅ Implemented |
| 2 | `02-ai-personality-editor.md` | AI Personality Editor panel | ✅ Implemented |
| 3 | `03-personality-library.md` | Presets & saved personalities | ✅ Implemented |
| 4 | `04-ai-vs-ai-spectator.md` | AI vs AI spectator mode | ✅ Implemented |
| 5 | `05-game-result-modal.md` | End-of-game modal overlay | ✅ Implemented |
| 6 | `06-evaluation-feedback-optional.md` | AI evaluation visualization | 📋 Design only |

---

## Design System

`design-system.md` — Comprehensive reference for:
- Color palette (backgrounds, text, accents, board)
- Typography scale
- Spacing conventions
- Component library (cards, buttons, sliders, toggles)
- Layout patterns (desktop & mobile)
- Interaction patterns
- Iconography (emoji usage)
- Accessibility guidelines
- State-based color coding

---

## Key Design Decisions

### 1. Dark Theme First
The app uses a dark color scheme (`slate-900` background) for:
- Reduced eye strain during extended play
- Focus on the chess board
- Modern aesthetic

### 2. Collapsible Panels
The AI Editor panel uses collapsible sections to:
- Reduce visual overwhelm
- Allow focus on specific weight categories
- Work better on mobile

### 3. Purple for AI vs AI Mode
AI vs AI mode uses purple accent colors to:
- Distinguish from Human vs AI (blue)
- Signal "spectator" mode
- Create visual interest

### 4. Emoji Icons
Using emoji (🧠 ♟ 📍 🏰 ⚔️ 🎲) instead of custom icons for:
- Fast implementation
- Universal recognition
- Personality/character

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Board above, panels stacked below |
| Tablet | 768px - 1023px | Board left (400px), sidebar right |
| Desktop | ≥ 1024px | Board left (600px), sidebar right (320px) |

---

## Implementation Notes

All mockups are **ASCII wireframes** supplemented with:
- Component specifications
- Tailwind CSS class references
- State descriptions
- Interaction behaviors

The app is built with **React + Tailwind CSS + react-chessboard**.

---

## Future Enhancements

### High Priority
1. **Evaluation Bar** — Show position advantage visually
2. **Move Highlighting** — ✅ Already implemented (T-015, T-016, T-017)

### Medium Priority
3. **Evaluation Breakdown Panel** — Show component contributions
4. **Quick Matches** — Pre-configured AI vs AI battles

### Low Priority
5. **Board Heatmap** — Visualize square control
6. **Attack Arrows** — Show piece threats
7. **Move Undo** — Take back last move
