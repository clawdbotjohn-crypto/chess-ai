/**
 * ECO Opening Name Lookup
 * Uses compressed trie-based Lichess chess-openings dataset (3600+ openings).
 * Data is deflate-compressed and decoded at runtime.
 */

interface OpeningInfo {
  eco: string
  name: string
}

interface TrieData {
  _e: string[]  // eco codes indexed
  _s: string[]  // name segments indexed
  t: TrieNode
}

interface TrieNode {
  _?: number[]  // [ecoIndex, nameSegIdx1, nameSegIdx2, ...]
  [move: string]: TrieNode | number[] | undefined
}

let trieData: TrieData | null = null
let loadPromise: Promise<TrieData> | null = null

async function decompressData(): Promise<TrieData> {
  const { COMPRESSED_OPENINGS } = await import('../data/openings-compressed')
  
  // Decode base64 to binary
  const binaryStr = atob(COMPRESSED_OPENINGS)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  
  // Decompress using DecompressionStream (available in all modern browsers)
  const ds = new DecompressionStream('deflate')
  const writer = ds.writable.getWriter()
  writer.write(bytes)
  writer.close()
  
  const reader = ds.readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  
  const totalLen = chunks.reduce((s, c) => s + c.length, 0)
  const result = new Uint8Array(totalLen)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  
  const jsonStr = new TextDecoder().decode(result)
  return JSON.parse(jsonStr) as TrieData
}

async function loadOpenings(): Promise<TrieData> {
  if (trieData) return trieData
  if (!loadPromise) {
    loadPromise = decompressData().then(data => {
      trieData = data
      return trieData
    })
  }
  return loadPromise
}

function resolveOpening(data: TrieData, entry: number[]): OpeningInfo {
  return {
    eco: data._e[entry[0]],
    name: entry.slice(1).map(i => data._s[i]).join(': ')
  }
}

function walkTrie(data: TrieData, moves: string[]): OpeningInfo | null {
  let node: TrieNode = data.t
  let best: OpeningInfo | null = null

  for (let i = 0; i < moves.length; i++) {
    const child = node[moves[i]]
    if (!child || Array.isArray(child)) break
    node = child as TrieNode
    if (node._) {
      best = resolveOpening(data, node._)
    }
    // Early exit: most openings are defined within the first 20 moves
    if (i > 20 && !best) break
  }
  return best
}

/**
 * Synchronous lookup — returns null if data hasn't loaded yet.
 * Call ensureOpeningsLoaded() first if you need guaranteed results.
 */
export function lookupOpening(moves: string[]): OpeningInfo | null {
  if (!trieData) {
    // Trigger load for next time
    loadOpenings()
    return null
  }
  return walkTrie(trieData, moves)
}

/**
 * Async version — waits for data to load, then looks up.
 */
export async function lookupOpeningAsync(moves: string[]): Promise<OpeningInfo | null> {
  const data = await loadOpenings()
  return walkTrie(data, moves)
}

/**
 * Pre-load the openings data. Call this early (e.g., on app mount or route enter).
 */
export async function ensureOpeningsLoaded(): Promise<void> {
  await loadOpenings()
}

/**
 * Get the raw trie data (for opening book).
 * Returns null if not loaded yet.
 */
export function getTrieData(): TrieData | null {
  return trieData
}

/**
 * Async getter for raw trie data (for opening book).
 */
export async function getTrieDataAsync(): Promise<TrieData> {
  return loadOpenings()
}
