# Mockup 2: AI Personality Editor

**Screen:** Detailed view of the AI Personality Editor panel
**Component:** `AIEditorPanel.tsx`

---

## Wireframe (ASCII)

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 AI Personality                                      ▾   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Presets                                                    │
│  ┌──────────┐ ┌───────────┐ ┌───────────┐                  │
│  │Classical │ │Aggressive │ │ Defensive │                  │
│  │ (active) │ │           │ │           │                  │
│  └──────────┘ └───────────┘ └───────────┘                  │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐                   │
│  │ Chaotic │ │ Tactical │ │ Positional │                   │
│  │         │ │          │ │            │                   │
│  └─────────┘ └──────────┘ └────────────┘                   │
│                                                             │
│  Saved                                                      │
│  ┌────────────────┐ ┌────────────────┐                     │
│  │ Aggressive Andy │×│ Defensive Dave │×│                   │
│  └────────────────┘ └────────────────┘                     │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│  ▾ ♟ Piece Values                                          │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ Pawn      [══════════●══════════════════]     100   │ │
│    │ Knight    [════════════════════●════════]     300   │ │
│    │ Bishop    [═════════════════════●═══════]     325   │ │
│    │ Rook      [═══════════════════════════●═]     500   │ │
│    │ Queen     [═════════════════════════════●]    900   │ │
│    └─────────────────────────────────────────────────────┘ │
│                                                             │
│  ▾ 📍 Positional                                            │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ Center Control    [●═══════════════════]       10   │ │
│    │ Pawn Advancement  [●═══════════════════]        5   │ │
│    │ Mobility          [●═══════════════════]        2   │ │
│    └─────────────────────────────────────────────────────┘ │
│                                                             │
│  ▾ 🏰 King Safety                                           │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ Castle Bonus      [════════════●═══════]       60   │ │
│    │ Pawn Shield       [═════●══════════════]       25   │ │
│    │ Exposure Penalty  [═════════●══════════]       50   │ │
│    └─────────────────────────────────────────────────────┘ │
│                                                             │
│  ▾ ⚔️ Tactical                                              │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ Attack Weight     [●═══════════════════]        1   │ │
│    │ Defense Weight    [●═══════════════════]        1   │ │
│    │ Aggression        [═════════●══════════]       50   │ │
│    └─────────────────────────────────────────────────────┘ │
│                                                             │
│  ▾ 🎲 Randomness                                            │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ Randomness        [●═══════════════════]        0   │ │
│    └─────────────────────────────────────────────────────┘ │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           💾 Save Current Personality                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Save Personality Flow

### Step 1: Click "Save Current Personality"
```
┌─────────────────────────────────────────────────────────────┐
│  ───────────────────────────────────────────────────────   │
│                                                             │
│  ┌────────────────────────────┐ ┌──────┐ ┌────────┐        │
│  │ Personality name...        │ │ Save │ │ Cancel │        │
│  └────────────────────────────┘ └──────┘ └────────┘        │
│   (text input, autofocus)       (green)   (ghost)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Enter name and save
- Name appears in "Saved" section
- Stored in localStorage with prefix `chess-ai-personality:`

---

## Slider Definitions

### ♟ Piece Values
| Slider | Min | Max | Step | Default | Unit |
|--------|-----|-----|------|---------|------|
| Pawn | 50 | 200 | 5 | 100 | centipawns |
| Knight | 200 | 500 | 5 | 300 | centipawns |
| Bishop | 200 | 500 | 5 | 325 | centipawns |
| Rook | 300 | 700 | 5 | 500 | centipawns |
| Queen | 600 | 1200 | 10 | 900 | centipawns |

### 📍 Positional
| Slider | Min | Max | Step | Default | Description |
|--------|-----|-----|------|---------|-------------|
| Center Control | 0 | 100 | 1 | 10 | Bonus for controlling center squares |
| Pawn Advancement | 0 | 100 | 1 | 5 | Bonus for pushing pawns forward |
| Mobility | 0 | 100 | 1 | 2 | Bonus per legal move available |

### 🏰 King Safety
| Slider | Min | Max | Step | Default | Description |
|--------|-----|-----|------|---------|-------------|
| Castle Bonus | 0 | 100 | 1 | 60 | Bonus if king has castled |
| Pawn Shield | 0 | 100 | 1 | 25 | Bonus for pawns protecting king |
| Exposure Penalty | 0 | 100 | 1 | 50 | Penalty for exposed king |

### ⚔️ Tactical
| Slider | Min | Max | Step | Default | Description |
|--------|-----|-----|------|---------|-------------|
| Attack Weight | 0 | 100 | 1 | 1* | Multiplier for attacking moves |
| Defense Weight | 0 | 100 | 1 | 1* | Multiplier for defensive moves |
| Aggression | 0 | 100 | 1 | 50 | Preference for attacking play |

*Note: Default is 1.0 (stored as integer 1 in tactical weights with different scaling)

### 🎲 Randomness
| Slider | Min | Max | Step | Default | Description |
|--------|-----|-----|------|---------|-------------|
| Threshold | 0 | 100 | 1 | 0 | Centipawn range for random selection |

---

## Preset Configurations

### Classical (Default)
```
pieceValues: { pawn: 100, knight: 300, bishop: 325, rook: 500, queen: 900 }
positional: { centerControl: 10, pawnAdvancement: 5, mobility: 2 }
kingSafety: { castleBonus: 60, pawnShield: 25, exposurePenalty: 50 }
tactical: { attackWeight: 1, defenseWeight: 1, aggression: 50 }
randomness: { threshold: 0 }
```

### Aggressive
- High aggression (90), low defense (25)
- High mobility (60), center control (40)
- Low king safety values
- Low randomness (10)

### Defensive
- High defense (85), low attack (25)
- High castle bonus (90), pawn shield (80)
- Low aggression (15)
- Very low randomness (3)

### Chaotic
- Balanced weights
- **High randomness (80)** — key differentiator
- Unpredictable move selection

### Tactical
- High attack (80) AND defense (75)
- Balanced positional weights
- Low randomness (2) — precise calculation

### Positional
- Very high center control (85)
- High pawn advancement (70)
- Low aggression (30)
- Low randomness (3)

---

## Interaction States

### Preset Button
- **Default:** `bg-slate-700 text-slate-300`
- **Hover:** `bg-slate-600`
- **Active:** `bg-blue-600 text-white`

### Saved Personality Button
- **Default:** `bg-slate-700 text-slate-300` with `×` delete button
- **Hover:** `bg-slate-600`
- **Delete hover:** `×` turns `text-red-400`

### Slider
- **Track:** `h-1.5` thin track, `bg-slate-600`
- **Thumb:** Native browser, `accent-blue-500`
- **Dragging:** Browser default focus ring

### Section Toggle
- **Collapsed:** `▸ Section Title`
- **Expanded:** `▾ Section Title`
- Click anywhere on header to toggle

---

## Mobile Considerations

- Sliders remain touch-friendly (native `<input type="range">`)
- Preset buttons wrap into 2 rows
- Save modal input gets full width
- Sections start collapsed on mobile to save space
