# Mockup 3: Personality Library

**Screen:** Browsing and managing saved AI personalities
**Location:** Within AI Personality Editor panel

---

## Overview

The Personality Library is integrated into the AI Editor panel as two sections:
1. **Presets** — Built-in AI configurations
2. **Saved** — User-created personalities stored in localStorage

---

## Wireframe: Presets Section

```
┌─────────────────────────────────────────────────────────────┐
│  Presets                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │  ┌──────────┐ ┌───────────┐ ┌───────────┐           │  │
│  │  │Classical │ │Aggressive │ │ Defensive │           │  │
│  │  │  ✓       │ │           │ │           │           │  │
│  │  └──────────┘ └───────────┘ └───────────┘           │  │
│  │                                                      │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────┐            │  │
│  │  │ Chaotic │ │ Tactical │ │ Positional │            │  │
│  │  │         │ │          │ │            │            │  │
│  │  └─────────┘ └──────────┘ └────────────┘            │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Preset Descriptions (Tooltips)

| Preset | Tooltip (title attribute) |
|--------|---------------------------|
| Classical | "Balanced play with standard piece values" |
| Aggressive | "High aggression, low defense, prefers attacks" |
| Defensive | "High defense, strong castle, avoids trades" |
| Chaotic | "High randomness, erratic and unpredictable play" |
| Tactical | "High attack & defense weights, precise calculation" |
| Positional | "High center control, pawn advancement, low randomness" |

---

## Wireframe: Saved Personalities Section

### State: Has saved personalities
```
┌─────────────────────────────────────────────────────────────┐
│  Saved                                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │  ┌───────────────────┬───┐ ┌───────────────────┬───┐ │  │
│  │  │ Aggressive Andy   │ × │ │ Defensive Dave    │ × │ │  │
│  │  └───────────────────┴───┘ └───────────────────┴───┘ │  │
│  │                                                      │  │
│  │  ┌───────────────────┬───┐ ┌───────────────────┬───┐ │  │
│  │  │ Chaos Agent       │ × │ │ The Turtle        │ × │ │  │
│  │  └───────────────────┴───┘ └───────────────────┴───┘ │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### State: No saved personalities
```
┌─────────────────────────────────────────────────────────────┐
│  (Saved section is not rendered when empty)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Save Flow

### Step 1: Click "Save Current Personality"
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐   │
│  │           💾 Save Current Personality                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Input form appears
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────┐ ┌──────┐ ┌────────┐   │
│  │ Personality name...             │ │ Save │ │ Cancel │   │
│  └─────────────────────────────────┘ └──────┘ └────────┘   │
│   (autofocus, Enter to save)         (green)   (text)      │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: After saving
- Input hides
- New personality appears in "Saved" section
- Can be loaded or deleted

---

## Load Flow

1. Click any preset or saved personality button
2. All slider values update to match that configuration
3. Active button highlights (blue background)
4. If sliders are manually adjusted after loading, active state clears

---

## Delete Flow

### Interaction
```
┌───────────────────┬───┐
│ Aggressive Andy   │ × │  ← Hover over × shows red color
└───────────────────┴───┘
```

1. Hover over `×` → Changes to `text-red-400`
2. Click `×` → Personality deleted from localStorage
3. Button disappears from Saved section
4. No confirmation dialog (localStorage only, low-risk)

---

## localStorage Schema

### Key Format
```
chess-ai-personality:<name>
```

### Value Format (JSON)
```json
{
  "pieceValues": {
    "pawn": 90,
    "knight": 340,
    "bishop": 350,
    "rook": 480,
    "queen": 950
  },
  "positional": {
    "centerControl": 40,
    "pawnAdvancement": 50,
    "mobility": 60
  },
  "kingSafety": {
    "castleBonus": 30,
    "pawnShield": 20,
    "exposurePenalty": 25
  },
  "tactical": {
    "attackWeight": 85,
    "defenseWeight": 25,
    "aggression": 90
  },
  "randomness": {
    "threshold": 10
  }
}
```

### Example Keys
```
chess-ai-personality:Aggressive Andy
chess-ai-personality:Defensive Dave
chess-ai-personality:Chaos Agent
chess-ai-personality:The Turtle
```

---

## Personality Name Ideas (Suggested Presets)

These are example names users might create:

| Name | Style |
|------|-------|
| Aggressive Andy | High attack, low defense |
| Defensive Dave | Fortress builder |
| Chaos Agent | Maximum randomness |
| The Turtle | Never attacks, maximum king safety |
| Bobby | Classical master style |
| Gambit Queen | Sacrifices for position |
| Endgame Eric | Values pawns highly |
| Blitz Bot | Low randomness, fast decisions |

---

## Visual Design Notes

### Preset Button Styles
```css
/* Inactive */
.preset-btn {
  background: #334155; /* slate-700 */
  color: #cbd5e1;      /* slate-300 */
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

/* Hover */
.preset-btn:hover {
  background: #475569; /* slate-600 */
}

/* Active */
.preset-btn.active {
  background: #2563eb; /* blue-600 */
  color: #ffffff;
}
```

### Saved Button with Delete
```css
/* Container */
.saved-item {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

/* Delete button */
.delete-btn {
  color: #64748b;      /* slate-500 */
  font-size: 0.75rem;
  padding: 0.25rem;
}

.delete-btn:hover {
  color: #f87171;      /* red-400 */
}
```

---

## Accessibility

- All buttons are keyboard-accessible
- Delete buttons have `title` attributes: `Delete "Andy"`
- Section labels use semantic `<p>` tags with `text-xs text-slate-500`
- Focus visible on all interactive elements
