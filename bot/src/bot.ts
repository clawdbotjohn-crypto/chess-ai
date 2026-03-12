/**
 * Chess AI Lichess Bot — Main Entry Point
 * 
 * Connects to Lichess streaming API, accepts challenges,
 * and plays games using our custom chess engine.
 */

import { loadConfig, type BotConfig } from './config.js';
import { LichessClient, type LichessGameFull, type LichessGameState, type LichessChallenge } from './lichessClient.js';
import { getBestMove, uciMovesToFen } from './engine.js';

let botId = '';
const activeGames = new Set<string>();

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

/**
 * Handle a single game from start to finish.
 */
async function playGame(
  client: LichessClient,
  gameId: string,
  config: BotConfig,
): Promise<void> {
  log(`Game ${gameId}: connecting...`);
  activeGames.add(gameId);

  try {
    for await (const event of client.streamGame(gameId)) {
      if (event.type === 'gameFull') {
        const game = event as LichessGameFull;
        const weAreWhite = game.white.id === botId;
        const opponent = weAreWhite ? game.black : game.white;
        log(`Game ${gameId}: vs ${opponent.name} (${opponent.rating || '?'}) as ${weAreWhite ? 'white' : 'black'} [${game.speed}${game.rated ? ' rated' : ' casual'}]`);

        // Send a friendly greeting
        await client.chat(gameId, 'player', `Good luck! Playing as "${config.personalityName}" personality.`);

        // Process initial state
        await handleGameState(client, gameId, game.state, game.initialFen, weAreWhite, config);
      } else if (event.type === 'gameState') {
        const state = event as LichessGameState;
        if (state.status !== 'started') {
          log(`Game ${gameId}: ended — ${state.status}${state.winner ? ` (${state.winner} wins)` : ''}`);
          break;
        }
        // We need the initialFen from gameFull, but for standard games it's always startpos
        await handleGameState(client, gameId, state, 'startpos', undefined, config);
      } else if ((event as any).type === 'chatLine') {
        // Ignore chat for now
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      log(`Game ${gameId}: stream aborted`);
    } else {
      log(`Game ${gameId}: error — ${err.message}`);
    }
  } finally {
    activeGames.delete(gameId);
    log(`Game ${gameId}: finished (${activeGames.size} active games remaining)`);
  }
}

// Track game context for proper color detection
const gameContext = new Map<string, { weAreWhite: boolean; initialFen: string }>();

/**
 * Process a game state update and make a move if it's our turn.
 */
async function handleGameState(
  client: LichessClient,
  gameId: string,
  state: LichessGameState,
  initialFen: string,
  weAreWhite: boolean | undefined,
  config: BotConfig,
): Promise<void> {
  // Store/retrieve game context
  if (weAreWhite !== undefined) {
    gameContext.set(gameId, { weAreWhite, initialFen });
  }
  const ctx = gameContext.get(gameId);
  if (!ctx) {
    log(`Game ${gameId}: no context, skipping`);
    return;
  }

  const moves = state.moves ? state.moves.split(' ').filter(m => m.length > 0) : [];
  const isWhiteTurn = moves.length % 2 === 0;
  const isOurTurn = ctx.weAreWhite === isWhiteTurn;

  if (!isOurTurn) return;

  try {
    // Build current position
    const fen = moves.length === 0
      ? (ctx.initialFen === 'startpos' ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : ctx.initialFen)
      : uciMovesToFen(ctx.initialFen, moves);

    log(`Game ${gameId}: thinking... (move ${Math.floor(moves.length / 2) + 1}${ctx.weAreWhite ? ' as white' : ' as black'})`);

    const result = getBestMove(fen, config.personality, config.openingBookEnabled);

    log(`Game ${gameId}: playing ${result.sanMove} (${result.uciMove})${result.isBookMove ? ' [book]' : ` [eval: ${(result.evaluation / 100).toFixed(2)}, ${result.nodes} nodes, ${result.timeMs.toFixed(0)}ms]`}`);

    const success = await client.makeMove(gameId, result.uciMove);
    if (!success) {
      log(`Game ${gameId}: move ${result.uciMove} rejected by Lichess!`);
    }
  } catch (err: any) {
    log(`Game ${gameId}: engine error — ${err.message}`);
    // If the engine fails, resign gracefully
    log(`Game ${gameId}: resigning due to error`);
    await client.resign(gameId);
  }
}

/**
 * Decide whether to accept a challenge.
 */
function shouldAccept(challenge: LichessChallenge, config: BotConfig): { accept: boolean; reason?: string } {
  // Only accept standard chess
  if (challenge.variant.key !== 'standard') {
    return { accept: false, reason: 'variant' };
  }

  // Check rated/casual preference
  if (challenge.rated && !config.acceptRated) {
    return { accept: false, reason: 'casual' };
  }
  if (!challenge.rated && !config.acceptCasual) {
    return { accept: false, reason: 'casual' };
  }

  // Check concurrent game limit
  if (activeGames.size >= config.maxConcurrentGames) {
    return { accept: false, reason: 'later' };
  }

  return { accept: true };
}

/**
 * Main bot loop.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  if (!config) return; // --help was shown

  const client = new LichessClient(config.lichessToken);

  // Verify account
  try {
    const account = await client.getAccount();
    botId = account.id;
    log(`Logged in as: ${account.username} (${botId})`);
  } catch (err: any) {
    console.error(`Failed to connect to Lichess: ${err.message}`);
    console.error('Check your LICHESS_TOKEN is valid and has bot:play scope.');
    process.exit(1);
  }

  log(`Personality: ${config.personalityName}`);
  log(`Opening book: ${config.openingBookEnabled ? 'enabled' : 'disabled'}`);
  log(`Accept rated: ${config.acceptRated} | Accept casual: ${config.acceptCasual}`);
  log(`Max concurrent games: ${config.maxConcurrentGames}`);
  log('Waiting for challenges...');

  // Handle graceful shutdown
  const abortController = new AbortController();
  process.on('SIGINT', () => {
    log('Shutting down...');
    abortController.abort();
  });
  process.on('SIGTERM', () => {
    log('Shutting down...');
    abortController.abort();
  });

  try {
    for await (const event of client.streamEvents(abortController.signal)) {
      if (event.type === 'challenge') {
        const challenge = event.challenge!;
        const { accept, reason } = shouldAccept(challenge, config);

        if (accept) {
          log(`Accepting challenge from ${challenge.challenger.name} (${challenge.challenger.rating}) — ${challenge.timeControl.type === 'unlimited' ? 'unlimited' : `${(challenge.timeControl.limit || 0) / 60}+${challenge.timeControl.increment || 0}`} ${challenge.rated ? 'rated' : 'casual'}`);
          await client.acceptChallenge(challenge.id);
        } else {
          log(`Declining challenge from ${challenge.challenger.name} — reason: ${reason}`);
          await client.declineChallenge(challenge.id, reason);
        }
      } else if (event.type === 'gameStart') {
        const gameId = event.game!.id;
        if (!activeGames.has(gameId)) {
          // Play game in background — don't await
          playGame(client, gameId, config).catch(err => {
            log(`Game ${gameId}: unhandled error — ${err.message}`);
            activeGames.delete(gameId);
          });
        }
      } else if (event.type === 'gameFinish') {
        // Game ended, cleanup handled by playGame
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      log('Event stream closed');
    } else {
      log(`Event stream error: ${err.message}`);
      process.exit(1);
    }
  }

  log('Bot stopped.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
