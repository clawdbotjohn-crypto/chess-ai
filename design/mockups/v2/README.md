# Chess AI — Design Mockups v2

**Created:** February 26, 2026  
**Status:** Complete multi-page redesign

## Overview

Full redesign implementing John's feedback from FEEDBACK-FEB26.md:
- Multi-page architecture (not single page)
- Lucide icons throughout (no emojis)
- Tooltips for AI editor sliders
- Time control selection
- Dark theme, Lichess-quality design
- Mobile responsive with bottom navigation

## Pages

| File | Description |
|------|-------------|
| `01-home.html` | Landing page with quick actions, recent games, preset personalities |
| `02-new-game.html` | Game setup: mode selection, time control, AI personality, play as |
| `03-game-board.html` | Active game with responsive sidebar (desktop) / stacked panels (mobile) |
| `04-ai-editor.html` | Full AI personality editor with sliders and tooltips |
| `05-library.html` | Browse presets and saved personalities |
| `06-ai-vs-ai.html` | Spectator mode with dual personality selection and playback controls |
| `07-history.html` | Game history with filters (wins/losses/draws/AI vs AI) |
| `08-settings.html` | Board, theme, sound, AI, and data settings |

## Design System

See `00-design-system-v2.md` for:
- Icon mapping (Lucide replacements for emojis)
- Navigation patterns (desktop top nav, mobile bottom tabs)
- Tooltip patterns for AI editor
- Time control definitions

## Technical Notes

- **CSS Framework:** Tailwind CSS (via CDN)
- **Icons:** Lucide (via CDN: `https://unpkg.com/lucide@latest`)
- **Color Scheme:** Dark theme (slate-900 bg, slate-800 cards)
- **Responsive:** Desktop-first with mobile breakpoints

## Key Design Decisions

### Navigation
- Desktop: Horizontal nav bar with icon + text links
- Mobile: Bottom tab bar (5 tabs: Home, Play, Library, History, Settings)
- Minimal header during active game

### AI Editor Tooltips
Each slider has an info icon that shows a tooltip on hover explaining:
- What the weight does
- How high/low values affect AI behavior
- Strategic implications

### Time Controls
Categorized by speed class:
- **Bullet:** 1+0, 2+1
- **Blitz:** 3+2, 5+0
- **Rapid:** 10+0, 15+10
- **Classical:** 30+0
- **No limit:** ∞

### Game Board Layout
- Desktop: Board + sidebar (320px) with game info, moves, evaluation
- Mobile: Board + collapsible bottom panel with moves and quick actions

## How to Preview

Open any HTML file directly in a browser. All dependencies are loaded via CDN.

```bash
# From the mockups directory
open 01-home.html
```

Or use a local server:
```bash
npx serve .
```
