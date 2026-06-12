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
