# Chess AI — Production Readiness Plan

**Created:** 2026-03-19
**Status:** Draft — Ready for John's review
**Live URL:** https://nice-desert-0df9bdf1e.4.azurestaticapps.net
**Multiplayer:** chess-ai-multiplayer.JohnWattenbarger.partykit.dev

---

## 1. Current State Assessment

### What's Deployed
- **React + Vite SPA** on Azure Static Web Apps (free tier)
- **PartyKit multiplayer server** for online play (free tier)
- **Stockfish WASM** integration for engine analysis
- **Custom chess engine** with configurable AI personalities
- **PWA** with service worker, manifest, offline support

### What Works (verified features)
- Play vs custom AI personalities (adjustable eval weights, opening book, avatars)
- Play vs Stockfish (configurable skill/depth)
- Online multiplayer (room-based, WebSocket via PartyKit)
- Bot Arena (round-robin tournaments, Elo ratings)
- Full game analysis (move classification, best move arrows, progressive eval)
- Position setup, PGN import/export, game history with stats
- Opening book (compressed trie, 62KB), opening name display
- Pre-moves (Lichess-style pseudo-legal)
- PWA installable, keyboard shortcuts, accessibility (aria labels, focus management)
- SEO basics (meta tags, Open Graph, JSON-LD, sitemap, robots.txt)

### Tech Stack
| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (dark theme) |
| Chess logic | chess.js |
| Board | react-chessboard v5 |
| Engine | Custom (Web Worker) + Stockfish WASM |
| Multiplayer | PartyKit (WebSocket rooms) |
| Hosting | Azure Static Web Apps (free) |
| CI/CD | GitHub Actions → Azure SWA |

### Bundle Size (after optimizations)
- Index chunk: ~238KB (down from 508KB via code splitting)
- Openings data: ~62KB (compressed trie, lazy-loaded)
- 7 code-split page chunks via React.lazy
- Stockfish WASM: loaded on-demand only

---

## 2. Domain & Branding

### Domain Name Suggestions
| Domain | Availability | Cost/yr | Notes |
|--------|-------------|---------|-------|
| `chessbrain.app` | Check | ~$14 | Matches tagline "Build Your Chess Brain" |
| `chessbrain.io` | Check | ~$30 | Tech-friendly TLD |
| `playchessbrain.com` | Check | ~$12 | Descriptive, .com credibility |
| `mychessbrain.com` | Check | ~$12 | Personal feel |
| `chessforge.app` | Check | ~$14 | "Forge your AI" angle |
| `chessai.app` | Check | ~$14 | Direct, memorable |

**Recommendation:** `chessbrain.app` — matches the existing tagline, modern TLD, affordable.

### Steps to Set Up Custom Domain
1. **Buy domain** — Namecheap (~$12-14/yr) or Cloudflare Registrar (at-cost pricing, often cheapest)
2. **Add to Azure SWA:**
   ```bash
   # In Azure Portal → Static Web App → Custom domains → Add
   # Or via CLI:
   az staticwebapp hostname set \
     --name nice-desert-0df9bdf1e \
     --hostname chessbrain.app
   ```
3. **DNS setup** — Add CNAME record pointing to `nice-desert-0df9bdf1e.4.azurestaticapps.net`
4. **SSL** — Azure SWA provides free auto-managed SSL certificates for custom domains
5. **Update references:**
   - `sitemap.xml` — Replace all Azure URLs with custom domain
   - `robots.txt` — Update sitemap URL
   - `index.html` — Update `og:url`, canonical link
   - `manifest.json` — Update `start_url` if needed
   - PartyKit CORS config — Allow new domain origin

**⚠️ Note:** Azure SWA free tier supports custom domains with free SSL. No upgrade needed.

---

## 3. Hosting & Infrastructure

### Azure Static Web Apps — Current Setup

**Free tier includes:**
- 2 custom domains
- 0.5 GB storage
- 100 GB bandwidth/month
- Free SSL
- GitHub Actions CI/CD
- Global CDN (Azure Front Door)

