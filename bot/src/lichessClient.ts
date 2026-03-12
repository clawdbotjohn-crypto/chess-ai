/**
 * Lichess API Streaming Client
 * 
 * Handles NDJSON streaming for events and game state,
 * plus REST calls for moves, challenge acceptance, etc.
 */

const BASE_URL = 'https://lichess.org';

export interface LichessChallenge {
  id: string;
  rated: boolean;
  variant: { key: string };
  speed: string;
  timeControl: { type: string; limit?: number; increment?: number };
  color: string;
  challenger: { id: string; name: string; rating: number };
  destUser: { id: string; name: string };
}

export interface LichessGameFull {
  type: 'gameFull';
  id: string;
  rated: boolean;
  variant: { key: string };
  speed: string;
  white: { id: string; name: string; rating?: number };
  black: { id: string; name: string; rating?: number };
  initialFen: string;
  state: LichessGameState;
}

export interface LichessGameState {
  type: 'gameState';
  moves: string;        // UCI moves separated by spaces
  wtime: number;
  btime: number;
  winc: number;
  binc: number;
  status: string;       // 'started' | 'mate' | 'resign' | 'stalemate' | 'draw' | ...
  winner?: string;      // 'white' | 'black'
}

export interface LichessEvent {
  type: string;
  challenge?: LichessChallenge;
  game?: { id: string; color: string; fen: string; isMyTurn: boolean; opponent: { username: string } };
}

export class LichessClient {
  private token: string;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(token: string) {
    this.token = token;
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/x-ndjson',
    };
  }

  /** Get bot account info */
  async getAccount(): Promise<{ id: string; username: string }> {
    const res = await fetch(`${BASE_URL}/api/account`, {
      headers: { 'Authorization': `Bearer ${this.token}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to get account: ${res.status} ${await res.text()}`);
    }
    return res.json() as Promise<{ id: string; username: string }>;
  }

  /** Stream incoming events (challenges, game starts) */
  async *streamEvents(signal?: AbortSignal): AsyncGenerator<LichessEvent> {
    const res = await fetch(`${BASE_URL}/api/stream/event`, {
      headers: this.headers(),
      signal,
    });
    if (!res.ok) {
      throw new Error(`Event stream failed: ${res.status} ${await res.text()}`);
    }
    yield* this.parseNDJSON<LichessEvent>(res, signal);
  }

  /** Stream a game's state */
  async *streamGame(gameId: string): AsyncGenerator<LichessGameFull | LichessGameState> {
    const controller = new AbortController();
    this.abortControllers.set(gameId, controller);

    try {
      const res = await fetch(`${BASE_URL}/api/bot/game/stream/${gameId}`, {
        headers: this.headers(),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Game stream failed: ${res.status} ${await res.text()}`);
      }
      yield* this.parseNDJSON<LichessGameFull | LichessGameState>(res, controller.signal);
    } finally {
      this.abortControllers.delete(gameId);
    }
  }

  /** Accept a challenge */
  async acceptChallenge(challengeId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/challenge/${challengeId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
    });
    if (!res.ok) {
      console.error(`Failed to accept challenge ${challengeId}: ${res.status}`);
    }
  }

  /** Decline a challenge */
  async declineChallenge(challengeId: string, reason: string = 'generic'): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/challenge/${challengeId}/decline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `reason=${reason}`,
    });
    if (!res.ok) {
      console.error(`Failed to decline challenge ${challengeId}: ${res.status}`);
    }
  }

  /** Make a move (UCI format, e.g., "e2e4") */
  async makeMove(gameId: string, move: string): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/api/bot/game/${gameId}/move/${move}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
    });
    if (!res.ok) {
      console.error(`Failed to make move ${move} in game ${gameId}: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  }

  /** Resign a game */
  async resign(gameId: string): Promise<void> {
    await fetch(`${BASE_URL}/api/bot/game/${gameId}/resign`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
    });
  }

  /** Send a chat message */
  async chat(gameId: string, room: 'player' | 'spectator', text: string): Promise<void> {
    await fetch(`${BASE_URL}/api/bot/game/${gameId}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `room=${room}&text=${encodeURIComponent(text)}`,
    });
  }

  /** Stop streaming a specific game */
  abortGame(gameId: string): void {
    const controller = this.abortControllers.get(gameId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(gameId);
    }
  }

  /** Parse NDJSON stream */
  private async *parseNDJSON<T>(response: Response, signal?: AbortSignal): AsyncGenerator<T> {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue; // Keep-alive empty line
          try {
            yield JSON.parse(trimmed) as T;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
