# Chess AI — Design System

**Created:** 2026-02-26
**Based on:** Implemented UI (App.tsx, component files)

---

## Color Palette

### Background Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#0f172a` | Main page background (slate-900) |
| `bg-surface` | `#1e293b` | Card/panel backgrounds (slate-800) |
| `bg-surface-hover` | `#334155` | Interactive surface hover (slate-700) |
| `bg-surface-active` | `#475569` | Active state (slate-600) |

### Text Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#ffffff` | Headings, primary text |
| `text-secondary` | `#cbd5e1` | Body text (slate-300) |
| `text-muted` | `#94a3b8` | Labels, hints (slate-400) |
| `text-faint` | `#64748b` | Disabled, decorative (slate-500) |

### Accent Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `accent-blue` | `#2563eb` | Primary actions, Human vs AI mode (blue-600) |
| `accent-blue-hover` | `#1d4ed8` | Primary hover (blue-700) |
| `accent-purple` | `#9333ea` | AI vs AI mode (purple-600) |
| `accent-green` | `#16a34a` | Start/Resume, Save (green-600) |
| `accent-yellow` | `#ca8a04` | Pause, warnings (yellow-600) |
| `accent-red` | `#dc2626` | Danger, check highlight (red-600) |

### Board Colors (via react-chessboard defaults)
| Token | Color | Usage |
|-------|-------|-------|
| `board-light` | `#f0d9b5` | Light squares |
| `board-dark` | `#b58863` | Dark squares |
| `highlight-last-move` | `rgba(155, 199, 0, 0.35)` | Last move squares |
| `highlight-selected` | `rgba(255, 255, 0, 0.4)` | Selected piece |
| `highlight-check` | `rgba(235, 50, 50, 0.55)` | King in check |

---

## Typography

### Font Stack
```css
font-family: ui-sans-serif, system-ui, sans-serif;
font-mono: ui-monospace, SFMono-Regular, monospace;
```

### Scale
| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `heading-xl` | 2.25rem (36px) | 700 | Page title |
| `heading-lg` | 1.125rem (18px) | 600 | Panel headers |
| `body` | 1rem (16px) | 400 | Body text |
| `body-sm` | 0.875rem (14px) | 400 | Secondary text |
| `caption` | 0.75rem (12px) | 400 | Labels, hints |
| `caption-xs` | 0.625rem (10px) | 400 | Scale labels |

---

## Spacing

Uses Tailwind's spacing scale (1 unit = 0.25rem = 4px):
- `p-4` (16px) for card padding
- `gap-8` (32px) between major sections
- `gap-4` (16px) between panels
- `gap-2` (8px) between inline elements
- `gap-1.5` (6px) between compact elements

---

## Component Library

### Card/Panel
```
┌─────────────────────────────────────┐
│  bg-slate-800 rounded-lg p-4       │
│                                     │
│  • 8px border radius                │
│  • 16px internal padding            │
│  • Optional: collapsible header     │
└─────────────────────────────────────┘
```

### Button Variants

**Primary (Blue)**
```
┌─────────────────┐
│   New Game      │  bg-blue-600 hover:bg-blue-700
└─────────────────┘  text-white font-semibold py-2 px-4 rounded
```

**Secondary (Slate)**
```
┌─────────────────┐
│   ↺ Reset       │  bg-slate-700 hover:bg-slate-600
└─────────────────┘  text-slate-300
```

**Accent (Green/Yellow/Purple)**
- Start: `bg-green-600`
- Pause: `bg-yellow-600`
- AI vs AI: `bg-purple-600`

**Preset Button (Small)**
```
┌───────────┐
│ Classical │  text-xs px-2 py-1 rounded
└───────────┘  active: bg-blue-600 | inactive: bg-slate-700
```

### Slider
```
Label              [========●=======]  85
text-xs slate-400  accent-blue h-1.5   font-mono w-8
```

### Toggle Buttons (Mode Selector)
```
┌───────────────┐ ┌───────────────┐
│  👤 vs 🤖     │ │  🤖 vs 🤖     │
│  (active)     │ │  (inactive)   │
└───────────────┘ └───────────────┘
flex-1 text-sm py-1.5 rounded font-medium
```

### Collapsible Section
```
▾ Section Title
  └─ content (visible)

▸ Section Title
  └─ content (hidden)
```

---

## Layout

### Desktop (lg+)
```
┌─────────────────────────────────────────────────────────┐
│                      Chess AI                           │
├───────────────────────────────────┬─────────────────────┤
│                                   │                     │
│                                   │      Sidebar        │
│           Chessboard              │      (320px)        │
│           (600px max)             │                     │
│                                   │   • Status          │
│                                   │   • Controls        │
│                                   │   • AI Editor       │
│                                   │   • Move History    │
│                                   │                     │
└───────────────────────────────────┴─────────────────────┘
```

### Mobile (< lg)
```
┌─────────────────────┐
│     Chess AI        │
├─────────────────────┤
│                     │
│     Chessboard      │
│     (100% width)    │
│                     │
├─────────────────────┤
│      Status         │
├─────────────────────┤
│      Controls       │
├─────────────────────┤
│    AI Editor        │
├─────────────────────┤
│   Move History      │
└─────────────────────┘
```

