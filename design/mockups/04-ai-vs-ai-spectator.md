# Mockup 4: AI vs AI Spectator Mode

**Screen:** AI vs AI mode — watch two AI personalities battle
**Breakpoint:** Desktop (1024px+)

---

## Overview

AI vs AI mode allows users to pit two AI personalities against each other and watch them play. This is the "spectator mode" — users set up the match, start it, and watch the game unfold with playback controls.

---

## Wireframe (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                               Chess AI                                       │
│                                                                              │
├────────────────────────────────────────────┬─────────────────────────────────┤
│                                            │                                 │
│   ┌──────────────────────────────────┐    │   ┌───────────────────────────┐ │
│   │ ♜  ♞  ♝  ♛  ♚  ♝  ♞  ♜ │ 8    │   │   │         Status            │ │
│   │ ♟  ♟  ♟  ♟  ♟  ♟  ♟  ♟ │ 7    │   │   ├───────────────────────────┤ │
│   │                         │ 6    │   │   │ Black to move             │ │
│   │                         │ 5    │   │   │ 🤖 AI vs AI in progress   │ │
│   │           ♙             │ 4    │   │   └───────────────────────────┘ │
│   │                         │ 3    │   │                                 │
│   │ ♙  ♙  ♙     ♙  ♙  ♙  ♙ │ 2    │   │   ┌───────────────────────────┐ │
│   │ ♖  ♘  ♗  ♕  ♔  ♗  ♘  ♖ │ 1    │   │   │        Controls           │ │
│   ├──────────────────────────────────┤    │   ├───────────────────────────┤ │
│   │  a   b   c   d   e   f   g   h   │    │   │ Game Mode                 │ │
│   └──────────────────────────────────┘    │   │ ┌─────────┐ ┌─────────┐   │ │
│                                            │   │ │👤 vs 🤖│ │🤖 vs 🤖│   │ │
│   ⬜ White: Classical   ⬛ Black: Aggr... │   │ │         │ │(active) │   │ │
│                                            │   │ └─────────┘ └─────────┘   │ │
│                                            │   │                           │ │
│                                            │   │ Move Delay         500ms  │ │
│                                            │   │ [═══════●═══════════════] │ │
│                                            │   │ Fast               Slow   │ │
│                                            │   │                           │ │
│                                            │   │ ┌────────────┐┌─────────┐ │ │
│                                            │   │ │  ⏸ Pause   ││↺ Reset  │ │ │
│                                            │   │ └────────────┘└─────────┘ │ │
│                                            │   │                           │ │
│                                            │   │ ┌───────────────────────┐ │ │
│                                            │   │ │      New Game         │ │ │
│                                            │   │ └───────────────────────┘ │ │
│                                            │   └───────────────────────────┘ │
│                                            │                                 │
│                                            │   ┌───────────────────────────┐ │
│                                            │   │  🤖 AI Personalities      │ │
│                                            │   ├───────────────────────────┤ │
│                                            │   │                           │ │
│                                            │   │ ┌─────────────────────┐   │ │
│                                            │   │ │ ⬜ White AI          │   │ │
│                                            │   │ │                     │   │ │
│                                            │   │ │ [Classical●]        │   │ │
│                                            │   │ │ [Aggressive]        │   │ │
│                                            │   │ │ [Defensive][Chaotic]│   │ │
│                                            │   │ │ [Tactical][Position]│   │ │
│                                            │   │ │ [Andy][Dave]        │   │ │
│                                            │   │ └─────────────────────┘   │ │
│                                            │   │                           │ │
│                                            │   │ ┌─────────────────────┐   │ │
│                                            │   │ │ ⬛ Black AI          │   │ │
│                                            │   │ │                     │   │ │
│                                            │   │ │ [Classical]         │   │ │
│                                            │   │ │ [Aggressive●]       │   │ │
│                                            │   │ │ [Defensive][Chaotic]│   │ │
│                                            │   │ │ [Tactical][Position]│   │ │
│                                            │   │ │ [Andy][Dave]        │   │ │
│                                            │   │ └─────────────────────┘   │ │
│                                            │   └───────────────────────────┘ │
│                                            │                                 │
│                                            │   ┌───────────────────────────┐ │
│                                            │   │     Move History (8)      │ │
│                                            │   ├───────────────────────────┤ │
│                                            │   │ 1. e4   e5                │ │
│                                            │   │ 2. d4   exd4              │ │
│                                            │   │ 3. c3   dxc3              │ │
│                                            │   │ 4. Nxc3 Nc6               │ │
│                                            │   └───────────────────────────┘ │
│                                            │                                 │
└────────────────────────────────────────────┴─────────────────────────────────┘
│                                                                              │
│               Watch two AI personalities battle it out!                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Differences from Human vs AI Mode

| Element | Human vs AI | AI vs AI |
|---------|-------------|----------|
| Mode toggle | Blue active | Purple active |
| AI Editor panel | Full sliders (your opponent) | Replaced by 2 personality selectors |
| Board interaction | Drag/drop enabled | Disabled during play |
| Status indicator | Turn only | Turn + "🤖 AI vs AI in progress" |
| Playback controls | Hidden | Start/Pause/Resume/Reset |
| Speed slider | Hidden | Visible (100ms - 2000ms) |
| Under-board labels | Hidden | Shows both AI names |

