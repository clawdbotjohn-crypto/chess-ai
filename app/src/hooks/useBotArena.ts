/**
 * useBotArena — Arena state management hook
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { BotIdentity, TournamentState, MatchProgress, MatchOutcome } from '../utils/botArena';
import { getAllBots, runMatchAsync, createTournament, updateTournamentStandings } from '../utils/botArena';
import type { EloRecord, EloUpdate } from '../utils/eloRating';
import { loadEloRatings, updateEloAfterMatch, saveMatchRecord, loadMatchHistory, clearAllEloData } from '../utils/eloRating';
import type { MatchRecord } from '../utils/eloRating';

export type ArenaView = 'lobby' | 'quickMatch' | 'tournament' | 'history';

export interface QuickMatchState {
  whiteId: string;
  blackId: string;
  isRunning: boolean;
  progress: MatchProgress | null;
  outcome: MatchOutcome | null;
  eloUpdate: EloUpdate | null;
  liveMode: boolean;
  delayMs: number;
}

export function useBotArena() {
  const [view, setView] = useState<ArenaView>('lobby');
  const [bots, setBots] = useState<BotIdentity[]>([]);
  const [eloRatings, setEloRatings] = useState<Record<string, EloRecord>>({});
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  
  // Quick match state
  const [quickMatch, setQuickMatch] = useState<QuickMatchState>({
    whiteId: '',
    blackId: '',
    isRunning: false,
    progress: null,
    outcome: null,
    eloUpdate: null,
    liveMode: true,
    delayMs: 300,
  });

  // Tournament state
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [tournamentRunning, setTournamentRunning] = useState(false);
  const [tournamentFastMode, setTournamentFastMode] = useState(false);
  const [currentTournamentMatch, setCurrentTournamentMatch] = useState<MatchProgress | null>(null);

  const stopRef = useRef(false);

  // Load data
  const refreshData = useCallback(() => {
    setBots(getAllBots());
    setEloRatings(loadEloRatings());
    setMatchHistory(loadMatchHistory());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const getElo = useCallback((botId: string): EloRecord => {
    return eloRatings[botId] ?? { rating: 1200, wins: 0, losses: 0, draws: 0, gamesPlayed: 0, ratingHistory: [] };
  }, [eloRatings]);

  // ── Quick Match ─────────────────────────────────────────

  const startQuickMatch = useCallback(async (whiteId: string, blackId: string, liveMode: boolean, delayMs: number) => {
    const whitBot = bots.find(b => b.id === whiteId);
    const blkBot = bots.find(b => b.id === blackId);
    if (!whitBot || !blkBot) return;

    stopRef.current = false;
    setQuickMatch({
      whiteId,
      blackId,
      isRunning: true,
      progress: null,
      outcome: null,
      eloUpdate: null,
      liveMode,
      delayMs,
    });
    setView('quickMatch');

    const outcome = await runMatchAsync(
      whitBot.config,
      blkBot.config,
      whiteId,
      blackId,
      liveMode ? delayMs : 0,
      (p) => {
        setQuickMatch(prev => ({ ...prev, progress: p }));
      },
      () => stopRef.current,
    );

    if (stopRef.current) {
      setQuickMatch(prev => ({ ...prev, isRunning: false }));
      return;
    }

    // Update Elo
    const eloUpdate = updateEloAfterMatch(whiteId, blackId, outcome.result);
    saveMatchRecord({
      id: `m-${Date.now()}`,
      whiteId,
      blackId,
      result: outcome.result,
      resultReason: outcome.reason,
      moves: outcome.moveCount,
      eloUpdate,
      timestamp: Date.now(),
    });

    setQuickMatch(prev => ({
      ...prev,
      isRunning: false,
      outcome,
      eloUpdate,
    }));
    refreshData();
  }, [bots, refreshData]);

  const stopMatch = useCallback(() => {
    stopRef.current = true;
  }, []);

  // ── Tournament ──────────────────────────────────────────

  const startTournament = useCallback(async (botIds: string[], fastMode: boolean) => {
    if (botIds.length < 2) return;

    stopRef.current = false;
    const t = createTournament(botIds);
    setTournament(t);
    setTournamentRunning(true);
    setTournamentFastMode(fastMode);
    setView('tournament');

    let current = t;

    for (let i = 0; i < current.matches.length; i++) {
      if (stopRef.current) break;

      const match = current.matches[i];
      const whitBot = bots.find(b => b.id === match.whiteId);
      const blkBot = bots.find(b => b.id === match.blackId);
      if (!whitBot || !blkBot) continue;

      const outcome = await runMatchAsync(
        whitBot.config,
        blkBot.config,
        match.whiteId,
        match.blackId,
        fastMode ? 0 : 100,
        (p) => {
          if (!fastMode) {
            setCurrentTournamentMatch(p);
          }
        },
        () => stopRef.current,
      );

      if (stopRef.current) break;

      current = updateTournamentStandings(current, i, outcome.result, outcome.reason, outcome.moveCount);
      setTournament({ ...current });
      setCurrentTournamentMatch(null);
    }

    setTournamentRunning(false);
    refreshData();
  }, [bots, refreshData]);

  const stopTournament = useCallback(() => {
    stopRef.current = true;
  }, []);

  // ── Reset ───────────────────────────────────────────────

  const resetAllData = useCallback(() => {
    clearAllEloData();
    refreshData();
  }, [refreshData]);

  return {
    view,
    setView,
    bots,
    eloRatings,
    getElo,
    matchHistory,
    refreshData,

    // Quick match
    quickMatch,
    setQuickMatch,
    startQuickMatch,
    stopMatch,

    // Tournament
    tournament,
    tournamentRunning,
    tournamentFastMode,
    currentTournamentMatch,
    startTournament,
    stopTournament,

    // Admin
    resetAllData,
  };
}
