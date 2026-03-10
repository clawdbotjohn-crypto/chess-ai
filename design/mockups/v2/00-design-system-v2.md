# Chess AI — Design System v2

**Updated:** 2026-02-26
**Key Change:** Icons replace emojis, multi-page architecture

---

## Icon System

**Library:** Lucide Icons  
**CDN:** `https://unpkg.com/lucide@latest`

### Icon Mapping (Replacing Emojis)
| Old (emoji) | New (Lucide) | Usage |
|-------------|--------------|-------|
| 🧠 | `brain` | AI Personality |
| 🤖 | `bot` | AI player |
| 👤 | `user` | Human player |
| ♟ | `crown` | Piece values |
| 📍 | `crosshair` | Positional |
| 🏰 | `shield` | King safety |
| ⚔️ | `swords` | Tactical |
| 🎲 | `dices` | Randomness |
| 💾 | `save` | Save |
| ⬜ | `circle` (white fill) | White player |
| ⬛ | `circle` (dark fill) | Black player |
| ▶ | `play` | Start/Resume |
| ⏸ | `pause` | Pause |
| ↺ | `rotate-ccw` | Reset |
| ⚙️ | `settings` | Settings |
| 📊 | `bar-chart-3` | Evaluation |
| 📜 | `scroll-text` | Move history |
| 🏠 | `home` | Home |
| ➕ | `plus` | New/Add |
| 🗑 | `trash-2` | Delete |
| ✏️ | `pencil` | Edit |
| 📁 | `folder` | Library |
| ⏱ | `clock` | Time control |
| ℹ️ | `info` | Tooltip trigger |
| ❓ | `help-circle` | Help |
| ⬅ | `arrow-left` | Back |
| ➡ | `arrow-right` | Forward |
| ✓ | `check` | Checkmark |
| ✗ | `x` | Close |
| 👁 | `eye` | Spectate |

### Icon Sizing
| Context | Size | Tailwind |
|---------|------|----------|
| Navigation | 20px | `w-5 h-5` |
| Button inline | 16px | `w-4 h-4` |
| Section header | 18px | `w-[18px] h-[18px]` |
| Large decorative | 32px | `w-8 h-8` |
| Small indicator | 14px | `w-3.5 h-3.5` |

---

## Navigation

### Desktop Nav (sticky top)
```
┌─────────────────────────────────────────────────────────────────┐
│  ♞ Chess AI     Home  New Game  Library  History  Settings     │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile Nav (bottom tabs)
```
┌─────────────────────────────────────────────────────────────────┐
│   Home     Play     Library    History    Settings              │
│   [icon]   [icon]   [icon]     [icon]     [icon]               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Page Structure

1. **Home** — Landing, quick actions, recent games
2. **New Game** — Mode selection, time control, AI personality
3. **Game Board** — Active game with sidebar (desktop) or stacked (mobile)
4. **AI Editor** — Full-page personality editor with tooltips
5. **Library** — Browse/manage saved personalities
6. **AI vs AI** — Spectator mode with dual personality selection
7. **History** — Past games list
8. **Settings** — Theme, volume, preferences

---

## Tooltip Pattern

Trigger: `info` icon (Lucide) next to confusing terms

```html
<div class="group relative inline-block">
  <i data-lucide="info" class="w-3.5 h-3.5 text-slate-500 cursor-help"></i>
  <div class="invisible group-hover:visible absolute z-50 w-64 p-3 
              bg-slate-700 rounded-lg shadow-lg text-sm text-slate-200
              bottom-full left-1/2 -translate-x-1/2 mb-2">
    <p>Tooltip content explaining the term...</p>
    <div class="absolute top-full left-1/2 -translate-x-1/2 
                border-8 border-transparent border-t-slate-700"></div>
  </div>
</div>
```

---

## Time Controls

| Name | Format | Description |
|------|--------|-------------|
| Bullet | 1+0 | 1 minute, no increment |
| Bullet | 2+1 | 2 minutes + 1 sec/move |
| Blitz | 3+2 | 3 minutes + 2 sec/move |
| Blitz | 5+0 | 5 minutes, no increment |
| Rapid | 10+0 | 10 minutes |
| Rapid | 15+10 | 15 min + 10 sec/move |
| Classical | 30+0 | 30 minutes |
| Correspondence | 1+ day | Async play |