**Free tier is plenty for launch.** 100GB bandwidth ≈ serving your ~300KB app to 300K+ page loads/month.

**Standard tier ($9/month) adds:**
- 5 custom domains
- SLA (99.95%)
- Bring-your-own Functions
- 2 GB storage
- Password-protected staging environments

**Recommendation:** Stay on free tier. Upgrade to Standard only if you need SLA guarantees or more custom domains.

### PartyKit — Multiplayer

**Free tier (Hobby) includes:**
- Unlimited projects
- Up to 20 concurrent connections per room
- Rooms auto-hibernate when inactive (saves resources)
- Cloudflare Workers runtime (edge-deployed)

**Limits to watch:**
- 20 concurrent connections per room (fine for 1v1 chess — each game is its own room)
- CPU time limits per request (~50ms)
- Memory: 128MB per room

**Upgrade path:** PartyKit Pro pricing isn't publicly fixed — contact their team. For chess (2 players per room), the free tier handles thousands of simultaneous games since each room only has 2 connections.

**Recommendation:** Free tier is perfect for chess. Each game = 1 room with 2 players. You'd need 10,000+ simultaneous games to hit any real limits, and even then it's per-room.

### CDN & Caching Strategy

Azure SWA already includes Azure Front Door CDN globally. Additional steps:

1. **Configure cache headers** in `staticwebapp.config.json`:
   ```json
   {
     "globalHeaders": {
       "Cache-Control": "public, max-age=31536000, immutable"
     },
     "routes": [
       {
         "route": "/index.html",
         "headers": { "Cache-Control": "no-cache" }
       },
       {
         "route": "/assets/*",
         "headers": { "Cache-Control": "public, max-age=31536000, immutable" }
       },
       {
         "route": "/sw.js",
         "headers": { "Cache-Control": "no-cache" }
       }
     ]
   }
   ```
2. Vite already adds content hashes to asset filenames → safe to cache forever
3. Service worker provides offline fallback

### Cost Estimates

| Traffic Level | Azure SWA | PartyKit | Domain | Total/month |
|---------------|-----------|----------|--------|-------------|
| **Hobby** (<1K users/mo) | $0 (free) | $0 (free) | ~$1 (annual) | **~$1** |
| **Growing** (1K-5K users/mo) | $0 (free) | $0 (free) | ~$1 | **~$1** |
| **Popular** (10K users/mo) | $0 (free)* | $0 (free)* | ~$1 | **~$1** |
| **Viral** (100K+ users/mo) | $9 (Standard) | Contact PartyKit | ~$1 | **~$10** |

*Free tier handles 10K users easily. Chess is lightweight — small bundle, no server-side rendering, no database.*

**Bottom line:** This app can serve 10K+ monthly users for ~$1/month (just the domain). The architecture (static SPA + edge WebSockets) is inherently cheap to scale.

---

## 4. Performance & Reliability

### Bundle Size — Current State & Recommendations

**Current (good):**
- Index chunk: ~238KB (gzipped ~70KB)
- Code-split pages via React.lazy
- Openings data: 62KB (compressed, lazy-loaded)
- Stockfish WASM: loaded on-demand

**Additional optimizations:**
1. **Analyze bundle** — Add `rollup-plugin-visualizer` to see what's heavy:
   ```bash
   npm install -D rollup-plugin-visualizer
   # Add to vite.config.ts plugins, then:
   npm run build  # Opens treemap visualization
   ```
2. **Check if chess.js + react-chessboard can be trimmed** — these are likely the biggest deps
3. **Consider preloading critical chunks:**
   ```html
   <link rel="modulepreload" href="/assets/GamePage-[hash].js">
   ```
4. **Image optimization** — Ensure PWA icons are properly compressed (use `squoosh` or `sharp`)

### Error Monitoring

**Recommendation: Sentry (free tier)**
- 5K errors/month, 1 user, 10K transactions for performance monitoring
- Perfect for a chess app's traffic level

