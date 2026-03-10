# Chess AI — Style Guide

**Created:** 2026-02-26
**Status:** Ready for implementation

---

## Color Palette

### Background Colors
| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Background | `#0f172a` | `bg-slate-900` | Page background |
| Surface | `#1e293b` | `bg-slate-800` | Cards, panels |
| Surface Elevated | `#334155` | `bg-slate-700` | Hover states, tooltips |
| Border | `#334155` | `border-slate-700` | Card borders, dividers |

### Text Colors
| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Primary | `#ffffff` | `text-white` | Headings, emphasis |
| Secondary | `#94a3b8` | `text-slate-400` | Body text, labels |
| Muted | `#64748b` | `text-slate-500` | Hints, timestamps |
| Disabled | `#475569` | `text-slate-600` | Disabled elements |

### Accent Colors
| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Primary Blue | `#3b82f6` | `bg-blue-500` / `text-blue-400` | Primary buttons, active nav |
| Success Green | `#22c55e` | `bg-green-500` / `text-green-400` | Win states, CTA buttons |
| Danger Red | `#ef4444` | `bg-red-500` / `text-red-400` | Losses, destructive actions |
| Warning Amber | `#f59e0b` | `bg-amber-500` / `text-amber-400` | Piece values, highlights |
| Info Cyan | `#06b6d4` | `bg-cyan-500` / `text-cyan-400` | Positional, library |
| Purple | `#a855f7` | `bg-purple-500` / `text-purple-400` | AI vs AI, randomness |

### Accent Backgrounds (Low Opacity)
For icon containers and badges:
| Color | Tailwind | Hex Approx |
|-------|----------|------------|
| Blue | `bg-blue-600/20` | rgba(37, 99, 235, 0.2) |
| Green | `bg-green-600/20` | rgba(22, 163, 74, 0.2) |
| Red | `bg-red-600/20` | rgba(220, 38, 38, 0.2) |
| Amber | `bg-amber-600/20` | rgba(217, 119, 6, 0.2) |
| Cyan | `bg-cyan-600/20` | rgba(8, 145, 178, 0.2) |
| Purple | `bg-purple-600/20` | rgba(147, 51, 234, 0.2) |

---

## Typography

### Font Stack
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Type Scale
| Element | Size | Weight | Tailwind |
|---------|------|--------|----------|
| H1 (Hero) | 36px / 48px | Bold | `text-4xl lg:text-5xl font-bold` |
| H2 (Section) | 20px | Semibold | `text-xl font-semibold` |
| H3 (Card) | 18px | Semibold | `text-lg font-semibold` |
| Body | 14px | Normal | `text-sm` |
| Small | 12px | Normal | `text-xs` |
| Mono (Values) | 14px | Normal | `font-mono text-sm` |

---

## Spacing System

Using Tailwind's default spacing scale (0.25rem = 4px base):

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Inline icon gaps |
| `gap-2` | 8px | Button icon gaps |
| `gap-3` | 12px | Grid gaps (small) |
| `gap-4` | 16px | Card gaps, list spacing |
| `gap-6` | 24px | Nav link gaps |
| `gap-8` | 32px | Section gaps |
| `p-4` | 16px | Card padding (mobile) |
| `p-5` | 20px | Card padding (panels) |
| `p-6` | 24px | Card padding (desktop) |
| `px-4` | 16px | Page horizontal padding |
| `py-8` | 32px | Page vertical padding |

---

## Component Patterns

### Cards
```html
<div class="bg-slate-800 rounded-xl border border-slate-700 p-5">
  <!-- Content -->
</div>
```

Hover state for interactive cards:
```html
<a class="bg-slate-800 hover:bg-slate-750 border border-slate-700 
          rounded-xl p-6 transition hover:border-blue-500/50">
  <!-- Content -->
</a>
```

### Buttons

**Primary (Blue)**
```html
<button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 
               rounded-lg transition flex items-center gap-2">
  <i data-lucide="play" class="w-4 h-4"></i>
  Start Game
</button>
```

**Success (Green)**
```html
<button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 
               rounded-lg transition flex items-center gap-2">
  Test This Personality
</button>
```

