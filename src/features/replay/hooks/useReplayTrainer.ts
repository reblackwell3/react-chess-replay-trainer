import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createExpectedMoveDropHandler,
  fenAfterUci,
  lastMoveUciAtPly,
  useCorrectMoveFeedback,
} from 'react-chess-core';
import { REPLAY_AUTOPLAY_STEP_MS } from '../constants';
import {
  fenAtPly,
  findPlyIndexForFen,
  isTrainSideToMove,
  sideToMove as getSideToMove,
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
  /** Destination square of the last correct guess (green check overlay). */
  correctMoveSquare: string | null;
  /** FEN shown on the board (includes a pending correct-move ply). */
  displayFen: string;
  /** UCI of the move that produced the current board position. */
  lastMoveUci: string | null;
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
  /** True while browse mode is auto-advancing through the game. */
  autoplayActive: boolean;
  /** Start autoplay from the current ply (exits train mode). No-op at game end. */
  startAutoplay: () => void;
  stopAutoplay: () => void;
  /** Toggle browse autoplay; exits train mode when starting. */
  toggleAutoplay: () => void;
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
  const [autoplayActive, setAutoplayActive] = useState(false);
  const [expectedUci, setExpectedUci] = useState<string | null>(null);
  const [feedbackFen, setFeedbackFen] = useState<string | null>(null);
  const {
    correctMoveSquare,
    showCorrectMove,
    clearCorrectMoveFeedback,
    isShowingCorrectMove,
  } = useCorrectMoveFeedback();

  const fetchGameRef = useRef(fetchGame);
  fetchGameRef.current = fetchGame;
  const onMissRef = useRef(onMiss);
  onMissRef.current = onMiss;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const recordedRef = useRef<Set<number>>(new Set());
  const completedFiredRef = useRef(false);
  const modeRef = useRef<ReplayMode>('browse');
  const trainColorRef = useRef<TrainColor>('both');
  const showingCorrectMoveRef = useRef(false);
  showingCorrectMoveRef.current = isShowingCorrectMove;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setGame(null);
    recordedRef.current = new Set();
    completedFiredRef.current = false;
    setMode('browse');
    modeRef.current = 'browse';
    setTrainColor('both');
    trainColorRef.current = 'both';
    setFeedback(null);
    setExpectedSan(null);
    setExpectedUci(null);
    setAutoplayActive(false);

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
  const displayFen = feedbackFen ?? fen;
  const lastMoveUci = useMemo(() => {
    if (feedbackFen) {
      return movesUci[plyIndex] ?? null;
    }
    return lastMoveUciAtPly(movesUci, plyIndex);
  }, [feedbackFen, movesUci, plyIndex]);
  const complete = plyIndex >= totalPly && totalPly > 0;
  const sideToMove = getSideToMove(fen);
  const isUserTurn = isTrainSideToMove(trainColor, sideToMove);

  modeRef.current = mode;
  trainColorRef.current = trainColor;

  const clearTransient = useCallback(() => {
    setFeedback(null);
    setExpectedSan(null);
    setExpectedUci(null);
    setFeedbackFen(null);
    clearCorrectMoveFeedback();
  }, [clearCorrectMoveFeedback]);

  const stopAutoplay = useCallback(() => {
    setAutoplayActive(false);
  }, []);

  const goTo = useCallback(
    (ply: number) => {
      setAutoplayActive(false);
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

  const startAutoplay = useCallback(() => {
    if (plyIndex >= totalPly) {
      return;
    }
    setMode('browse');
    clearTransient();
    setAutoplayActive(true);
  }, [plyIndex, totalPly, clearTransient]);

  const toggleAutoplay = useCallback(() => {
    if (autoplayActive) {
      stopAutoplay();
      return;
    }
    startAutoplay();
  }, [autoplayActive, startAutoplay, stopAutoplay]);

  const startTraining = useCallback(
    (color: TrainColor = 'both') => {
      setAutoplayActive(false);
      setTrainColor(color);
      trainColorRef.current = color;
      modeRef.current = 'train';
      setMode('train');
      clearTransient();
    },
    [clearTransient],
  );

  const stopTraining = useCallback(() => {
    modeRef.current = 'browse';
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
    (source: string, target: string, piece: string): boolean =>
      createExpectedMoveDropHandler({
        fen,
        expectedUci: movesUci[plyIndex],
        enabled:
          modeRef.current === 'train' &&
          !complete &&
          !showingCorrectMoveRef.current &&
          isTrainSideToMove(trainColorRef.current, sideToMove),
        onCorrect: (uci) => {
          setFeedback('correct');
          setExpectedSan(null);
          setExpectedUci(null);
          const nextFen = fenAfterUci(fen, uci);
          if (nextFen) {
            setFeedbackFen(nextFen);
          }
          showCorrectMove(uci.slice(2, 4), () => {
            setFeedbackFen(null);
            setFeedback(null);
            setPlyIndex((p) => p + 1);
          });
        },
        onIncorrect: () => {
          const expectedUci = movesUci[plyIndex];
          if (!expectedUci) {
            return;
          }
          setFeedback('incorrect');
          setExpectedSan(game?.movesSan?.[plyIndex] ?? expectedUci);
          setExpectedUci(expectedUci);
          recordMiss(plyIndex);
        },
      })(source, target, piece),
    [complete, fen, movesUci, plyIndex, game, recordMiss, sideToMove, showCorrectMove],
  );

  useEffect(() => {
    if (mode === 'train' && complete && !completedFiredRef.current) {
      completedFiredRef.current = true;
      onCompleteRef.current?.();
    }
  }, [mode, complete]);

  // Browse autoplay: advance one ply at a fixed interval until the game ends.
  useEffect(() => {
    if (!autoplayActive || mode === 'train') {
      return;
    }
    if (plyIndex >= totalPly) {
      setAutoplayActive(false);
      return;
    }
    const id = setTimeout(() => {
      setPlyIndex((p) => (p < totalPly ? p + 1 : p));
      clearTransient();
    }, REPLAY_AUTOPLAY_STEP_MS);
    return () => clearTimeout(id);
  }, [autoplayActive, mode, plyIndex, totalPly, clearTransient]);

  // In single-color drills, auto-play the opponent's reply once it's their turn
  // (e.g. after the user guesses correctly, or when training starts mid-game).
  useEffect(() => {
    if (mode !== 'train' || complete || trainColor === 'both' || isUserTurn) {
      return;
    }
    if (isShowingCorrectMove) {
      return;
    }
    const id = setTimeout(() => {
      setPlyIndex((p) => (p < totalPly ? p + 1 : p));
      clearTransient();
    }, OPPONENT_MOVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [mode, complete, trainColor, isUserTurn, plyIndex, totalPly, clearTransient, isShowingCorrectMove]);

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
    correctMoveSquare,
    displayFen,
    lastMoveUci,
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
    autoplayActive,
    startAutoplay,
    stopAutoplay,
    toggleAutoplay,
  };
}