**Setup:**
```bash
npm install @sentry/react
```
```typescript
// main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://YOUR_DSN@o0.ingest.sentry.io/0",
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1,  // 10% of transactions
  environment: import.meta.env.MODE,
});
```
- Wrap `<App />` in `<Sentry.ErrorBoundary>` (you already have an ErrorBoundary — integrate)
- Free tier URL: https://sentry.io/signup/

**Alternative:** [GlitchTip](https://glitchtip.com/) — open source Sentry alternative, free tier with 1K events/month.

### Uptime Monitoring

**Free options:**
| Service | Free Tier | Check Interval |
|---------|-----------|----------------|
| [UptimeRobot](https://uptimerobot.com/) | 50 monitors, 5-min checks | 5 min |
| [Freshping](https://www.freshworks.com/website-monitoring/) | 50 monitors | 1 min |
| [Cronitor](https://cronitor.io/) | 5 monitors | 30s |

**Recommendation:** UptimeRobot — set up 2 monitors:
1. `https://chessbrain.app` (or current Azure URL) — HTTP 200 check
2. `https://chess-ai-multiplayer.JohnWattenbarger.partykit.dev` — WebSocket connectivity

### Analytics

**Privacy-respecting options (no cookies, GDPR-compliant out of the box):**

| Service | Free Tier | Notes |
|---------|-----------|-------|
| **[Umami](https://umami.is/)** | Self-host free, cloud $9/mo | OSS, can self-host on Vercel free |
| **[Plausible](https://plausible.io/)** | Self-host free, cloud €9/mo | Excellent UI, lightweight script |
| **[Counter.dev](https://counter.dev/)** | Free (forever) | Ultra-minimal, ~1KB script |
| **[GoatCounter](https://www.goatcounter.com/)** | Free for non-commercial | No cookies, 800-byte script |

**Recommendation:** GoatCounter — completely free for personal/non-commercial projects, no cookies, tiny script, and dead simple:
```html
<script data-goatcounter="https://chessbrain.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
```
Sign up at https://www.goatcounter.com/ — takes 30 seconds.

---

## 5. SEO & Discoverability

### Current Setup (already done ✅)
- ✅ `<title>Chess AI — Build Your Chess Brain</title>`
- ✅ Open Graph meta tags (og:title, og:description, og:url)
- ✅ Twitter Card meta tags
- ✅ JSON-LD structured data (WebApplication schema)
- ✅ `robots.txt` with sitemap reference
- ✅ `sitemap.xml` with all routes
- ✅ Custom chess knight SVG favicon
- ✅ PWA manifest with icons
- ✅ Dynamic page titles via usePageTitle hook

### Additional Steps

1. **Google Search Console** (free, essential)
   - Go to https://search.google.com/search-console
   - Add property → URL prefix → enter your domain
   - Verify via HTML meta tag or DNS TXT record
   - Submit sitemap: `https://chessbrain.app/sitemap.xml`
   - Monitor indexing, fix any crawl errors

2. **Update sitemap.xml** after domain change:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url><loc>https://chessbrain.app/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
     <url><loc>https://chessbrain.app/play</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
     <url><loc>https://chessbrain.app/online</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
     <url><loc>https://chessbrain.app/arena</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
     <url><loc>https://chessbrain.app/editor</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
     <url><loc>https://chessbrain.app/setup</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
     <url><loc>https://chessbrain.app/history</loc><changefreq>daily</changefreq><priority>0.7</priority></url>
     <url><loc>https://chessbrain.app/settings</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
   </urlset>
   ```

3. **Add missing routes to sitemap** — `/online` and `/arena` are not in the current sitemap

4. **Improve JSON-LD structured data:**
   ```json
   {
     "@context": "https://schema.org",
     "@type": "WebApplication",
     "name": "Chess Brain",
     "url": "https://chessbrain.app",
     "description": "Build custom chess AI personalities and play against them. Features online multiplayer, Stockfish analysis, bot arena tournaments, and deep game review.",
     "applicationCategory": "GameApplication",
     "operatingSystem": "Any",
     "offers": {
       "@type": "Offer",
       "price": "0",
       "priceCurrency": "USD"
     },
     "screenshot": "https://chessbrain.app/og-image.png",
     "featureList": "Custom AI personalities, Online multiplayer, Stockfish analysis, Bot arena, Game review, PGN import/export, Position setup"
   }
   ```

5. **Create an OG image** — A 1200×630px screenshot/graphic for social sharing. Currently no `og:image` means link previews are text-only (huge missed opportunity).

6. **Add `<link rel="canonical">` to index.html:**
   ```html
   <link rel="canonical" href="https://chessbrain.app/" />
   ```

---

## 6. Marketing Strategy

### Unique Selling Points (vs Lichess/Chess.com)

This is critical — you're not competing with Lichess/Chess.com on their turf. Your angle is **what they don't offer:**

1. **Build Your Own AI** — No other chess platform lets you tweak evaluation weights (material, mobility, king safety, aggression) to create custom AI personalities. This is THE unique hook.
2. **Bot Arena** — Watch your custom AIs fight each other in tournaments with Elo ratings. It's like Pokémon battles but for chess engines.
3. **Free, no account required** — No login, no ads, no premium tier. Just play.
4. **Privacy-first** — No tracking, no data collection, runs entirely in your browser.
5. **Lightweight PWA** — Installs like a native app, works offline, fast.
6. **Open source** — Transparent, community-driven (if you choose to open source).

### Launch Channels

**Tier 1 — High Impact (do these first):**

| Channel | When | Post Title/Angle |
|---------|------|------------------|
| **r/chess** (4M+ members) | Day 1 | "I built a free chess app where you design your own AI opponents" |
| **r/programming** (6M+) | Day 1 | "Show r/programming: Chess AI with customizable evaluation — React + WASM" |
| **Hacker News** (Show HN) | Day 1 | "Show HN: Chess Brain – Build custom chess AI personalities in your browser" |
| **r/webdev** (2M+) | Day 2 | "Built a chess app with React, Web Workers, and Stockfish WASM — here's what I learned" |

**Tier 2 — Targeted Communities:**

| Channel | Angle |
|---------|-------|
| **chess.com forums** | "Free tool for experimenting with chess AI evaluation" |
| **lichess forum** | "Open source chess AI personality builder" (resonates with Lichess OSS ethos) |
| **r/anarchychess** | Meme angle — "I made an AI that plays like my drunk uncle" (custom personality) |
| **r/sideproject** | "Weekend project → full chess platform" |
| **r/reactjs** | Technical deep-dive on Web Workers, code splitting |
| **Dev.to / Hashnode** | Write-up of the technical architecture |
| **X (Twitter)** | Short demo video/GIF of the AI personality editor |

**Tier 3 — Long Tail:**

| Channel | When |
|---------|------|
| **Product Hunt** | Wait until you have 1-2 weeks of user feedback and polish |
| **IndieHackers** | Share the journey, cost breakdown ($1/month hosting) |
| **YouTube** | Demo video showing personality creation → playing → arena |

### Content Strategy

**Launch Post Template (r/chess / HN):**
```
Title: I built a free chess app where you design your own AI opponents

Hey r/chess! I've been working on Chess Brain, a free web app that 
lets you build custom chess AI personalities by tweaking evaluation 
weights — things like aggression, king safety, material greed, and 
mobility.

What makes it different from Lichess/Chess.com:
- Design your own AI opponents (not just difficulty levels)
- Watch your AIs fight in a Bot Arena with Elo ratings
- Play online multiplayer with friends
- Stockfish analysis + custom engine analysis side-by-side
- No account needed, no ads, works offline as a PWA
- Entirely free, runs in your browser

Try it: https://chessbrain.app

Built with React, TypeScript, and a custom chess engine running in 
Web Workers. Stockfish WASM available for serious analysis.

Would love feedback! What AI personality should I build next?
```

**Technical Write-Up Ideas:**
- "Building a Chess Engine in TypeScript: Lessons from Iterative Deepening to Opening Books"
- "Real-time Multiplayer Chess with PartyKit and WebSockets"
- "How I Got a Chess App to 238KB with Code Splitting and WASM"

### Social Media

**Minimal effort approach (John isn't a social media person):**
- Create an X/Twitter account for the project (optional)
- Post a 30-second screen recording/GIF showing the AI editor → gameplay loop
- Let Reddit/HN do the heavy lifting

---

## 7. Legal & Compliance

### Privacy Policy

Even though you don't collect user data, you should have a basic privacy policy page. Multiplayer rooms involve WebSocket connections that could technically expose IP addresses.

**Create `/privacy` route with this content:**

```markdown
# Privacy Policy

Last updated: [Date]

Chess Brain ("the app") is a free, open-source chess application that 
runs entirely in your browser.

## What We Collect
- **Nothing.** We do not collect personal data, create user accounts, 
  use cookies, or track your behavior.
- Game data (history, settings, AI personalities) is stored locally 
  in your browser's localStorage. It never leaves your device.

## Online Multiplayer
- When you play online, a WebSocket connection is made to our game 
  server (PartyKit). Your moves are transmitted in real-time to your 
  opponent.
- No game data is stored on our servers after the session ends.
- Room codes are temporary and expire when both players disconnect.

## Analytics
- [If you add GoatCounter]: We use GoatCounter for anonymous, 
  cookie-free page view analytics. No personal data is collected. 
  See goatcounter.com/help/privacy.

## Third-Party Services
- **Azure Static Web Apps** — Serves the application files
- **PartyKit (Cloudflare)** — Powers online multiplayer connections
- [If added] **GoatCounter** — Anonymous analytics

## Changes
We may update this policy. Changes will be posted on this page.

## Contact
[Your email or GitHub issues link]
```

### Terms of Service

For a free, no-account app, a lightweight ToS is sufficient:

```markdown
# Terms of Service

Chess Brain is provided "as is" without warranty. Use at your own risk.

- The app is free for personal use
- Don't abuse the multiplayer service (spam, automation, harassment)
- We may modify or discontinue the service at any time
- Game results and AI ratings are for entertainment only
```

### Open Source Licensing

If you plan to open source (recommended — it's a great story for HN/Lichess community):

- **Recommended license:** MIT or AGPL-3.0
  - **MIT** — Maximum adoption, anyone can use/modify/commercial
  - **AGPL-3.0** — Like Lichess uses. Requires derivative works to also be open source. Good for chess community credibility.
- **Dependencies to check:** chess.js (BSD), react-chessboard (MIT), Stockfish (GPL). If Stockfish GPL code is bundled, the whole app should be GPL-compatible.
- **⚠️ Stockfish is GPL.** Since you're loading Stockfish WASM, and GPL applies to distribution, you should use GPL-3.0 or AGPL-3.0 for compatibility. Or clearly separate Stockfish as an optional module.

**Recommendation:** Use **AGPL-3.0** — matches Lichess community values, compatible with Stockfish GPL, signals you're "one of us" to the chess open source community.

---

## 8. Launch Checklist

Complete these in order. Each step has a time estimate.

### Phase 1: Pre-Launch Prep (1 weekend)

- [ ] **1. Buy domain** — Register `chessbrain.app` (or preferred) on Cloudflare Registrar or Namecheap (~$14/yr). ⏱️ 10 min
- [ ] **2. Connect domain to Azure SWA** — Azure Portal → Static Web Apps → Custom domains → Add → set DNS CNAME. Wait for SSL cert provisioning. ⏱️ 20 min
- [ ] **3. Update all URLs** — In `sitemap.xml`, `robots.txt`, `index.html` (og:url, canonical), `manifest.json`: replace `nice-desert-0df9bdf1e.4.azurestaticapps.net` with new domain. ⏱️ 15 min
- [ ] **4. Add `/online` and `/arena` to sitemap.xml** — Currently missing. ⏱️ 5 min
- [ ] **5. Create OG image** — 1200×630px graphic for social sharing. Screenshot of the app with logo overlay. Set as `og:image` in index.html. ⏱️ 30 min
- [ ] **6. Add canonical link** — `<link rel="canonical" href="https://chessbrain.app/" />` in index.html. ⏱️ 2 min
- [ ] **7. Add cache headers** — Create/update `staticwebapp.config.json` with cache rules for assets, no-cache for index.html and sw.js. ⏱️ 10 min
- [ ] **8. Add privacy policy page** — Create `/privacy` route with privacy policy content. ⏱️ 20 min
- [ ] **9. Add terms of service page** — Create `/terms` route with ToS content. Link from footer/settings. ⏱️ 15 min
- [ ] **10. Choose license** — Add LICENSE file (AGPL-3.0 recommended). Add to repo root. ⏱️ 5 min

### Phase 2: Monitoring & Analytics (1 evening)

- [ ] **11. Set up GoatCounter** — Sign up at goatcounter.com, add script tag to index.html. ⏱️ 10 min
- [ ] **12. Set up UptimeRobot** — Create free account, add monitors for main site + PartyKit endpoint. ⏱️ 10 min
- [ ] **13. Set up Sentry** — Create free account, install @sentry/react, add init to main.tsx, integrate with ErrorBoundary. ⏱️ 30 min
- [ ] **14. Google Search Console** — Add property, verify via DNS/meta tag, submit sitemap. ⏱️ 15 min
- [ ] **15. Test everything** — Full run-through of all Core Flows (listed in PROGRESS.md). Verify on mobile + desktop. ⏱️ 30 min

### Phase 3: Launch Day 🚀

- [ ] **16. Write launch post** — Craft r/chess and HN posts (use template above). Have a friend proofread. ⏱️ 30 min
- [ ] **17. Prepare demo GIF/video** — Record a 30-sec screen capture showing: create AI → play → arena. ⏱️ 20 min
- [ ] **18. Post to r/chess** — Morning (US time, ~10 AM ET for maximum visibility). ⏱️ 5 min
- [ ] **19. Post to Hacker News** — "Show HN" format. Different angle than Reddit (more technical). ⏱️ 5 min
- [ ] **20. Monitor & respond** — Stay active in comment threads for the first 24 hours. Answer questions, take feedback. ⏱️ Ongoing
- [ ] **21. Post to r/programming, r/webdev** — Day 2, with technical angle. ⏱️ 10 min

### Phase 4: Post-Launch (Week 1)

- [ ] **22. Fix critical feedback** — Address top user-reported issues. ⏱️ Variable
- [ ] **23. Post to Product Hunt** — After initial feedback is incorporated. ⏱️ 30 min
- [ ] **24. Write technical blog post** — Dev.to or personal blog. "How I Built a Chess AI Platform for $1/month." ⏱️ 2 hrs
- [ ] **25. Open source the repo** — Make GitHub repo public, add README with screenshots, contributing guide. ⏱️ 1 hr
- [ ] **26. Submit to chess forums** — chess.com forums, lichess forum. ⏱️ 15 min

---

## Summary: Total Cost to Go Live

| Item | One-time | Monthly |
|------|----------|---------|
| Domain (Cloudflare) | — | ~$1.17 |
| Azure SWA | — | $0 (free) |
| PartyKit | — | $0 (free) |
| GoatCounter | — | $0 (free) |
| UptimeRobot | — | $0 (free) |
| Sentry | — | $0 (free) |
| **Total** | **$0** | **~$1.17** |

**Total cost to launch a production chess platform: ~$14/year for the domain. Everything else is free.**

---

## Appendix: When to Upgrade (and to What)

| Trigger | Action | Cost |
|---------|--------|------|
| >50K monthly users | Azure SWA Standard | +$9/mo |
| Need server-side features | Add Azure Functions (included in Standard) | $0 extra |
| Multiplayer abuse | PartyKit Pro (rate limiting, analytics) | Contact PartyKit |
| Error volume >5K/mo | Sentry Team plan | $26/mo |
| Want rich analytics | Plausible Cloud | €9/mo |
| Want email notifications | Any transactional email (Resend free tier) | $0 |

None of these are needed at launch. Revisit after hitting 10K monthly users.
