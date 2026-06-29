import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  IconButton,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import LastPageIcon from '@mui/icons-material/LastPage';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
  ThemeProvider,
  HighlightChessboard,
  BoardCompleteCheckOverlay,
  BoardGameCompleteOverlay,
  BoardYourMoveAgainOverlay,
  usePositionKeyboardNav,
  useGameEndCompleteOverlay,
  AnalysisEngineProvider,
  DEFAULT_ANSWER_ARROW_COLOR,
  isAnalyzableFen,
  PlayTimeEngineProvider,
  getMissAnimationDuration,
  isMissInputLocked,
  resolveIncorrectMoveSquare,
  type BoardThemeId,
  type ChessboardArrow,
  type AnalysisContext,
  refutationEngineOptions,
  useMissSequence,
} from 'react-chess-core';
import { AnalysisErrorBoundary } from 'react-chess-core';
import { DEFAULT_BOARD_WIDTH } from './constants';
import { buildReplayAnalysisContext } from './buildReplayAnalysisContext';
import { useReplayTrainer } from './hooks/useReplayTrainer';
import { fenAtPly, sideToMove } from './replayUtils';
import type { ReplayGame, ReplayMiss, TrainColor } from './types';
import { uciFromDrop } from 'react-chess-core';
import {
  type MuiReplayTrainerPanelHostProps,
  type RecordReplayHalfMoveSeen,
  type ReplayEntryChoice,
  type SourceGameMeta,
} from './muiReplayTrainerHost';
import { TrainerPanelLayout } from './mui/TrainerPanelLayout';
import {
  REPLAY_CONTROLS_STACKED_RESERVE_PX,
  TRAINER_CONTROLS_BESIDE_RESERVE_PX,
} from './mui/boardLayoutConstants';
import { useTrainerFittedBoardWidth } from './mui/useFittedBoardWidth';
import {
  trainerAnalyzeBtnSx,
  trainerDrillControlsGridSx,
  trainerDrillOrStopBtnSx,
  trainerHintBtnSx,
  trainerShowMoveBtnSx,
  trainerTrainSideGroupSx,
} from './mui/trainerDrillControlsLayout';
import {
  replaySrsModeFromSeenBefore,
  type ReplaySrsMode,
} from './replaySrs';
import {
  BoardPositionEval,
  type AnalysisEngineOptions,
} from 'react-chess-core';
import {
  PuzzleAnalysisBoard,
  PuzzleEngineEvaluation,
  puzzleEngineOptions,
  analysisModalEngineOptions,
  usePlayTimeEngineOptions,
} from 'react-chess-puzzle-kit';
import {
  REPLAY_SEGMENT_CHECK_MS,
  REPLAY_SEGMENT_RECAP_INTERVAL,
  REPLAY_SEGMENT_RESUME_MS,
  useReplaySegmentRecap,
} from './useReplaySegmentRecap';

const defaultFormatTrainSideLabel = (side: 'w' | 'b'): string =>
  side === 'w' ? 'White' : 'Black';

const defaultMergeSourceMeta = (
  _game: ReplayGame | null,
  seed?: SourceGameMeta | null,
): SourceGameMeta | null => seed ?? null;

const defaultRecordHalfMoveSeen: RecordReplayHalfMoveSeen = async () => ({
  seenBefore: false,
});

const defaultEntrySplash = {
  open: false,
  step: 'choose' as const,
  dismissing: false,
  chooseAgainst: () => {},
  chooseThrough: async () => {},
  chooseColor: async (_color: TrainColor) => {},
  close: () => {},
};

const defaultTrainingHint = {
  open: false,
  dismissing: false,
  dismiss: async () => {},
  runBeforeTraining: (start: () => void) => start(),
};

const defaultAutoplayHint = {
  open: false,
  dismiss: () => {},
  maybeShow: () => {},
};

type PendingSegmentRecap = {
  startIndex: number;
  endIndex: number;
  missedIndices: number[];
};

export interface MuiReplayTrainerPanelProps extends MuiReplayTrainerPanelHostProps {
  gameId: string;
  fetchGame: (gameId: string) => Promise<ReplayGame | null>;
  /** Half move to open at (1-based, matching the status line). Defaults to 1. */
  startHalfMove?: number;
  /** Reported once per ply when the user plays the wrong move or reveals it. */
  onMiss?: (miss: ReplayMiss) => void;
  /** Reported once per ply when the user answers correctly during training. */
  onCorrect?: (hit: ReplayMiss, srsMode: ReplaySrsMode) => void;
  /** Called when a drill reaches the end of the game. */
  onComplete?: () => void;
  /** Called when the user leaves the trainer. */
  onExit?: () => void;
  /** Called when the visible half move changes (1-based, matching the status line). */
  onHalfMoveChange?: (halfMove: number) => void;
  /** Called once the game payload is available (e.g. to tag SRS enrollment). */
  onGameLoaded?: (game: ReplayGame) => void;
  /** Override half-move seen tracking (Storybook/tests). */
  markHalfMoveSeen?: RecordReplayHalfMoveSeen;
  /** Source-game metadata from the list view, shown before the payload loads. */
  sourceMeta?: SourceGameMeta | null;
  theme?: 'light' | 'dark';
  boardTheme?: BoardThemeId;
  boardWidth?: number;
  /** Side shown at the bottom of the board. Defaults to white. */
  orientation?: 'white' | 'black';
  /** Stockfish options for the built-in analysis board. */
  engine?: AnalysisEngineOptions;
  /** After a wrong move, show the correct-move arrow instead of retrying. */
  autoShowWrongMoves?: boolean;
}