**Secondary**
```html
<button class="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 
               rounded-lg transition flex items-center gap-2">
  Reset
</button>
```

**Danger (for destructive actions)**
```html
<button class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 
               rounded-lg transition flex items-center gap-2">
  Resign
</button>
```

### Form Inputs

**Text Input**
```html
<input type="text" 
       class="w-full bg-slate-800 border border-slate-700 rounded-lg 
              px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
```

**Range Slider**
```css
input[type="range"] {
  -webkit-appearance: none;
  background: transparent;
}
input[type="range"]::-webkit-slider-track {
  height: 6px;
  background: #334155;
  border-radius: 3px;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  margin-top: -5px;
  cursor: pointer;
}
```

### Toggle Switches
Use Tailwind's toggle pattern or a library. Style with blue-500 for active state.

### Tooltips
```html
<span class="relative group">
  <i data-lucide="info" class="w-3.5 h-3.5 text-slate-500 cursor-help"></i>
  <div class="invisible group-hover:visible absolute z-50 w-64 p-3 
              bg-slate-700 rounded-lg shadow-lg text-sm text-slate-200
              bottom-full left-1/2 -translate-x-1/2 mb-2">
    <p>Tooltip content explaining the term...</p>
    <div class="absolute top-full left-1/2 -translate-x-1/2 
                border-8 border-transparent border-t-slate-700"></div>
  </div>
</span>
```

---

## Icons

### Library
**Lucide Icons** — https://lucide.dev/
CDN: `https://unpkg.com/lucide@latest`

### Icon Sizing
| Context | Size | Tailwind |
|---------|------|----------|
| Navigation | 20px | `w-5 h-5` |
| Button inline | 16px | `w-4 h-4` |
| Section header | 18px | `w-[18px] h-[18px]` |
| Large decorative | 32px | `w-8 h-8` |
| Small indicator / tooltip trigger | 14px | `w-3.5 h-3.5` |

### Key Icon Mappings
| Purpose | Lucide Icon |
|---------|-------------|
| AI / Bot | `bot` |
| Human / User | `user` |
| Brain / Personality | `brain` |
| Piece Values | `crown` |
| Positional | `crosshair` |
| King Safety | `shield` |
| Tactical | `swords` |
| Randomness | `dices` |
| Home | `home` |
| New / Add | `plus` |
| Settings | `settings` |
| History | `scroll-text` |
| Library / Folder | `folder` |
| Clock / Time | `clock` |
| Save | `save` |
| Play | `play` |
| Pause | `pause` |
| Info / Tooltip | `info` |
| Help | `help-circle` |
| Check / Confirm | `check` |
| Close | `x` |
| Back | `arrow-left` |
| Forward | `arrow-right` |
| Spectate / AI vs AI | `eye` |
| Trophy / Win | `trophy` |
| Reset | `rotate-ccw` |
| Delete | `trash-2` |
| Edit | `pencil` |

---

## Navigation

### Desktop (Top Nav)
- Sticky top with `bg-slate-900 border-b border-slate-800`
- Logo left, nav links center/left, actions right
- Active state: `text-white font-medium`
- Inactive state: `text-slate-300 hover:text-white`

### Mobile (Bottom Tab Bar)
- Fixed bottom with `bg-slate-900 border-t border-slate-800`
- 5 tabs: Home, Play, Library, History, Settings
- Active state: colored icon + text (e.g., `text-blue-400`)
- Inactive state: `text-slate-400`

---

## Board Theme Options

| Name | Light Square | Dark Square |
|------|--------------|-------------|
| Default | `#d4a574` (tan) | `#b58863` (brown) |
| Green | `#eeeed2` | `#769656` |
| Blue | `#dee3e6` | `#8ca2ad` |
| Gray | `#e0e0e0` | `#6b6b6b` |

---

## Responsive Breakpoints

Using Tailwind defaults:
- Mobile: `< 1024px`
- Desktop: `lg:` (≥ 1024px)

Key adaptations:
- Mobile: Bottom tab nav, stacked layouts, full-width cards
- Desktop: Top nav, sidebar layouts, grid cards

---

## Animation

- All interactive elements: `transition` (150ms default)
- Hover states: subtle scale or border color change
- No heavy animations — keep it snappy like Lichess
