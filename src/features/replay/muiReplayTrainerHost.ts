import type { ReactNode } from 'react';
import type { ReplayGame, ReplayMiss, TrainColor } from './types';

export type SourceGameMeta = {
  white?: string;
  black?: string;
  whiteElo?: number | string;
  blackElo?: number | string;
  result?: string;
  date?: string;
  timeControl?: string;
  timeClass?: string;
  opening?: string;
  eco?: string;
  event?: string;
  site?: string;
};

export type ReplayEntryChoice =
  | { mode: 'through' }
  | { mode: 'against'; color: TrainColor };

export type ReplayEntrySplashState = {
  open: boolean;
  step: 'choose' | 'color' | 'mode' | 'against-color';
  dismissing: boolean;
  chooseAgainst: () => void;
  chooseThrough: () => void | Promise<void>;
  chooseColor: (color: TrainColor) => void | Promise<void>;
  close: () => void;
};

export type TrainingHintState = {
  open: boolean;
  dismissing: boolean;
  dismiss: () => Promise<void>;
  runBeforeTraining: (start: () => void) => void;
};

export type RecordReplayHalfMoveSeen = (
  gameId: string,
  halfMove: number,
) => Promise<{ seenBefore: boolean }>;

export type MuiReplayTrainerPanelHostProps = {
  renderSourceHeader?: (meta: SourceGameMeta | null) => ReactNode;
  renderEntrySplash?: (props: {
    open: boolean;
    step: ReplayEntrySplashState['step'];
    dismissing: boolean;
    meta: SourceGameMeta | null;
    onChooseAgainst: () => void;
    onChooseThrough: () => void;
    onChooseColor: (color: TrainColor) => void;
    onClose: () => void;
  }) => ReactNode;
  renderTrainingHintSplash?: (props: {
    open: boolean;
    dismissing: boolean;
    meta: SourceGameMeta | null;
    onDismiss: () => void;
  }) => ReactNode;
  renderAutoplayHintOverlay?: (props: {
    visible: boolean;
    onDismiss: () => void;
  }) => ReactNode;
  renderAutoplaySettingsButton?: (props: {
    highlighted: boolean;
    onOpen: () => void;
  }) => ReactNode;
  onNotifyUser?: (message: string) => void;
  autoplayStepMs?: number;
  formatTrainSideLabel?: (side: 'w' | 'b') => string;
  mergeSourceMeta?: (
    game: ReplayGame | null,
    seed?: SourceGameMeta | null,
  ) => SourceGameMeta | null;
  useEntrySplash?: (options: {
    ready: boolean;
    gameId: string;
    onChoose: (choice: ReplayEntryChoice) => void;
  }) => ReplayEntrySplashState;
  useTrainingHint?: () => TrainingHintState;
  useAutoplayHint?: (enabled: boolean) => {
    open: boolean;
    dismiss: () => void;
    maybeShow: () => void;
  };
};

export type { ReplayMiss };
