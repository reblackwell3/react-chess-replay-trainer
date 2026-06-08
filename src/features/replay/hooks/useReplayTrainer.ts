import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fenAtPly,
  findPlyIndexForFen,
  sideToMove as getSideToMove,
  uciFromDrop,
} from '../replayUtils';
import type {
  ReplayFeedback,
  ReplayGame,
  ReplayMiss,
  ReplayMode,
  ReplaySide,
  TrainColor,
} from '../types';

/** Pause (ms) before the opponent's reply is auto-played in single-color drills. */
const OPPONENT_MOVE_DELAY_MS = 350;

export interface UseReplayTrainerOptions {
  gameId: string;
  /** Position to open at (browse mode starts here). Defaults to the start. */
  startFen?: string;
  fetchGame: (gameId: string) => Promise<ReplayGame | null>;
  onMiss?: (miss: ReplayMiss) => void;
  onComplete?: () => void;
}

export interface ReplayTrainerState {
  game: ReplayGame | null;
  loading: boolean;
  error: string | null;
  mode: ReplayMode;
  /** Current FEN shown on the board. */
  fen: string;
  /** 0-based ply index = number of moves played from the start. */
  plyIndex: number;
  /** Total half-moves (plies) in the loaded game. */
  totalPly: number;
  complete: boolean;
  sideToMove: ReplaySide;
  /** Which side(s) the user is drilling. */
  trainColor: TrainColor;
  /** True when the side to move is the user's (i.e. they should guess now). */
  isUserTurn: boolean;
  feedback: ReplayFeedback;
  /** Revealed/expected move at the current ply (set after a miss or reveal). */
  expectedSan: string | null;
  expectedUci: string | null;
  canPrev: boolean;
  canNext: boolean;
  goFirst: () => void;
  goPrev: () => void;
  goNext: () => void;
  goLast: () => void;
  goTo: (ply: number) => void;
  startTraining: (color?: TrainColor) => void;
  stopTraining: () => void;
  revealMove: () => void;
  handleDrop: (source: string, target: string, piece: string) => boolean;
}

