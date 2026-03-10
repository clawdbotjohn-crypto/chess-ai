# Chess AI — Design System v3

**Created:** 2026-02-26
**Focus:** Visual polish + Lichess-quality dark theme

---

## Visual Identity

### Color Palette
Primary: Deep slate backgrounds
Accent: Electric blue (#3b82f6) for primary actions
Secondary accents:
- Amber (#f59e0b) — warnings, piece values
- Emerald (#10b981) — success, play actions
- Purple (#8b5cf6) — AI/personality
- Rose (#f43f5e) — danger, tactical

### Typography
- Font: Inter (system fallback: -apple-system, sans-serif)
- Headings: Semi-bold, tracking tight
- Body: Regular, 14-16px

### Chess Board Styles (3 variants for hero)
1. **Classic** — Brown/cream (Lichess-style)
2. **Neon** — Dark purple/cyan glow
3. **Minimal** — Grayscale with green accents

---

## Component Library

### Cards
```css
.card {
  background: linear-gradient(to bottom right, #1e293b, #0f172a);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
}
```

### Buttons
- Primary: Blue gradient, rounded-xl, shadow
- Secondary: Slate with subtle border
- Ghost: Transparent with hover state

### Sliders
Custom styled with colored thumb based on category

---

## Page Structure

1. Home — Hero, quick actions, featured personalities
2. New Game — Mode/opponent/time selection
3. Game Board — Main play area (HERO PAGE)
4. AI Editor — Personality tuning
5. Library — Saved personalities grid
6. AI vs AI — Spectator mode
7. History — Past games
8. Settings — Preferences
