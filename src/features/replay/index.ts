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
export { REPLAY_START_FEN, DEFAULT_BOARD_WIDTH } from './constants';
export {
  fenAtPly,
  findPlyIndexForFen,
  sideToMove,
  uciFromDrop,
  normalizeFen,
} from './replayUtils';
export { buildReplayAnalysisContext } from './buildReplayAnalysisContext';

// Re-export analysis board from react-chess-core for host apps.
export {
  AnalysisBoard,
  AnalysisBoardCore,
  AnalysisErrorBoundary,
  DEFAULT_ANALYSIS_LAYOUT,
  type AnalysisContext,
  type AnalysisBoardProps,
  type AnalysisLayoutConfig,
} from 'react-chess-core';
