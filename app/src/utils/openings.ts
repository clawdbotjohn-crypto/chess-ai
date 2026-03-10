/**
 * ECO Opening Name Lookup
 * Uses lazy-loaded Lichess chess-openings dataset (3600+ openings).
 */

interface OpeningInfo {
  eco: string
  name: string
}

let openingsCache: Record<string, OpeningInfo> | null = null
let loadPromise: Promise<Record<string, OpeningInfo>> | null = null

async function loadOpenings(): Promise<Record<string, OpeningInfo>> {
  if (openingsCache) return openingsCache
  if (!loadPromise) {
    loadPromise = import('../data/openings.json').then(mod => {
      openingsCache = mod.default as Record<string, OpeningInfo>
      return openingsCache
    })
  }
  return loadPromise
}

/**
 * Synchronous lookup — returns null if data hasn't loaded yet.
 * Call ensureOpeningsLoaded() first if you need guaranteed results.
 */
export function lookupOpening(moves: string[]): OpeningInfo | null {
  if (!openingsCache) {
    // Trigger load for next time
    loadOpenings()
    return null
  }

  let best: OpeningInfo | null = null
  let key = ''
  for (let i = 0; i < moves.length; i++) {
    if (i > 0) key += ' '
    key += moves[i]
    const match = openingsCache[key]
    if (match) best = match
  }
  return best
}

/**
 * Async version — waits for data to load, then looks up.
 */
export async function lookupOpeningAsync(moves: string[]): Promise<OpeningInfo | null> {
  const data = await loadOpenings()

  let best: OpeningInfo | null = null
  let key = ''
  for (let i = 0; i < moves.length; i++) {
    if (i > 0) key += ' '
    key += moves[i]
    const match = data[key]
    if (match) best = match
  }
  return best
}

/**
 * Pre-load the openings data. Call this early (e.g., on app mount or route enter).
 */
export async function ensureOpeningsLoaded(): Promise<void> {
  await loadOpenings()
}
