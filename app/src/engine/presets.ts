import type { EvaluationConfig } from './types';
import { DEFAULT_CONFIG } from './types';

export type PresetName = 'DEFAULT' | 'AGGRESSIVE' | 'DEFENSIVE' | 'CHAOTIC' | 'TACTICAL' | 'POSITIONAL';

export const PRESETS: Record<PresetName, { label: string; description: string; config: EvaluationConfig }> = {
  DEFAULT: {
    label: 'Classical',
    description: 'Balanced play with standard piece values',
    config: DEFAULT_CONFIG,
  },
  AGGRESSIVE: {
    label: 'Aggressive',
    description: 'High aggression, low defense, prefers attacks',
    config: {
      pieceValues: { pawn: 90, knight: 340, bishop: 350, rook: 480, queen: 950 },
      positional: { centerControl: 40, pawnAdvancement: 50, mobility: 60, pawnStructure: 2 },
      kingSafety: { castleBonus: 30, pawnShield: 20, exposurePenalty: 25 },
      tactical: { attackWeight: 40, defenseWeight: 5, aggression: 90 },
      search: { depth: 4 },
      randomness: { threshold: 10 },
      phases: {
        opening: {
          positional: { centerControl: 50, mobility: 70 },
          kingSafety: { castleBonus: 15 },
          tactical: { aggression: 100 },
        },
        endgame: {
          positional: { pawnAdvancement: 60, centerControl: 20, pawnStructure: 5 },
          kingSafety: { castleBonus: 5, pawnShield: 5, exposurePenalty: 10 },
          tactical: { aggression: 60 },
        },
      },
    },
  },
  DEFENSIVE: {
    label: 'Defensive',
    description: 'High defense, strong castle, avoids trades',
    config: {
      pieceValues: { pawn: 110, knight: 310, bishop: 320, rook: 520, queen: 880 },
      positional: { centerControl: 60, pawnAdvancement: 20, mobility: 30, pawnStructure: 10 },
      kingSafety: { castleBonus: 90, pawnShield: 80, exposurePenalty: 85 },
      tactical: { attackWeight: 5, defenseWeight: 40, aggression: 15 },
      search: { depth: 4 },
      randomness: { threshold: 3 },
      phases: {
        opening: {
          positional: { centerControl: 70, pawnAdvancement: 10 },
          kingSafety: { castleBonus: 100, pawnShield: 90 },
          tactical: { aggression: 10 },
        },
        endgame: {
          positional: { pawnAdvancement: 40, pawnStructure: 15, centerControl: 40 },
          kingSafety: { castleBonus: 50, pawnShield: 40, exposurePenalty: 60 },
          tactical: { aggression: 20 },
        },
      },
    },
  },
  CHAOTIC: {
    label: 'Chaotic',
    description: 'High randomness, erratic and unpredictable play',
    config: {
      pieceValues: { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900 },
      positional: { centerControl: 30, pawnAdvancement: 40, mobility: 50, pawnStructure: 3 },
      kingSafety: { castleBonus: 40, pawnShield: 30, exposurePenalty: 35 },
      tactical: { attackWeight: 20, defenseWeight: 10, aggression: 60 },
      search: { depth: 3 },
      randomness: { threshold: 80 },
      phases: {
        opening: {
          positional: { centerControl: 80, pawnAdvancement: 5, mobility: 90 },
          kingSafety: { castleBonus: 10 },
          tactical: { aggression: 90 },
        },
        endgame: {
          positional: { centerControl: 5, pawnAdvancement: 80, mobility: 10, pawnStructure: 1 },
          kingSafety: { castleBonus: 5, pawnShield: 5, exposurePenalty: 5 },
          tactical: { aggression: 10 },
        },
      },
    },
  },
  TACTICAL: {
    label: 'Tactical',
    description: 'High attack & defense weights, precise calculation',
    config: {
      pieceValues: { pawn: 100, knight: 330, bishop: 340, rook: 510, queen: 920 },
      positional: { centerControl: 45, pawnAdvancement: 25, mobility: 55, pawnStructure: 7 },
      kingSafety: { castleBonus: 55, pawnShield: 50, exposurePenalty: 60 },
      tactical: { attackWeight: 35, defenseWeight: 25, aggression: 65 },
      search: { depth: 5 },
      randomness: { threshold: 2 },
      phases: {
        opening: {
          positional: { centerControl: 55, mobility: 65 },
          kingSafety: { castleBonus: 65 },
          tactical: { aggression: 80 },
        },
        endgame: {
          positional: { pawnAdvancement: 45, pawnStructure: 10, centerControl: 30 },
          kingSafety: { castleBonus: 20, pawnShield: 20, exposurePenalty: 30 },
          tactical: { aggression: 50 },
        },
      },
    },
  },
  POSITIONAL: {
    label: 'Positional',
    description: 'High center control, pawn advancement, low randomness',
    config: {
      pieceValues: { pawn: 115, knight: 310, bishop: 335, rook: 495, queen: 890 },
      positional: { centerControl: 85, pawnAdvancement: 70, mobility: 65, pawnStructure: 12 },
      kingSafety: { castleBonus: 65, pawnShield: 55, exposurePenalty: 50 },
      tactical: { attackWeight: 15, defenseWeight: 20, aggression: 30 },
      search: { depth: 4 },
      randomness: { threshold: 3 },
      phases: {
        opening: {
          positional: { centerControl: 95, pawnAdvancement: 15, mobility: 50 },
          kingSafety: { castleBonus: 75 },
          tactical: { aggression: 20 },
        },
        endgame: {
          positional: { pawnAdvancement: 90, pawnStructure: 18, centerControl: 40, mobility: 45 },
          kingSafety: { castleBonus: 30, pawnShield: 25, exposurePenalty: 25 },
          tactical: { aggression: 15 },
        },
      },
    },
  },
};

export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];