---

## Interaction Patterns

### Drag & Drop Feedback
1. **Drag start** → Selected square highlights yellow
2. **Legal moves** → Show dot indicators (empty) or ring indicators (capture)
3. **Drop success** → Move animates, last move highlighted green
4. **Drop invalid** → Piece returns to origin

### AI Thinking State
- Pulsing "🤔 AI is thinking..." text below board
- Color: `text-yellow-400 animate-pulse`

### Game Over
- Modal overlay with semi-transparent backdrop
- Result title + message
- Two buttons: "Play Again" (primary) | "Review Board" (secondary)

---

## Iconography

Uses emoji for quick recognition:
- 🧠 AI Personality panel
- 🤖 AI (both players)
- 👤 Human player
- ♟ Piece values section
- 📍 Positional section
- 🏰 King safety section
- ⚔️ Tactical section
- 🎲 Randomness section
- 💾 Save personality
- ⬜ White player
- ⬛ Black player
- ▶ Start/Resume
- ⏸ Pause
- ↺ Reset

---

## Accessibility

- All interactive elements are keyboard-focusable
- Sliders use native `<input type="range">`
- Color contrast meets WCAG AA for all text
- Game status announced via visible text (no hidden announcements yet)

---

## Modal Pattern

### Game Result Modal
```
┌────────────────────────────────────┐
│                                    │
│          Checkmate!                │
│          (text-3xl bold)           │
│                                    │
│          Black wins!               │
│          (text-lg slate-300)       │
│                                    │
│  ┌────────────┐ ┌─────────────┐   │
│  │ Play Again │ │ Review Game │   │
│  │  (blue)    │ │  (slate)    │   │
│  └────────────┘ └─────────────┘   │
│                                    │
└────────────────────────────────────┘
```

**Container styles:**
- Background: `bg-slate-800`
- Border: `border border-slate-700`
- Border radius: `rounded-xl` (12px)
- Padding: `p-8` (32px)
- Max width: `max-w-sm` (384px)
- Shadow: `shadow-2xl`
- Text alignment: center

**Backdrop:**
- Background: `bg-black/60`
- Blur: `backdrop-blur-sm`
- Full screen: `fixed inset-0`
- Z-index: `z-50`

---

## AI vs AI Mode Components

### Personality Selector
```
┌─────────────────────────────────────────┐
│ ⬜ White AI                   Classical │
├─────────────────────────────────────────┤
│ [Classical●] [Aggressive] [Defensive]   │
│ [Chaotic] [Tactical] [Positional]       │
│ [Saved: Andy] [Saved: Dave]             │
└─────────────────────────────────────────┘
```

**Container:**
- Background: `bg-slate-800`
- Border radius: `rounded-lg`
- Padding: `p-3`
- Left border (color varies): `border-l-4`
  - White: `border-blue-500`
  - Black: `border-red-500`

**Active preset color:**
- White side: `bg-blue-600`
- Black side: `bg-red-600`

### Under-Board AI Labels (AI vs AI only)
```
⬜ White: Classical   ⬛ Black: Aggressive
```

**Styles:**
- Container: `flex justify-between mt-2 px-1`
- Text: `text-xs text-slate-400`
- White name: `text-blue-400 font-medium`
- Black name: `text-red-400 font-medium`

### Speed Slider (AI vs AI only)
```
Move Delay                    500ms
[═══════════●═════════════════════]
Fast                          Slow
```

**Styles:**
- Accent color: `accent-purple-500`
- Range: 100ms to 2000ms
- Step: 100ms
- Scale labels: `text-[10px] text-slate-600`

---

## State-Based Color Coding

### Playback Button States
| State | Button | Color |
|-------|--------|-------|
| Ready | ▶ Start | `bg-green-600` |
| Running | ⏸ Pause | `bg-yellow-600` |
| Paused | ▶ Resume | `bg-green-600` |
| Game Over | ▶ Start | `bg-slate-700` (disabled) |

### Status Indicators
| State | Color | Text |
|-------|-------|------|
| Normal turn | `text-slate-300` | "White to move" |
| Check | `text-red-400` | "White is in check!" |
| AI vs AI active | `text-purple-400` | "🤖 AI vs AI in progress" |
| Paused | `text-yellow-400` | "⏸ Paused" |

---

## Dark Theme Notes

This is a dark-theme-first design. Key considerations:
- Primary bg is near-black (`slate-900`)
- Cards are slightly lighter (`slate-800`)
- Interactive elements pop with color accents
- Text hierarchy via opacity/weight, not just size

---

## Future Enhancement: Evaluation Visualization

### Evaluation Bar Colors
| Score Range | Color | Meaning |
|-------------|-------|---------|
| > +3.0 | `green-500` | Winning for White |
| +1.0 to +3.0 | `green-300` | White advantage |
| -1.0 to +1.0 | `slate-400` | Equal |
| -3.0 to -1.0 | `red-300` | Black advantage |
| < -3.0 | `red-500` | Winning for Black |

### Heatmap Overlay Colors
- White control: Blue tint (`rgba(59, 130, 246, 0.3)`)
- Black control: Red tint (`rgba(239, 68, 68, 0.3)`)
- Intensity scales with number of attackers