export function useReplayTrainer({
  gameId,
  startFen,
  fetchGame,
  onMiss,
  onComplete,
}: UseReplayTrainerOptions): ReplayTrainerState {
  const [game, setGame] = useState<ReplayGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ReplayMode>('browse');
  const [trainColor, setTrainColor] = useState<TrainColor>('both');
  const [plyIndex, setPlyIndex] = useState(0);
  const [feedback, setFeedback] = useState<ReplayFeedback>(null);
  const [expectedSan, setExpectedSan] = useState<string | null>(null);
  const [expectedUci, setExpectedUci] = useState<string | null>(null);

  const fetchGameRef = useRef(fetchGame);
  fetchGameRef.current = fetchGame;
  const onMissRef = useRef(onMiss);
  onMissRef.current = onMiss;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const recordedRef = useRef<Set<number>>(new Set());
  const completedFiredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setGame(null);
    recordedRef.current = new Set();
    completedFiredRef.current = false;
    setMode('browse');
    setTrainColor('both');
    setFeedback(null);
    setExpectedSan(null);
    setExpectedUci(null);

    fetchGameRef
      .current(gameId)
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded) {
          setError('Game not found.');
          return;
        }
        setGame(loaded);
        setPlyIndex(
          startFen ? findPlyIndexForFen(loaded.movesUci, startFen) : 0,
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load game.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gameId, startFen]);

  const movesUci = useMemo(() => game?.movesUci ?? [], [game]);
  const totalPly = movesUci.length;
  const fen = useMemo(() => fenAtPly(movesUci, plyIndex), [movesUci, plyIndex]);
  const complete = plyIndex >= totalPly && totalPly > 0;
  const sideToMove = getSideToMove(fen);
  const isUserTurn =
    trainColor === 'both' ||
    (trainColor === 'white' && sideToMove === 'w') ||
    (trainColor === 'black' && sideToMove === 'b');

  const clearTransient = useCallback(() => {
    setFeedback(null);
    setExpectedSan(null);
    setExpectedUci(null);
  }, []);

  const goTo = useCallback(
    (ply: number) => {
      const clamped = Math.max(0, Math.min(ply, totalPly));
      completedFiredRef.current = clamped >= totalPly ? completedFiredRef.current : false;
      setPlyIndex(clamped);
      clearTransient();
    },
    [totalPly, clearTransient],
  );

  const goFirst = useCallback(() => goTo(0), [goTo]);
  const goPrev = useCallback(() => goTo(plyIndex - 1), [goTo, plyIndex]);
  const goNext = useCallback(() => goTo(plyIndex + 1), [goTo, plyIndex]);
  const goLast = useCallback(() => goTo(totalPly), [goTo, totalPly]);

  const startTraining = useCallback(
    (color: TrainColor = 'both') => {
      setTrainColor(color);
      setMode('train');
      clearTransient();
    },
    [clearTransient],
  );

  const stopTraining = useCallback(() => {
    setMode('browse');
    clearTransient();
  }, [clearTransient]);

  const recordMiss = useCallback(
    (index: number) => {
      if (recordedRef.current.has(index)) return;
      recordedRef.current.add(index);
      const expectedUci = movesUci[index];
      if (!expectedUci) return;
      const positionFen = fenAtPly(movesUci, index);
      const miss: ReplayMiss = {
        index,
        fen: positionFen,
        expectedUci,
        expectedSan: game?.movesSan?.[index] ?? expectedUci,
        sideToMove: getSideToMove(positionFen),
        setupUci: index > 0 ? movesUci[index - 1] : undefined,
        setupFen: index > 0 ? fenAtPly(movesUci, index - 1) : undefined,
      };
      onMissRef.current?.(miss);
    },
    [movesUci, game],
  );

  const revealMove = useCallback(() => {
    if (complete || !isUserTurn) return;
    const uci = movesUci[plyIndex];
    if (!uci) return;
    setExpectedUci(uci);
    setExpectedSan(game?.movesSan?.[plyIndex] ?? uci);
    setFeedback('incorrect');
    recordMiss(plyIndex);
  }, [complete, game, movesUci, plyIndex, recordMiss, isUserTurn]);

  const handleDrop = useCallback(
    (source: string, target: string, piece: string): boolean => {
      if (mode !== 'train' || complete || !isUserTurn) return false;
      const expectedUci = movesUci[plyIndex];
      if (!expectedUci) return false;
      const uci = uciFromDrop(fen, source, target, piece);
      if (!uci) return false;

      if (uci.toLowerCase() === expectedUci.toLowerCase()) {
        setFeedback('correct');
        setExpectedSan(null);
        setExpectedUci(null);
        setPlyIndex((p) => p + 1);
        return true;
      }

      setFeedback('incorrect');
      setExpectedSan(game?.movesSan?.[plyIndex] ?? expectedUci);
      setExpectedUci(expectedUci);
      recordMiss(plyIndex);
      return false;
    },
    [mode, complete, isUserTurn, movesUci, plyIndex, fen, game, recordMiss],
  );

  useEffect(() => {
    if (mode === 'train' && complete && !completedFiredRef.current) {
      completedFiredRef.current = true;
      onCompleteRef.current?.();
    }
  }, [mode, complete]);

  // In single-color drills, auto-play the opponent's reply once it's their turn
  // (e.g. after the user guesses correctly, or when training starts mid-game).
  useEffect(() => {
    if (mode !== 'train' || complete || trainColor === 'both' || isUserTurn) {
      return;
    }
    const id = setTimeout(() => {
      setPlyIndex((p) => (p < totalPly ? p + 1 : p));
      clearTransient();
    }, OPPONENT_MOVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [mode, complete, trainColor, isUserTurn, plyIndex, totalPly, clearTransient]);

  return {
    game,
    loading,
    error,
    mode,
    fen,
    plyIndex,
    totalPly,
    complete,
    sideToMove,
    trainColor,
    isUserTurn,
    feedback,
    expectedSan,
    expectedUci,
    canPrev: plyIndex > 0,
    canNext: plyIndex < totalPly,
    goFirst,
    goPrev,
    goNext,
    goLast,
    goTo,
    startTraining,
    stopTraining,
    revealMove,
    handleDrop,
  };
}
