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
  replayRefutationEngineOptions,
  REPLAY_REFUTATION_EVAL_GAP_CP,
  REPLAY_REFUTATION_EVAL_GAP_PAWNS,
  type ReplayRefutationResult,
} from './refutation/replayRefutation';
export {
  getReplayMissDisplay,
  REPLAY_MISS_MOVE_ANIMATION_MS,
  REPLAY_MISS_REFUTATION_MAX_WAIT_MS,
  REPLAY_MISS_REFUTATION_PAUSE_MS,
  REPLAY_MISS_WRONG_PAUSE_MS,
  type MissSequencePhase,
  type MissSequenceState,
  type ReplayMissDisplay,
} from './miss/replayMissDisplay';
export { useReplayRefutation } from './miss/useReplayRefutation';
export { useReplayMissSequence } from './miss/useReplayMissSequence';
export { useReplayMissBoard } from './miss/useReplayMissBoard';

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
