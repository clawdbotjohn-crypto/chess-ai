/**
 * BotArenaPage — Bot vs Bot Matchmaking with Elo Ratings
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Trophy, Swords, Play, Square, RotateCcw, ChevronLeft, Zap, Eye, Crown, Medal, Award } from 'lucide-react';
import { useBotArena } from '../hooks/useBotArena';
import { getBotDisplayName } from '../utils/botArena';
import type { BotIdentity } from '../utils/botArena';
import type { EloRecord } from '../utils/eloRating';

// ── Helpers ───────────────────────────────────────────────

function eloBadge(rating: number) {
  if (rating >= 1500) return { icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
  if (rating >= 1300) return { icon: Medal, color: 'text-blue-400', bg: 'bg-blue-400/10' };
  if (rating >= 1100) return { icon: Award, color: 'text-slate-400', bg: 'bg-slate-400/10' };
  return { icon: Trophy, color: 'text-zinc-500', bg: 'bg-zinc-500/10' };
}

function formatDelta(d: number) {
  if (d > 0) return <span className="text-green-400">+{d}</span>;
  if (d < 0) return <span className="text-red-400">{d}</span>;
  return <span className="text-slate-500">±0</span>;
}

function resultText(result: 0 | 0.5 | 1, whiteId: string, blackId: string) {
  if (result === 1) return <span className="text-green-400">{getBotDisplayName(whiteId)} wins</span>;
  if (result === 0) return <span className="text-green-400">{getBotDisplayName(blackId)} wins</span>;
  return <span className="text-yellow-400">Draw</span>;
}

// ── Leaderboard ───────────────────────────────────────────

function Leaderboard({ bots, getElo }: { bots: BotIdentity[]; getElo: (id: string) => EloRecord }) {
  const sorted = useMemo(() => {
    return [...bots].sort((a, b) => getElo(b.id).rating - getElo(a.id).rating);
  }, [bots, getElo]);

  return (
    <div className="space-y-1">
      {sorted.map((bot, i) => {
        const elo = getElo(bot.id);
        const badge = eloBadge(elo.rating);
        const Icon = badge.icon;
        return (
          <div key={bot.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition">
            <span className="w-6 text-center text-sm font-bold text-slate-500">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
            </span>
            <div className={`p-1.5 rounded ${badge.bg}`}>
              <Icon className={`w-4 h-4 ${badge.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{bot.name}</span>
                {!bot.isPreset && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">Custom</span>}
              </div>
              <div className="text-xs text-slate-500">
                {elo.gamesPlayed > 0
                  ? `${elo.wins}W ${elo.draws}D ${elo.losses}L · ${elo.gamesPlayed} games`
                  : 'No games yet'}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg tabular-nums">{elo.rating}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Lobby View ────────────────────────────────────────────

function LobbyView({ bots, getElo, onQuickMatch, onTournament, onHistory, onReset }: {
  bots: BotIdentity[];
  getElo: (id: string) => EloRecord;
  onQuickMatch: () => void;
  onTournament: () => void;
  onHistory: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onQuickMatch}
          className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 hover:border-blue-400/50 transition group focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Swords className="w-8 h-8 text-blue-400 group-hover:scale-110 transition" />
          <div className="text-left">
            <div className="font-bold">Quick Match</div>
            <div className="text-xs text-slate-400">Pit two bots against each other</div>
          </div>
        </button>
        <button
          onClick={onTournament}
          className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-800/20 border border-amber-500/30 hover:border-amber-400/50 transition group focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Trophy className="w-8 h-8 text-amber-400 group-hover:scale-110 transition" />
          <div className="text-left">
            <div className="font-bold">Tournament</div>
            <div className="text-xs text-slate-400">Round-robin with all bots</div>
          </div>
        </button>
        <button
          onClick={onHistory}
          className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-slate-600/20 to-slate-800/20 border border-slate-500/30 hover:border-slate-400/50 transition group focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Award className="w-8 h-8 text-slate-400 group-hover:scale-110 transition" />
          <div className="text-left">
            <div className="font-bold">Match History</div>
            <div className="text-xs text-slate-400">Past results &amp; stats</div>
          </div>
        </button>
      </div>

      {/* Leaderboard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Leaderboard
          </h2>
          <button onClick={onReset} aria-label="Reset ratings" className="text-xs text-slate-500 hover:text-red-400 transition flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
            <RotateCcw className="w-3 h-3" /> Reset Ratings
          </button>
        </div>
        <Leaderboard bots={bots} getElo={getElo} />
      </div>
    </div>
  );
}

// ── Quick Match Setup & Viewer ────────────────────────────

function QuickMatchView({ arena }: { arena: ReturnType<typeof useBotArena> }) {
  const { bots, quickMatch, startQuickMatch, stopMatch, getElo, setView } = arena;
  const [whiteId, setWhiteId] = useState(bots[0]?.id ?? '');
  const [blackId, setBlackId] = useState(bots[1]?.id ?? '');
  const [liveMode, setLiveMode] = useState(true);
  const [delayMs, setDelayMs] = useState(300);

  const { isRunning, outcome, eloUpdate, progress } = quickMatch;

  return (
    <div className="space-y-6">
      <button onClick={() => setView('lobby')} className="flex items-center gap-1 text-slate-400 hover:text-white transition text-sm focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
        <ChevronLeft className="w-4 h-4" /> Back to Lobby
      </button>

      <h2 className="text-xl font-bold flex items-center gap-2">
        <Swords className="w-6 h-6 text-blue-400" /> Quick Match
      </h2>

      {/* Setup */}
      {!isRunning && !outcome && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quick-match-white" className="block text-sm text-slate-400 mb-1">White</label>
              <select
                id="quick-match-white"
                value={whiteId}
                onChange={e => setWhiteId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
              >
                {bots.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({getElo(b.id).rating})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="quick-match-black" className="block text-sm text-slate-400 mb-1">Black</label>
              <select
                id="quick-match-black"
                value={blackId}
                onChange={e => setBlackId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
              >
                {bots.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({getElo(b.id).rating})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={liveMode}
                onChange={e => setLiveMode(e.target.checked)}
                className="accent-blue-500"
              />
              <Eye className="w-4 h-4 text-slate-400" />
              <span className="text-sm">Watch live</span>
            </label>
            {liveMode && (
              <label className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">Speed:</span>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={50}
                  value={delayMs}
                  onChange={e => setDelayMs(Number(e.target.value))}
                  className="w-24 accent-blue-500"
                />
                <span className="text-slate-500 w-14 text-right">{delayMs}ms</span>
              </label>
            )}
          </div>

          <button
            onClick={() => startQuickMatch(whiteId, blackId, liveMode, delayMs)}
            disabled={whiteId === blackId}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Play className="w-5 h-5" /> Start Match
          </button>
          {whiteId === blackId && <p className="text-xs text-red-400">Select two different bots</p>}
        </div>
      )}

      {/* Running */}
      {isRunning && progress && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{getBotDisplayName(progress.whiteId)} <span className="text-slate-500">vs</span> {getBotDisplayName(progress.blackId)}</span>
            <span className="text-slate-400">Move {progress.moveNumber}</span>
          </div>
          {progress.lastMove && (
            <div className="text-center text-2xl font-mono text-blue-300">{progress.lastMove}</div>
          )}
          <div className="flex justify-center">
            <button onClick={stopMatch} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition focus-visible:ring-2 focus-visible:ring-blue-500">
              <Square className="w-4 h-4" /> Stop
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {outcome && eloUpdate && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold mb-1">
              {resultText(outcome.result, quickMatch.whiteId, quickMatch.blackId)}
            </div>
            <div className="text-sm text-slate-400">{outcome.reason} · {outcome.moveCount} moves</div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-sm text-slate-400">White: {getBotDisplayName(quickMatch.whiteId)}</div>
              <div className="text-lg font-bold">{eloUpdate.whiteNew} {formatDelta(eloUpdate.whiteDelta)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Black: {getBotDisplayName(quickMatch.blackId)}</div>
              <div className="text-lg font-bold">{eloUpdate.blackNew} {formatDelta(eloUpdate.blackDelta)}</div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => startQuickMatch(quickMatch.whiteId, quickMatch.blackId, quickMatch.liveMode, quickMatch.delayMs)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <RotateCcw className="w-4 h-4" /> Rematch
            </button>
            <button
              onClick={() => {
                arena.setQuickMatch(prev => ({ ...prev, outcome: null, eloUpdate: null, progress: null }));
              }}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              New Match
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tournament View ───────────────────────────────────────

function TournamentSetup({ arena }: { arena: ReturnType<typeof useBotArena> }) {
  const { bots, getElo, setView } = arena;
  const [selected, setSelected] = useState<Set<string>>(new Set(bots.map(b => b.id)));
  const [fastMode, setFastMode] = useState(true);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedCount = selected.size;
  const matchCount = selectedCount * (selectedCount - 1); // round-robin, each pair twice

  return (
    <div className="space-y-6">
      <button onClick={() => setView('lobby')} className="flex items-center gap-1 text-slate-400 hover:text-white transition text-sm focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
        <ChevronLeft className="w-4 h-4" /> Back to Lobby
      </button>

      <h2 className="text-xl font-bold flex items-center gap-2">
        <Trophy className="w-6 h-6 text-amber-400" /> Start Tournament
      </h2>

      <p className="text-sm text-slate-400">Select bots to compete. Each pair plays twice (once as white, once as black).</p>

      <div className="space-y-1">
        {bots.map(bot => (
          <label
            key={bot.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition ${
              selected.has(bot.id) ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-zinc-800/50 border border-transparent hover:bg-zinc-800'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(bot.id)}
              onChange={() => toggle(bot.id)}
              className="accent-amber-500"
            />
            <span className="flex-1 font-medium">{bot.name}</span>
            <span className="text-sm text-slate-400">{getElo(bot.id).rating}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={fastMode}
            onChange={e => setFastMode(e.target.checked)}
            className="accent-amber-500"
          />
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm">Fast simulation (no UI delay)</span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => arena.startTournament([...selected], fastMode)}
          disabled={selectedCount < 2}
          className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Play className="w-5 h-5" /> Start ({matchCount} matches)
        </button>
      </div>
    </div>
  );
}

function TournamentProgress({ arena }: { arena: ReturnType<typeof useBotArena> }) {
  const { tournament, tournamentRunning, stopTournament, getElo, setView, currentTournamentMatch } = arena;
  if (!tournament) return null;

  const progress = tournament.totalMatches > 0 ? Math.round((tournament.completedCount / tournament.totalMatches) * 100) : 0;
  const standingsSorted = [...tournament.standings.entries()].sort((a, b) => b[1].points - a[1].points);

  return (
    <div className="space-y-6">
      <button onClick={() => { stopTournament(); setView('lobby'); }} className="flex items-center gap-1 text-slate-400 hover:text-white transition text-sm focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
        <ChevronLeft className="w-4 h-4" /> Back to Lobby
      </button>

      <h2 className="text-xl font-bold flex items-center gap-2">
        <Trophy className="w-6 h-6 text-amber-400" />
        {tournament.isComplete ? 'Tournament Complete' : 'Tournament in Progress'}
      </h2>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">{tournament.completedCount}/{tournament.totalMatches} matches</span>
          <span className="font-bold">{progress}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Match */}
      {tournamentRunning && currentTournamentMatch && (
        <div className="bg-zinc-800/50 rounded-lg px-4 py-3 text-sm">
          <span className="text-slate-400">Now playing: </span>
          <span className="font-medium">{getBotDisplayName(currentTournamentMatch.whiteId)}</span>
          <span className="text-slate-500"> vs </span>
          <span className="font-medium">{getBotDisplayName(currentTournamentMatch.blackId)}</span>
          <span className="text-slate-500"> · Move {currentTournamentMatch.moveNumber}</span>
        </div>
      )}

      {/* Standings Table */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Standings</h3>
        <div className="space-y-1">
          {standingsSorted.map(([botId, s], i) => (
            <div key={botId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/50">
              <span className="w-6 text-center text-sm font-bold text-slate-500">
                {i === 0 && tournament.isComplete ? '🏆' : `${i + 1}`}
              </span>
              <span className="flex-1 font-medium">{getBotDisplayName(botId)}</span>
              <span className="text-xs text-slate-400">{s.wins}W {s.draws}D {s.losses}L</span>
              <span className="font-bold text-amber-400 w-12 text-right">{s.points}pt</span>
              <span className="text-sm text-slate-500 w-16 text-right">Elo: {getElo(botId).rating}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Results */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Match Results</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {tournament.matches.filter(m => m.result !== undefined).map((m, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded text-sm bg-zinc-800/30">
              <span className="flex-1 truncate">
                {getBotDisplayName(m.whiteId)} <span className="text-slate-500">vs</span> {getBotDisplayName(m.blackId)}
              </span>
              <span className="text-xs">
                {m.result === 1 ? '1-0' : m.result === 0 ? '0-1' : '½-½'}
              </span>
              {m.eloUpdate && (
                <span className="text-xs w-20 text-right">
                  {formatDelta(m.eloUpdate.whiteDelta)} / {formatDelta(m.eloUpdate.blackDelta)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {tournamentRunning && (
        <button onClick={stopTournament} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition focus-visible:ring-2 focus-visible:ring-blue-500">
          <Square className="w-4 h-4" /> Stop Tournament
        </button>
      )}
    </div>
  );
}

// ── History View ──────────────────────────────────────────

function HistoryView({ arena }: { arena: ReturnType<typeof useBotArena> }) {
  const { matchHistory, setView } = arena;

  return (
    <div className="space-y-6">
      <button onClick={() => setView('lobby')} className="flex items-center gap-1 text-slate-400 hover:text-white transition text-sm focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
        <ChevronLeft className="w-4 h-4" /> Back to Lobby
      </button>

      <h2 className="text-xl font-bold flex items-center gap-2">
        <Award className="w-6 h-6 text-slate-400" /> Match History
      </h2>

      {matchHistory.length === 0 ? (
        <p className="text-slate-500 text-center py-12">No matches played yet. Start a Quick Match or Tournament!</p>
      ) : (
        <div className="space-y-1">
          {matchHistory.map(m => (
            <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 truncate">
                  <span className="font-medium">{getBotDisplayName(m.whiteId)}</span>
                  <span className="text-slate-500">vs</span>
                  <span className="font-medium">{getBotDisplayName(m.blackId)}</span>
                </div>
                <div className="text-xs text-slate-500">{m.resultReason} · {m.moves} moves · {new Date(m.timestamp).toLocaleDateString()}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold">
                  {m.result === 1 ? '1-0' : m.result === 0 ? '0-1' : '½-½'}
                </div>
                <div className="text-xs">
                  {formatDelta(m.eloUpdate.whiteDelta)} / {formatDelta(m.eloUpdate.blackDelta)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────

export default function BotArenaPage() {
  const arena = useBotArena();
  const { view, setView, bots, getElo, resetAllData, tournament, tournamentRunning } = arena;

  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const handleReset = () => {
    if (confirmReset) {
      resetAllData();
      setConfirmReset(false);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    } else {
      setConfirmReset(true);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trophy className="w-8 h-8 text-amber-400" />
          Bot Arena
        </h1>
        <p className="text-slate-400 mt-1">Pit your AI personalities against each other and track Elo ratings</p>
      </div>

      {view === 'lobby' && (
        <LobbyView
          bots={bots}
          getElo={getElo}
          onQuickMatch={() => setView('quickMatch')}
          onTournament={() => setView('tournament')}
          onHistory={() => setView('history')}
          onReset={handleReset}
        />
      )}

      {view === 'quickMatch' && <QuickMatchView arena={arena} />}

      {view === 'tournament' && !tournamentRunning && !tournament?.isComplete && (
        <TournamentSetup arena={arena} />
      )}

      {view === 'tournament' && (tournamentRunning || tournament?.isComplete) && (
        <TournamentProgress arena={arena} />
      )}

      {view === 'history' && <HistoryView arena={arena} />}

      {confirmReset && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50">
          Click "Reset Ratings" again to confirm
        </div>
      )}
    </div>
  );
}
