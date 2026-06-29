export { ReplayTrainer, type ReplayTrainerProps } from './ReplayTrainer';
export {
  useReplayTrainer,
  type UseReplayTrainerOptions,
  type ReplayTrainerState,
} from './hooks/useReplayTrainer';
export type {
  ReplayGame,
  ReplayMiss,
  ReplayMode,
  ReplayFeedback,
  ReplaySide,
  TrainColor,
} from './types';
export {
  REPLAY_START_FEN,
  DEFAULT_BOARD_WIDTH,
  REPLAY_AUTOPLAY_STEP_MS,
} from './constants';
export {
  fenAtPly,
  findPlyIndexForFen,
  sideToMove,
  normalizeFen,
} from './replayUtils';
export { uciFromDrop } from 'react-chess-core';
export { buildReplayAnalysisContext } from './buildReplayAnalysisContext';

export {
  fenAfterUci,
  refutationEvalGapCp,
  refutationFromEvaluation,
  type RefutationResult as ReplayRefutationResult,
} from 'react-chess-core';
export {
  refutationEngineOptions as replayRefutationEngineOptions,
  REFUTATION_EVAL_GAP_CP as REPLAY_REFUTATION_EVAL_GAP_CP,
  REFUTATION_EVAL_GAP_PAWNS as REPLAY_REFUTATION_EVAL_GAP_PAWNS,
} from 'react-chess-core';
export {
  getMissDisplay as getReplayMissDisplay,
  getMissAnimationDuration,
  isMissInputLocked,
  resolveIncorrectMoveSquare,
  MISS_MOVE_ANIMATION_MS as REPLAY_MISS_MOVE_ANIMATION_MS,
  MISS_REFUTATION_MAX_WAIT_MS as REPLAY_MISS_REFUTATION_MAX_WAIT_MS,
  MISS_REFUTATION_PAUSE_MS as REPLAY_MISS_REFUTATION_PAUSE_MS,
  MISS_WRONG_PAUSE_MS as REPLAY_MISS_WRONG_PAUSE_MS,
  type MissDisplay as ReplayMissDisplay,
  type MissSequencePhase,
  type MissSequenceState,
} from 'react-chess-core';
export {
  useMissRefutation as useReplayRefutation,
  useMissSequence as useReplayMissSequence,
  useMissBoard as useReplayMissBoard,
} from 'react-chess-core';

export {
  default as MuiReplayTrainerPanel,
  type MuiReplayTrainerPanelProps,
} from './MuiReplayTrainerPanel';
export {
  type MuiReplayTrainerPanelHostProps,
  type SourceGameMeta,
  type RecordReplayHalfMoveSeen,
  type ReplayEntryChoice,
} from './muiReplayTrainerHost';
export { replaySrsModeFromSeenBefore, type ReplaySrsMode } from './replaySrs';
export {
  REPLAY_SEGMENT_CHECK_MS,
  REPLAY_SEGMENT_RECAP_INTERVAL,
  REPLAY_SEGMENT_RESUME_MS,
  useReplaySegmentRecap,
} from './useReplaySegmentRecap';

// Re-export analysis board from react-chess-core for host apps.
export {
  AnalysisBoard,
  AnalysisBoardCore,
  AnalysisErrorBoundary,
  DEFAULT_ANALYSIS_LAYOUT,
  DefaultPlyNavigation,
  PlyNavigation,
  defaultRenderPlyNavigation,
  type AnalysisContext,
  type AnalysisBoardProps,
  type AnalysisLayoutConfig,
  type PlyNavigationModel,
  type PlyNavigationProps,
  type PlyNavigationRenderProps,
} from 'react-chess-core';
