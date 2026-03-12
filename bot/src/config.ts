/**
 * Bot Configuration
 * 
 * Handles environment variables, CLI args, and personality loading.
 */

import { readFileSync } from 'fs';
import type { EvaluationConfig } from '../../app/src/engine/types.js';
import { PRESETS, PRESET_NAMES } from '../../app/src/engine/presets.js';
import type { PresetName } from '../../app/src/engine/presets.js';

export interface BotConfig {
  lichessToken: string;
  personality: EvaluationConfig;
  personalityName: string;
  acceptRated: boolean;
  acceptCasual: boolean;
  maxConcurrentGames: number;
  openingBookEnabled: boolean;
}

function parseArgs(): { personality?: string; configFile?: string; help?: boolean } {
  const args = process.argv.slice(2);
  const result: { personality?: string; configFile?: string; help?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--personality' || args[i] === '-p') {
      result.personality = args[++i];
    } else if (args[i] === '--config' || args[i] === '-c') {
      result.configFile = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      result.help = true;
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
Chess AI Lichess Bot
====================

Usage: npx tsx src/bot.ts [options]

Options:
  --personality, -p <name>   Load a personality preset (default: DEFAULT)
                             Available: ${PRESET_NAMES.join(', ')}
  --config, -c <file>        Load personality from a JSON file
  --help, -h                 Show this help message

Environment:
  LICHESS_TOKEN              Required. Your Lichess BOT account API token.
                             Create one at https://lichess.org/account/oauth/token
                             with the bot:play scope.

  ACCEPT_RATED=true|false    Accept rated challenges (default: true)
  ACCEPT_CASUAL=true|false   Accept casual challenges (default: true)
  MAX_CONCURRENT=N           Max simultaneous games (default: 3)
  OPENING_BOOK=true|false    Use opening book (default: true)

Examples:
  LICHESS_TOKEN=lip_xxx npx tsx src/bot.ts
  LICHESS_TOKEN=lip_xxx npx tsx src/bot.ts --personality AGGRESSIVE
  LICHESS_TOKEN=lip_xxx npx tsx src/bot.ts --config my-personality.json
  `);
}

export function loadConfig(): BotConfig | null {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return null;
  }

  const lichessToken = process.env.LICHESS_TOKEN;
  if (!lichessToken) {
    console.error('Error: LICHESS_TOKEN environment variable is required.');
    console.error('Run with --help for setup instructions.');
    process.exit(1);
  }

  let personality: EvaluationConfig;
  let personalityName: string;

  if (args.configFile) {
    try {
      const raw = readFileSync(args.configFile, 'utf-8');
      const parsed = JSON.parse(raw);
      // Support both raw EvaluationConfig and wrapped format
      personality = parsed.config || parsed;
      personalityName = parsed.name || args.configFile;
      console.log(`Loaded personality from file: ${args.configFile}`);
    } catch (err) {
      console.error(`Error loading config file "${args.configFile}":`, err);
      process.exit(1);
    }
  } else {
    const presetKey = (args.personality || 'DEFAULT').toUpperCase() as PresetName;
    if (!PRESETS[presetKey]) {
      console.error(`Unknown personality: ${args.personality}`);
      console.error(`Available: ${PRESET_NAMES.join(', ')}`);
      process.exit(1);
    }
    personality = PRESETS[presetKey].config;
    personalityName = PRESETS[presetKey].label;
    console.log(`Using personality: ${personalityName} (${presetKey})`);
  }

  return {
    lichessToken,
    personality,
    personalityName,
    acceptRated: process.env.ACCEPT_RATED !== 'false',
    acceptCasual: process.env.ACCEPT_CASUAL !== 'false',
    maxConcurrentGames: parseInt(process.env.MAX_CONCURRENT || '3', 10),
    openingBookEnabled: process.env.OPENING_BOOK !== 'false',
  };
}
