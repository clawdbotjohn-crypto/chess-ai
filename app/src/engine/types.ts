/**
 * Chess AI Engine Types
 * All tunable configuration interfaces for the evaluation function.
 */

export interface PieceValues {
  [key: string]: number;
  pawn: number;
  knight: number;
  bishop: number;
  rook: number;
  queen: number;
}

export interface PositionalWeights {
  [key: string]: number;
  centerControl: number;
  pawnAdvancement: number;
  mobility: number;
  /** Penalty for doubled/isolated pawns (0-20, default 5) */
  pawnStructure: number;
}

export interface KingSafetyWeights {
  [key: string]: number;
  castleBonus: number;
  pawnShield: number;
  exposurePenalty: number;
}

export interface TacticalWeights {
  [key: string]: number;
  attackWeight: number;
  defenseWeight: number;
  aggression: number;
}

/** Per-phase weight overrides. Only specified fields override the base config. */
export interface PhaseOverrides {
  positional?: Partial<PositionalWeights>;
  kingSafety?: Partial<KingSafetyWeights>;
  tactical?: Partial<TacticalWeights>;
}

/** Phase-dependent settings (opening/endgame overrides; base config = middlegame) */
export interface PhaseSettings {
  opening?: PhaseOverrides;
  endgame?: PhaseOverrides;
}

export interface SearchConfig {
  [key: string]: number;
  /** Search depth 1-7 (higher = stronger but slower) */
  depth: number;
}

export interface RandomnessConfig {
  [key: string]: number;
  /** 0 = always best move, higher = select from top N moves within this centipawn threshold */
  threshold: number;
}

export interface EvaluationConfig {
  pieceValues: PieceValues;
  positional: PositionalWeights;
  kingSafety: KingSafetyWeights;
  tactical: TacticalWeights;
  search: SearchConfig;
  randomness: RandomnessConfig;
  /** Phase-specific overrides. Base config acts as middlegame defaults. */
  phases?: PhaseSettings;
  /** Per-personality opening book toggle. When undefined, falls back to global setting. */
  openingBookEnabled?: boolean;
}

/** Default config based on classical chess values */
export const DEFAULT_CONFIG: EvaluationConfig = {
  pieceValues: {
    pawn: 100,
    knight: 300,
    bishop: 325,
    rook: 500,
    queen: 900,
  },
  positional: {
    centerControl: 10,
    pawnAdvancement: 5,
    mobility: 2,
    pawnStructure: 5,
  },
  kingSafety: {
    castleBonus: 60,
    pawnShield: 25,
    exposurePenalty: 50,
  },
  tactical: {
    attackWeight: 0,
    defenseWeight: 0,
    aggression: 50,
  },
  search: {
    depth: 4,
  },
  randomness: {
    threshold: 0,
  },
  phases: {
    opening: {
      positional: { centerControl: 15, pawnAdvancement: 2, mobility: 3 },
      kingSafety: { castleBonus: 80 },
      tactical: { aggression: 30 },
    },
    endgame: {
      positional: { centerControl: 5, pawnAdvancement: 12, mobility: 4, pawnStructure: 8 },
      kingSafety: { castleBonus: 5, pawnShield: 5, exposurePenalty: 10 },
      tactical: { aggression: 20 },
    },
  },
};

/** Time control configuration */
export interface TimeControl {
  type: 'none' | 'fixed' | 'increment' | 'correspondence'
  initialTimeMs: number
  incrementMs: number
  label: string
}

export const TIME_CONTROLS: TimeControl[] = [
  { type: 'none', initialTimeMs: 0, incrementMs: 0, label: 'No Limit' },
  { type: 'fixed', initialTimeMs: 60000, incrementMs: 0, label: '1+0 Bullet' },
  { type: 'fixed', initialTimeMs: 180000, incrementMs: 0, label: '3+0 Blitz' },
  { type: 'increment', initialTimeMs: 180000, incrementMs: 2000, label: '3+2 Blitz' },
  { type: 'fixed', initialTimeMs: 300000, incrementMs: 0, label: '5+0 Rapid' },
  { type: 'fixed', initialTimeMs: 600000, incrementMs: 0, label: '10+0 Rapid' },
  { type: 'increment', initialTimeMs: 900000, incrementMs: 10000, label: '15+10 Classical' },
  { type: 'fixed', initialTimeMs: 1800000, incrementMs: 0, label: '30+0 Classical' },
]

/** Messages sent TO the AI worker */
export interface WorkerRequest {
  type: 'move' | 'eval';
  fen: string;
  config: EvaluationConfig;
  openingBookEnabled?: boolean;
}

/** Messages sent FROM the AI worker */
export interface WorkerResponse {
  type: 'bestmove' | 'eval' | 'progress';
  move: string;
  evaluation: number;
  nodes?: number;
  timeMs?: number;
  depth?: number;
  maxDepth?: number;
  isBookMove?: boolean;
}
