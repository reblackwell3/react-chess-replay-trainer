import { useCallback, useMemo } from 'react';
import { fenAtPly } from './replayUtils';
import {
  useSolutionLineRecap,
  type SolutionLineRecapState,
} from 'react-chess-core';

export const REPLAY_SEGMENT_RECAP_INTERVAL = 10;
export const REPLAY_SEGMENT_CHECK_MS = 1000;
/** Pause after the segment mistake recap before resuming the drill. */
export const REPLAY_SEGMENT_RESUME_MS = 1000;

export type ReplaySegmentRecapState = SolutionLineRecapState;

export const useReplaySegmentRecap = ({
  movesUci,
  startIndex,
  endIndex,
  missedIndices,
  active,
  onComplete,
}: {
  movesUci: string[];
  startIndex: number;
  endIndex: number;
  missedIndices: number[];
  active: boolean;
  onComplete: () => void;
}): ReplaySegmentRecapState => {
  const segmentStartFen = useMemo(
    () => fenAtPly(movesUci, startIndex),
    [movesUci, startIndex],
  );
  const setupUci = startIndex > 0 ? movesUci[startIndex - 1] : null;

  const resolveFen = useCallback(
    (moveIndex: number, afterMove: boolean) =>
      fenAtPly(movesUci, afterMove ? moveIndex + 1 : moveIndex),
    [movesUci],
  );

  return useSolutionLineRecap({
    active,
    movesUci,
    startIndex,
    endIndex,
    missedIndices,
    segmentStartFen,
    setupUci: setupUci ?? null,
    onComplete,
    completeImmediatelyWhenNoMisses: true,
    resolveFen,
  });
};