---

## Component: Personality Selector

**File:** `PersonalitySelector.tsx`

Each AI gets a compact personality selector with a colored left border (blue for White, red for Black).

### Wireframe Detail
```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⬜ White AI                           Classical         │ │
│ ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ │
│ │ [Classical●][Aggressive][Defensive]                     │ │
│ │ [Chaotic][Tactical][Positional]                         │ │
│ │ [Saved: Andy][Saved: Dave]                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⬛ Black AI                          Aggressive         │ │
│ ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ │
│ │ [Classical][Aggressive●][Defensive]                     │ │
│ │ [Chaotic][Tactical][Positional]                         │ │
│ │ [Saved: Andy][Saved: Dave]                              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Visual Styling
- **White selector:** `border-l-4 border-blue-500`
- **Black selector:** `border-l-4 border-red-500`
- **Active preset (White):** `bg-blue-600 text-white`
- **Active preset (Black):** `bg-red-600 text-white`
- **Inactive preset:** `bg-slate-700 text-slate-300`

---

## Playback Controls

### States and Button Labels

| State | Primary Button | Color |
|-------|----------------|-------|
| Not started | ▶ Start | Green |
| Running | ⏸ Pause | Yellow |
| Paused | ▶ Resume | Green |
| Game over | ▶ Start (disabled) | Gray |

### Speed Slider
```
Move Delay                    500ms
[═══════════●═════════════════════]
Fast                          Slow
```

| Property | Value |
|----------|-------|
| Min | 100ms |
| Max | 2000ms |
| Step | 100ms |
| Default | 500ms |
| Accent color | Purple (`accent-purple-500`) |

---

## Under-Board Labels

When in AI vs AI mode, show which personality is playing each side:

```
⬜ White: Classical   ⬛ Black: Aggressive
```

### Styling
```css
.ai-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  padding: 0 0.25rem;
  font-size: 0.75rem;      /* text-xs */
  color: #94a3b8;          /* slate-400 */
}

.white-label { color: #60a5fa; }  /* blue-400 */
.black-label { color: #f87171; }  /* red-400 */
```

---

## Status Panel Updates

### AI vs AI Running
```
┌───────────────────────────┐
│         Status            │
├───────────────────────────┤
│ Black to move             │
│ 🤖 AI vs AI in progress   │
└───────────────────────────┘
```

### AI vs AI Paused
```
┌───────────────────────────┐
│         Status            │
├───────────────────────────┤
│ White to move             │
│ ⏸ Paused                  │
└───────────────────────────┘
```

---

## Game Loop Behavior

### Flow
1. User selects personalities for White and Black
2. User clicks "▶ Start"
3. White AI calculates move → move applied → delay → Black AI calculates → repeat
4. User can pause/resume at any time
5. On game over, loop stops automatically

### Technical Notes
- Each AI runs in its own Web Worker
- Move delay applies **after** each move (not before)
- If paused, timeout is cleared; resume restarts the loop
- Board interaction disabled while `isRunning && !isPaused`

---

## Match Suggestions UI (Future Enhancement)

**Not implemented yet, but planned:**

A "Quick Match" panel with pre-configured battles:

```
┌─────────────────────────────────────────────────────────────┐
│  ⚔️ Quick Matches                                           │
├─────────────────────────────────────────────────────────────┤
│  [Aggressive vs Defensive]  — The classic battle            │
│  [Tactical vs Positional]   — Strategy showdown             │
│  [Chaotic vs Classical]     — Order vs Entropy              │
│  [Random Matchup]           — Surprise personalities        │
└─────────────────────────────────────────────────────────────┘
```

---

## Mobile Considerations

- Personality selectors stack vertically
- Playback controls: Start/Pause full width, Reset below
- Speed slider touch-friendly
- Under-board labels may wrap to two lines on narrow screens

---

## Accessibility

- Playback buttons have clear icons + text labels
- Speed slider has visible value display
- Status updates announce turn changes
- All controls keyboard-navigable

---

## Example Scenarios

### Scenario 1: Aggressive vs Defensive
- **White:** Aggressive (high attack, low defense)
- **Black:** Defensive (fortress mode, high king safety)
- **Expected:** White attacks aggressively; Black tries to weather the storm

### Scenario 2: Chaotic vs Classical
- **White:** Chaotic (80% randomness)
- **Black:** Classical (balanced, 0% randomness)
- **Expected:** Chaotic makes wild moves; Classical punishes mistakes

### Scenario 3: Tactical vs Tactical
- **Both:** Tactical preset
- **Expected:** Tight, calculated game with minimal blunders

### Scenario 4: User-Created Battle
- **White:** "Aggressive Andy" (user's saved aggressive variant)
- **Black:** "Defensive Dave" (user's saved defensive variant)
- **Expected:** Personalized showdown between user's creations