const TRAIN_COLOR_LABEL: Record<TrainColor, string> = {
  white: 'Training White',
  black: 'Training Black',
  both: 'Training both sides',
};

/** Delay between half-moves during browse autoplay (ms). */
const REPLAY_AUTOPLAY_STEP_MS_DEFAULT = 500;

/**
 * MUI rendering of `react-chess-replay-trainer`. Drives the package's
 * `useReplayTrainer` hook and exposes every control it offers — first / prev /
 * next / last, the scrub slider, "Show move", and "Stop drilling" —
 * using MUI components so it matches the rest of the app.
 *
 * Train side (White / Black / Both) is chosen before drilling; for a single
 * color the opponent's recorded replies auto-play so the user only inputs their
 * own moves.
 */
const MuiReplayTrainerPanel = ({
  gameId,
  fetchGame,
  startHalfMove = 1,
  onMiss,
  onCorrect,
  onComplete,
  onExit,
  onHalfMoveChange,
  onGameLoaded,
  markHalfMoveSeen = defaultRecordHalfMoveSeen,
  sourceMeta,
  theme = 'dark',
  boardTheme,
  boardWidth: maxBoardWidth = DEFAULT_BOARD_WIDTH,
  orientation = 'white',
  engine,
  autoShowWrongMoves = true,
  renderSourceHeader,
  renderEntrySplash,
  renderTrainingHintSplash,
  renderAutoplayHintOverlay,
  renderAutoplaySettingsButton,
  onNotifyUser,
  autoplayStepMs = REPLAY_AUTOPLAY_STEP_MS_DEFAULT,
  formatTrainSideLabel = defaultFormatTrainSideLabel,
  mergeSourceMeta = defaultMergeSourceMeta,
  useEntrySplash,
  useTrainingHint,
  useAutoplayHint,
}: MuiReplayTrainerPanelProps) => {
  const autoplayHint = (useAutoplayHint ?? (() => defaultAutoplayHint))(true);
  const trainingHint = (useTrainingHint ?? (() => defaultTrainingHint))();
  const entryChoiceHandlerRef =
    useRef<(_choice: ReplayEntryChoice) => void>(() => {});
  const {
    boardAnchorRef,
    containerRef: boardMeasureRef,
    boardWidth,
    isControlsBeside,
  } = useTrainerFittedBoardWidth({
    designBoardWidth: maxBoardWidth,
    besideControlsReservePx: TRAINER_CONTROLS_BESIDE_RESERVE_PX,
    stackedControlsReservePx: REPLAY_CONTROLS_STACKED_RESERVE_PX,
  });
  const startPlyIndex = Math.max(0, startHalfMove - 1);
  const gradedCorrectRef = useRef(new Set<number>());
  const missedPlyRef = useRef(new Set<number>());
  const srsModeRequestsRef = useRef(new Map<number, Promise<ReplaySrsMode>>());
  /** Last start ply we applied via goTo (avoids fighting user scrubbing). */
  const appliedStartPlyRef = useRef<number | null>(null);
  /** False until the opening ?ply= jump (if any) has been applied. */
  const initialPlySyncedRef = useRef(false);
  /** Set when browse-mode drag begins so the same drop counts as a drill move. */
  const drillFromDragRef = useRef(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisSnapshot, setAnalysisSnapshot] =
    useState<AnalysisContext | null>(null);
  const [autoplayActive, setAutoplayActive] = useState(false);
  const [selectedTrainColor, setSelectedTrainColor] =
    useState<TrainColor>('white');
  /** Sync ref for drill start — avoids stale closure when color is picked then Drill line is clicked. */
  const selectedTrainColorRef = useRef<TrainColor>('white');
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [segmentCheckVisible, setSegmentCheckVisible] = useState(false);
  const [segmentResumeVisible, setSegmentResumeVisible] = useState(false);
  const [segmentRecapSpec, setSegmentRecapSpec] =
    useState<PendingSegmentRecap | null>(null);
  const [segmentRecapPlaying, setSegmentRecapPlaying] = useState(false);
  const lastRecapEndRef = useRef(0);
  const pendingSegmentRecapRef = useRef<PendingSegmentRecap | null>(null);

  useEffect(() => {
    gradedCorrectRef.current = new Set();
    missedPlyRef.current = new Set();
    srsModeRequestsRef.current = new Map();
    appliedStartPlyRef.current = null;
    initialPlySyncedRef.current = false;
    setAutoplayActive(false);
    selectedTrainColorRef.current = 'white';
    setSelectedTrainColor('white');
    setHintSquare(null);
    lastRecapEndRef.current = 0;
    pendingSegmentRecapRef.current = null;
    setSegmentCheckVisible(false);
    setSegmentResumeVisible(false);
    setSegmentRecapSpec(null);
    setSegmentRecapPlaying(false);
  }, [gameId]);

  const resolveSrsMode = useCallback(
    (moveIndex: number): Promise<ReplaySrsMode> => {
      const pending = srsModeRequestsRef.current.get(moveIndex);
      if (pending) {
        return pending;
      }

      const halfMove = moveIndex + 1;
      const request = markHalfMoveSeen(gameId, halfMove).then(({ seenBefore }) => {
        const mode = replaySrsModeFromSeenBefore(seenBefore);
        srsModeRequestsRef.current.delete(moveIndex);
        return mode;
      });
      srsModeRequestsRef.current.set(moveIndex, request);
      return request;
    },
    [gameId, markHalfMoveSeen],
  );

  const reportMiss = useCallback(
    (miss: ReplayMiss) => {
      missedPlyRef.current.add(miss.index);
      void resolveSrsMode(miss.index).then(() => {
        onMiss?.(miss);
      });
    },
    [onMiss, resolveSrsMode],
  );

  const segmentRecapPaused =
    segmentCheckVisible ||
    segmentResumeVisible ||
    segmentRecapPlaying ||
    segmentRecapSpec !== null;

  const state = useReplayTrainer({
    gameId,
    fetchGame,
    onMiss: reportMiss,
    onComplete,
    refutationOnIncorrect: autoShowWrongMoves,
    paused: segmentRecapPaused,
  });

  const entrySplash = (useEntrySplash ?? (() => defaultEntrySplash))({
    ready: !state.loading && state.game != null,
    gameId,
    onChoose: (choice) => entryChoiceHandlerRef.current(choice),
  });

  useEffect(() => {
    if (!state.game || state.plyIndex >= state.totalPly) {
      return;
    }
    void resolveSrsMode(state.plyIndex);
  }, [resolveSrsMode, state.game, state.plyIndex, state.totalPly]);

  useEffect(() => {
    if (!state.game || appliedStartPlyRef.current === startPlyIndex) {
      return;
    }
    // URL ?ply= updates during drilling come from onHalfMoveChange — do not exit train mode.
    if (state.mode === 'train') {
      appliedStartPlyRef.current = startPlyIndex;
      return;
    }
    appliedStartPlyRef.current = startPlyIndex;
    if (startPlyIndex > 0) {
      state.goTo(startPlyIndex);
    }
    initialPlySyncedRef.current = startPlyIndex <= 0;
  }, [state.game, startPlyIndex, state.goTo, state.mode]);

  useEffect(() => {
    if (!state.game || !onHalfMoveChange) {
      return;
    }
    if (!initialPlySyncedRef.current) {
      if (startPlyIndex > 0 && state.plyIndex !== startPlyIndex) {
        return;
      }
      initialPlySyncedRef.current = true;
    }
    onHalfMoveChange(state.plyIndex + 1);
  }, [state.game, state.plyIndex, startPlyIndex, onHalfMoveChange]);

  useEffect(() => {
    if (
      state.feedback !== 'correct' ||
      state.mode !== 'train' ||
      !state.game ||
      !onCorrect
    ) {
      return;
    }

    const index = state.plyIndex - 1;
    if (
      index < 0 ||
      gradedCorrectRef.current.has(index) ||
      missedPlyRef.current.has(index)
    ) {
      return;
    }

    const expectedUci = state.game.movesUci[index];
    if (!expectedUci) {
      return;
    }

    gradedCorrectRef.current.add(index);
    const movesUci = state.game.movesUci;
    const fen = fenAtPly(movesUci, index);
    void resolveSrsMode(index).then((mode) => {
      onCorrect?.(
        {
          index,
          fen,
          expectedUci,
          expectedSan: state.game!.movesSan?.[index] ?? expectedUci,
          sideToMove: sideToMove(fen),
          setupUci: index > 0 ? movesUci[index - 1] : undefined,
          setupFen: index > 0 ? fenAtPly(movesUci, index - 1) : undefined,
        },
        mode,
      );
    });
  }, [
    onCorrect,
    resolveSrsMode,
    state.feedback,
    state.game,
    state.mode,
    state.plyIndex,
  ]);

  const refutationEngine = useMemo(
    () => ({
      ...puzzleEngineOptions,
      ...refutationEngineOptions,
      ...engine,
    }),
    [engine],
  );

  const stockfishScriptUrl = engine?.scriptUrl ?? puzzleEngineOptions.scriptUrl;
  const playTimeEngine = usePlayTimeEngineOptions();

  const missSequence = useMissSequence(
    state.feedback,
    state.expectedUci,
    refutationEngine,
    DEFAULT_ANSWER_ARROW_COLOR,
    autoShowWrongMoves,
    playTimeEngine.depth,
  );

  const segmentRecap = useReplaySegmentRecap({
    movesUci: state.game?.movesUci ?? [],
    startIndex: segmentRecapSpec?.startIndex ?? 0,
    endIndex: segmentRecapSpec?.endIndex ?? 0,
    missedIndices: segmentRecapSpec?.missedIndices ?? [],
    active: segmentRecapPlaying,
    onComplete: () => {
      setSegmentRecapPlaying(false);
      setSegmentRecapSpec(null);
      if (!state.complete) {
        setSegmentResumeVisible(true);
      }
    },
  });

  const isSegmentRecapping =
    segmentCheckVisible || segmentRecapPlaying || segmentRecap.active;

  const gameCompleteOverlayVisible = useGameEndCompleteOverlay(
    state.complete && state.totalPly > 0,
    isSegmentRecapping,
  );

  useEffect(() => {
    if (state.mode !== 'train' || segmentRecapPaused) {
      return;
    }

    const endIndex = state.plyIndex;
    if (endIndex <= lastRecapEndRef.current) {
      return;
    }

    const movesSinceLastRecap = endIndex - lastRecapEndRef.current;
    const atInterval = movesSinceLastRecap >= REPLAY_SEGMENT_RECAP_INTERVAL;
    const atEnd = state.complete;
    if (!atInterval && !atEnd) {
      return;
    }

    const startIndex = lastRecapEndRef.current;
    pendingSegmentRecapRef.current = {
      startIndex,
      endIndex,
      missedIndices: [...missedPlyRef.current].filter(
        (index) => index >= startIndex && index < endIndex,
      ),
    };
  }, [
    segmentRecapPaused,
    state.complete,
    state.mode,
    state.plyIndex,
  ]);

  useEffect(() => {
    if (!pendingSegmentRecapRef.current || segmentRecapPaused) {
      return;
    }
    if (
      state.correctMoveSquare ||
      state.incorrectMoveSquare ||
      missSequence.display.animating
    ) {
      return;
    }

    const pending = pendingSegmentRecapRef.current;
    pendingSegmentRecapRef.current = null;
    lastRecapEndRef.current = pending.endIndex;
    if (pending.missedIndices.length === 0) {
      return;
    }
    setSegmentRecapSpec(pending);
    setSegmentCheckVisible(true);
  }, [
    missSequence.display.animating,
    segmentRecapPaused,
    state.correctMoveSquare,
    state.incorrectMoveSquare,
    state.plyIndex,
  ]);

  useEffect(() => {
    if (!segmentCheckVisible || !segmentRecapSpec) {
      return;
    }

    const id = window.setTimeout(() => {
      setSegmentCheckVisible(false);
      setSegmentRecapPlaying(true);
    }, REPLAY_SEGMENT_CHECK_MS);
    return () => window.clearTimeout(id);
  }, [segmentCheckVisible, segmentRecapSpec]);

  useEffect(() => {
    if (!segmentResumeVisible) {
      return;
    }

    const id = window.setTimeout(() => {
      setSegmentResumeVisible(false);
    }, REPLAY_SEGMENT_RESUME_MS);
    return () => window.clearTimeout(id);
  }, [segmentResumeVisible]);

  const customArrows = useMemo<ChessboardArrow[]>(() => {
    if (isSegmentRecapping) {
      return segmentRecap.customArrows as ChessboardArrow[];
    }

    if (state.feedback !== 'incorrect') {
      return [];
    }

    if (missSequence.sequence) {
      return missSequence.display.arrows;
    }

    if (state.expectedUci) {
      return [
        [
          state.expectedUci.slice(0, 2),
          state.expectedUci.slice(2, 4),
          DEFAULT_ANSWER_ARROW_COLOR,
        ] as ChessboardArrow,
      ];
    }

    return [];
  }, [
    isSegmentRecapping,
    missSequence.display.arrows,
    missSequence.sequence,
    segmentRecap.customArrows,
    state.expectedUci,
    state.feedback,
  ]);

  const isTraining = state.mode === 'train';
  const activeTrainColor =
    state.mode === 'train' ? state.trainColor : selectedTrainColor;
  const boardPosition = isSegmentRecapping
    ? segmentRecap.fen
    : missSequence.display.fen ?? state.displayFen;
  const lastMoveUci = useMemo(() => {
    if (isSegmentRecapping) {
      return segmentRecap.lastMoveUci;
    }
    if (isTraining) {
      return missSequence.display.lastMoveUci ?? state.lastMoveUci;
    }
    return state.lastMoveUci;
  }, [
    isSegmentRecapping,
    isTraining,
    missSequence.display.lastMoveUci,
    segmentRecap.lastMoveUci,
    state.lastMoveUci,
  ]);
  const missLocked = isMissInputLocked(
    missSequence.sequence,
    missSequence.display.animating,
  );
  const boardDraggable =
    !state.complete &&
    !isSegmentRecapping &&
    !missLocked &&
    !state.correctMoveSquare &&
    !state.incorrectMoveSquare;
  const incorrectMoveSquare = resolveIncorrectMoveSquare(
    missSequence.sequence,
    missSequence.display.incorrectMoveSquare,
    state.incorrectMoveSquare,
  );
  const refutationMoveSquare = missSequence.display.refutationMoveSquare;
  const isDraggableTrainPiece = useCallback(
    ({ piece }: { piece: string }) => {
      if (activeTrainColor === 'both') {
        return piece[0] === state.sideToMove;
      }
      if (activeTrainColor === 'white') {
        return piece[0] === 'w' && state.sideToMove === 'w';
      }
      return piece[0] === 'b' && state.sideToMove === 'b';
    },
    [activeTrainColor, state.sideToMove],
  );
  const boardOrientation =
    state.trainColor === 'white'
      ? 'white'
      : state.trainColor === 'black'
        ? 'black'
        : orientation;
  const scrubEnabled = !isSegmentRecapping;

  useEffect(() => {
    if (state.game) {
      onGameLoaded?.(state.game);
    }
  }, [state.game, onGameLoaded]);

  const openAnalysis = useCallback(() => {
    if (!state.game) {
      return;
    }
    setAutoplayActive(false);
    setAnalysisSnapshot(
      buildReplayAnalysisContext(state.game, state.plyIndex, boardOrientation),
    );
    setAnalysisOpen(true);
  }, [state.game, state.plyIndex, boardOrientation]);

  const closeAnalysis = useCallback(() => {
    setAnalysisOpen(false);
  }, []);

  const handleRevealMove = useCallback(() => {
    if (
      state.mode === 'train' &&
      !state.complete &&
      state.trainColor !== 'both' &&
      !state.isUserTurn
    ) {
      onNotifyUser?.(
        'Wait for the opponent reply — missed moves are only recorded on your turn.',
      );
      return;
    }
    setHintSquare(null);
    missSequence.clearSequence();
    state.revealMove();
  }, [
    missSequence.clearSequence,
    state.complete,
    state.isUserTurn,
    state.mode,
    state.revealMove,
    state.trainColor,
  ]);

  const handleTrainColorChange = useCallback(
    (color: TrainColor) => {
      selectedTrainColorRef.current = color;
      setSelectedTrainColor(color);
      if (state.mode !== 'train') {
        return;
      }
      setHintSquare(null);
      missSequence.clearSequence();
      state.stopTraining();
      state.startTraining(color);
    },
    [
      missSequence.clearSequence,
      state.mode,
      state.startTraining,
      state.stopTraining,
    ],
  );

  const beginDrill = useCallback(() => {
    setAutoplayActive(false);
    setHintSquare(null);
    missSequence.clearSequence();
    lastRecapEndRef.current = state.plyIndex;
    pendingSegmentRecapRef.current = null;
    setSegmentCheckVisible(false);
    setSegmentResumeVisible(false);
    setSegmentRecapSpec(null);
    setSegmentRecapPlaying(false);
    state.startTraining(selectedTrainColorRef.current);
  }, [missSequence.clearSequence, state.plyIndex, state.startTraining]);

  const handleStopDrilling = useCallback(() => {
    setHintSquare(null);
    missSequence.clearSequence();
    lastRecapEndRef.current = 0;
    pendingSegmentRecapRef.current = null;
    setSegmentCheckVisible(false);
    setSegmentResumeVisible(false);
    setSegmentRecapSpec(null);
    setSegmentRecapPlaying(false);
    state.stopTraining();
  }, [missSequence.clearSequence, state.stopTraining]);

  const showHint = useCallback(() => {
    if (
      state.mode !== 'train' ||
      state.complete ||
      !state.isUserTurn ||
      state.feedback === 'incorrect'
    ) {
      return;
    }
    const expectedUci = state.game?.movesUci[state.plyIndex];
    if (!expectedUci) {
      return;
    }
    setHintSquare(expectedUci.slice(0, 2));
  }, [
    state.complete,
    state.feedback,
    state.game,
    state.isUserTurn,
    state.mode,
    state.plyIndex,
  ]);

  useEffect(() => {
    setHintSquare(null);
  }, [state.plyIndex]);

  const handleDrop = useCallback(
    (source: string, target: string, piece: string) => {
      const inDrill = state.mode === 'train' || drillFromDragRef.current;
      drillFromDragRef.current = false;
      if (inDrill && !state.complete && state.isUserTurn) {
        const expectedUci = state.game?.movesUci[state.plyIndex];
        const uci = uciFromDrop(state.fen, source, target, piece);
        if (uci && expectedUci && uci.toLowerCase() !== expectedUci.toLowerCase()) {
          missSequence.startSequence(state.fen, uci);
        } else if (
          uci &&
          expectedUci &&
          uci.toLowerCase() === expectedUci.toLowerCase()
        ) {
          missSequence.clearSequence();
        }
      }
      return state.handleDrop(source, target, piece);
    },
    [
      missSequence.clearSequence,
      missSequence.startSequence,
      state.complete,
      state.fen,
      state.game,
      state.handleDrop,
      state.isUserTurn,
      state.mode,
      state.plyIndex,
    ],
  );

  /** Manual scrubbing should leave drill mode so opponent auto-replies do not fight nav. */
  const stopTrainingIfActive = useCallback(() => {
    if (state.mode === 'train') {
      handleStopDrilling();
    }
  }, [handleStopDrilling, state.mode]);

  const stopAutoplay = useCallback(() => {
    setAutoplayActive(false);
  }, []);

  const startAutoplayFromPlay = useCallback(() => {
    stopTrainingIfActive();
    if (!state.canNext) {
      return;
    }
    setAutoplayActive(true);
  }, [state.canNext, stopTrainingIfActive]);

  entryChoiceHandlerRef.current = (choice: ReplayEntryChoice) => {
    if (choice.mode === 'through') {
      startAutoplayFromPlay();
      return;
    }
    selectedTrainColorRef.current = choice.color;
    setSelectedTrainColor(choice.color);
    trainingHint.runBeforeTraining(beginDrill);
  };

  const startDrill = useCallback(() => {
    trainingHint.runBeforeTraining(beginDrill);
  }, [beginDrill, trainingHint.runBeforeTraining]);

  const toggleAutoplay = useCallback(() => {
    if (autoplayActive) {
      stopAutoplay();
      return;
    }
    stopTrainingIfActive();
    if (!state.canNext) {
      return;
    }
    setAutoplayActive(true);
  }, [autoplayActive, stopAutoplay, stopTrainingIfActive, state.canNext]);

  const handlePieceDragBegin = useCallback(() => {
    if (
      state.mode === 'train' ||
      state.complete ||
      missSequence.display.animating
    ) {
      return;
    }
    trainingHint.runBeforeTraining(() => {
      drillFromDragRef.current = true;
      beginDrill();
    });
  }, [
    beginDrill,
    missSequence.display.animating,
    state.complete,
    state.mode,
    trainingHint.runBeforeTraining,
  ]);

  useEffect(() => {
    if (!autoplayActive || state.mode === 'train') {
      return;
    }
    if (!state.canNext) {
      setAutoplayActive(false);
      return;
    }
    const id = window.setTimeout(() => {
      state.goNext();
    }, autoplayStepMs);
    return () => window.clearTimeout(id);
  }, [
    autoplayActive,
    autoplayStepMs,
    state.mode,
    state.canNext,
    state.plyIndex,
    state.goNext,
  ]);

  useEffect(() => {
    if (!autoplayActive) {
      return;
    }
    void autoplayHint.maybeShow();
  }, [autoplayActive, autoplayHint.maybeShow]);

  useEffect(() => {
    if (state.mode === 'train' && autoplayActive) {
      setAutoplayActive(false);
    }
  }, [state.mode, autoplayActive]);

  const handleGoFirst = useCallback(() => {
    stopAutoplay();
    stopTrainingIfActive();
    state.goFirst();
  }, [stopAutoplay, stopTrainingIfActive, state.goFirst]);

  const handleGoPrev = useCallback(() => {
    stopAutoplay();
    stopTrainingIfActive();
    state.goPrev();
  }, [stopAutoplay, stopTrainingIfActive, state.goPrev]);

  const handleGoNext = useCallback(() => {
    stopAutoplay();
    stopTrainingIfActive();
    state.goNext();
  }, [stopAutoplay, stopTrainingIfActive, state.goNext]);

  const handleGoLast = useCallback(() => {
    stopAutoplay();
    stopTrainingIfActive();
    state.goLast();
  }, [stopAutoplay, stopTrainingIfActive, state.goLast]);

  const handleGoTo = useCallback(
    (ply: number) => {
      stopAutoplay();
      stopTrainingIfActive();
      state.goTo(ply);
    },
    [stopAutoplay, stopTrainingIfActive, state.goTo],
  );

  const resolvedPlayTimeEngine = useMemo(
    () => ({
      scriptUrl: stockfishScriptUrl,
      ...playTimeEngine,
    }),
    [playTimeEngine, stockfishScriptUrl],
  );

  usePositionKeyboardNav({
    enabled: !analysisOpen,
    canPrev: state.canPrev,
    canNext: state.canNext,
    onPrev: handleGoPrev,
    onNext: handleGoNext,
    onFirst: handleGoFirst,
    onLast: handleGoLast,
  });

  const analysisEngine = useMemo(
    () => ({
      ...analysisModalEngineOptions,
      ...engine,
    }),
    [engine],
  );

  if (state.loading) {
    return (
      <AnalysisEngineProvider scriptUrl={stockfishScriptUrl}>
        <TrainerPanelLayout info={renderSourceHeader?.(sourceMeta ?? null) ?? null}>
          <Box
            sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <Stack
              alignItems="center"
              justifyContent="center"
              spacing={1.5}
              sx={{
                width: boardWidth,
                maxWidth: '100%',
                minHeight: 200,
                color: 'text.secondary',
              }}
            >
              <CircularProgress size={28} color="inherit" />
              <Typography variant="body2">Loading game…</Typography>
            </Stack>
          </Box>
        </TrainerPanelLayout>
      </AnalysisEngineProvider>
    );
  }

  if (state.error || !state.game) {
    return (
      <AnalysisEngineProvider scriptUrl={stockfishScriptUrl}>
        <Box
          ref={boardMeasureRef}
          sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1.5}
            sx={{ width: boardWidth, maxWidth: '100%', minHeight: 200 }}
          >
            <Typography variant="body2" color="error">
              {state.error ?? 'Game unavailable.'}
            </Typography>
            {onExit && (
              <Button variant="outlined" color="inherit" onClick={onExit}>
                Back
              </Button>
            )}
          </Stack>
        </Box>
      </AnalysisEngineProvider>
    );
  }

  const { game } = state;
  const training = isTraining;
  const playTimeFen = isTraining
    ? (missSequence.sequence?.setupFen ?? state.fen)
    : state.displayFen;
  const playTimeEnabled =
    isTraining &&
    !analysisOpen &&
    !isSegmentRecapping &&
    isAnalyzableFen(playTimeFen);
  const canShowHint =
    training &&
    !state.complete &&
    state.isUserTurn &&
    state.feedback !== 'incorrect' &&
    hintSquare === null;
  const canShowMove =
    training && !state.complete && state.isUserTurn && state.feedback !== 'incorrect';
  const draggable = boardDraggable;
  const headerMeta = mergeSourceMeta(game ?? null, sourceMeta ?? null);

  const infoPanel = renderSourceHeader?.(headerMeta) ?? null;

  const displayedMove = Math.min(
    state.plyIndex + (state.complete ? 0 : 1),
    state.totalPly,
  );

  return (
    <AnalysisEngineProvider scriptUrl={stockfishScriptUrl}>
    <>
      {renderEntrySplash?.({
        open: entrySplash.open,
        step: entrySplash.step,
        dismissing: entrySplash.dismissing,
        meta: headerMeta,
        onChooseAgainst: entrySplash.chooseAgainst,
        onChooseThrough: () => void entrySplash.chooseThrough(),
        onChooseColor: (color) => void entrySplash.chooseColor(color),
        onClose: () => {
          entrySplash.close();
          onExit?.();
        },
      })}
      {renderTrainingHintSplash?.({
        open: trainingHint.open,
        dismissing: trainingHint.dismissing,
        meta: headerMeta,
        onDismiss: () => void trainingHint.dismiss(),
      })}
      <TrainerPanelLayout info={infoPanel}>
      <Stack
        spacing={1}
        sx={{ width: '100%', maxWidth: '100%', color: 'text.primary' }}
      >
        <Box sx={{ width: '100%' }}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={{ xs: 1, lg: 2 }}
          alignItems="stretch"
          sx={{
            width: 'fit-content',
            maxWidth: '100%',
            mx: 'auto',
            pt: { xs: 0, lg: 1.5 },
          }}
        >
          <Box
            ref={boardAnchorRef}
            sx={{
              flexShrink: 0,
              alignSelf: { xs: 'center', lg: 'flex-start' },
              width: { xs: '100%', lg: 'auto' },
            }}
          >
            <Box
              sx={{
                width: boardWidth,
                maxWidth: '100%',
                mx: { xs: 'auto', lg: 0 },
                flexShrink: 0,
              }}
            >
            <PlayTimeEngineProvider
              fen={playTimeFen}
              enabled={playTimeEnabled}
              options={resolvedPlayTimeEngine}
            >
            <BoardPositionEval fen={playTimeEnabled ? playTimeFen : boardPosition} />
            <ThemeProvider
              theme={theme}
              boardTheme={boardTheme}
            >
              <Box sx={{ position: 'relative', width: '100%' }}>
                <HighlightChessboard
                  key={state.boardRevision}
                  boardWidth={boardWidth}
                  checkSquare=""
                  hintSquare={training ? hintSquare : null}
                  incorrectMoveSquare={incorrectMoveSquare}
                  refutationMoveSquare={refutationMoveSquare}
                  correctMoveSquare={state.correctMoveSquare}
                  position={boardPosition}
                  boardOrientation={boardOrientation}
                  arePiecesDraggable={draggable}
                  isDraggablePiece={isDraggableTrainPiece}
                  onPieceDragBegin={handlePieceDragBegin}
                  onPieceDrop={handleDrop}
                  customArrows={customArrows}
                  lastMoveUci={lastMoveUci}
                  animationDuration={
                    isSegmentRecapping
                      ? segmentRecap.animationDuration
                      : getMissAnimationDuration(missSequence.display.animating)
                  }
                  promotionDialogVariant="modal"
                  areArrowsAllowed={false}
                  customBoardStyle={{ borderRadius: 4 }}
                />
                {segmentCheckVisible && <BoardCompleteCheckOverlay />}
                {gameCompleteOverlayVisible && !segmentCheckVisible && (
                  <BoardGameCompleteOverlay />
                )}
                {segmentResumeVisible && <BoardYourMoveAgainOverlay />}
              </Box>
            </ThemeProvider>
            </PlayTimeEngineProvider>
            </Box>
          </Box>

          <Box
            sx={{
              ...trainerDrillControlsGridSx,
              mt: isControlsBeside ? 'auto' : undefined,
            }}
          >
            <ButtonGroup
              fullWidth
              size="small"
              variant="outlined"
              aria-label="Train side"
              sx={trainerTrainSideGroupSx}
            >
              {(['white', 'black', 'both'] as const).map((color) => (
                <Button
                  key={color}
                  variant={activeTrainColor === color ? 'contained' : 'outlined'}
                  onClick={() => handleTrainColorChange(color)}
                >
                  {color === 'both'
                    ? 'Both'
                    : formatTrainSideLabel(color === 'white' ? 'w' : 'b')}
                </Button>
              ))}
            </ButtonGroup>

            {!training && (
              <Button
                fullWidth
                variant="contained"
                onClick={startDrill}
                disabled={state.complete}
                sx={trainerDrillOrStopBtnSx}
              >
                Drill line
              </Button>
            )}

            {training && !state.complete && (
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                onClick={handleStopDrilling}
                sx={trainerDrillOrStopBtnSx}
              >
                Stop drilling
              </Button>
            )}

            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              startIcon={<AnalyticsIcon />}
              onClick={openAnalysis}
              sx={trainerAnalyzeBtnSx}
            >
              Analyze
            </Button>

            {training && !state.complete && (
              <>
                <Button
                  fullWidth
                  variant="outlined"
                  color="inherit"
                  onClick={showHint}
                  disabled={!canShowHint}
                  sx={trainerHintBtnSx}
                >
                  Hint
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="inherit"
                  onClick={handleRevealMove}
                  disabled={!canShowMove}
                  sx={trainerShowMoveBtnSx}
                >
                  Show move
                </Button>
              </>
            )}
          </Box>
        </Stack>
        </Box>

        <Box sx={{ width: '100%', maxWidth: boardWidth, px: { xs: 1, sm: 0 }, mx: 'auto', position: 'relative' }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ width: '100%', minWidth: 0 }}
        >
          <IconButton
            aria-label="First move"
            size="small"
            color="inherit"
            onClick={handleGoFirst}
            disabled={!scrubEnabled || !state.canPrev}
          >
            <FirstPageIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label="Previous move"
            size="small"
            color="inherit"
            onClick={handleGoPrev}
            disabled={!scrubEnabled || !state.canPrev}
          >
            <NavigateBeforeIcon fontSize="small" />
          </IconButton>
          <Box sx={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
            {renderAutoplayHintOverlay?.({
              visible: autoplayHint.open,
              onDismiss: autoplayHint.dismiss,
            })}
            {renderAutoplaySettingsButton?.({
              highlighted: autoplayHint.open,
              onOpen: autoplayHint.dismiss,
            })}
          </Box>
          <IconButton
            aria-label={autoplayActive ? 'Stop autoplay' : 'Autoplay game'}
            size="small"
            color={autoplayActive ? 'primary' : 'inherit'}
            onClick={toggleAutoplay}
            disabled={!scrubEnabled || (!autoplayActive && !state.canNext)}
          >
            {autoplayActive ? (
              <StopIcon fontSize="small" />
            ) : (
              <PlayArrowIcon fontSize="small" />
            )}
          </IconButton>
          <Slider
            aria-label="Scrub through game"
            size="small"
            min={0}
            max={state.totalPly}
            value={state.plyIndex}
            onChange={(_event, value) => handleGoTo(Number(value))}
            disabled={!scrubEnabled}
            sx={{ flex: 1, mx: 1, minWidth: 48 }}
          />
          <IconButton
            aria-label="Next move"
            size="small"
            color="inherit"
            onClick={handleGoNext}
            disabled={!scrubEnabled || !state.canNext}
          >
            <NavigateNextIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label="Last move"
            size="small"
            color="inherit"
            onClick={handleGoLast}
            disabled={!scrubEnabled || !state.canNext}
          >
            <LastPageIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center' }}
        >
          Half move {displayedMove} of {state.totalPly}
          {training && !state.complete && (
            <>
              {` · ${TRAIN_COLOR_LABEL[state.trainColor]}`}
              {state.isUserTurn &&
                (state.trainColor === 'both'
                  ? ` · ${state.sideToMove === 'b' ? 'Black' : 'White'} to move`
                  : ' · Your move')}
            </>
          )}
        </Typography>
        </Box>
      </Stack>
      </TrainerPanelLayout>

      {analysisOpen && analysisSnapshot ? (
        <AnalysisErrorBoundary onClose={closeAnalysis}>
          <PuzzleAnalysisBoard
            analysisContext={analysisSnapshot}
            onClose={closeAnalysis}
            theme={theme}
            engine={analysisEngine}
            title="Game analysis"
            renderEngineEvaluation={(props) => (
              <PuzzleEngineEvaluation {...props} />
            )}
          />
        </AnalysisErrorBoundary>
      ) : null}
    </>
    </AnalysisEngineProvider>
  );
};

export default MuiReplayTrainerPanel;
