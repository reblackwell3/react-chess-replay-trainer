import { useCallback, useMemo } from 'react';
import type { AnalysisEngineOptions } from 'react-chess-core';
import { uciFromDrop } from 'react-chess-core';
import { replayRefutationEngineOptions } from '../refutation/replayRefutation';
import { useReplayMissSequence } from './useReplayMissSequence';

type ReplayMissFeedback = 'correct' | 'incorrect' | null;

export function useReplayMissBoard({
  feedback,
  expectedUci,
  positionFen,
  answerArrowColor,
  autoShowWrongMoves = true,
  engineOptions,
}: {
  feedback: ReplayMissFeedback;
  expectedUci: string | null;
  positionFen: string;
  answerArrowColor: string;
  autoShowWrongMoves?: boolean;
  engineOptions?: AnalysisEngineOptions;
}) {
  const refutationEngine = useMemo(
    () => ({
      ...replayRefutationEngineOptions,
      ...engineOptions,
    }),
    [engineOptions],
  );

  const missSequence = useReplayMissSequence(
    feedback,
    expectedUci,
    refutationEngine,
    answerArrowColor,
    autoShowWrongMoves,
  );

  const customArrows = useMemo<[string, string, string][]>(() => {
    if (feedback !== 'incorrect') {
      return [];
    }

    if (missSequence.sequence) {
      return missSequence.display.arrows;
    }

    if (expectedUci) {
      return [
        [
          expectedUci.slice(0, 2),
          expectedUci.slice(2, 4),
          answerArrowColor,
        ],
      ];
    }

    return [];
  }, [
    answerArrowColor,
    expectedUci,
    feedback,
    missSequence.display.arrows,
    missSequence.sequence,
  ]);

  const boardPosition = missSequence.display.fen ?? positionFen;

  const wrapDropHandler = useCallback(
    (
      onDrop: (source: string, target: string, piece: string) => boolean,
      {
        enabled,
        dropFen = boardPosition,
        expectedMoveUci = expectedUci,
      }: {
        enabled: boolean;
        dropFen?: string;
        expectedMoveUci?: string | null;
      },
    ) =>
      (source: string, target: string, piece: string) => {
        if (enabled && expectedMoveUci) {
          const uci = uciFromDrop(dropFen, source, target, piece);
          if (uci && uci.toLowerCase() !== expectedMoveUci.toLowerCase()) {
            missSequence.startSequence(dropFen, uci);
          } else if (
            uci &&
            uci.toLowerCase() === expectedMoveUci.toLowerCase()
          ) {
            missSequence.clearSequence();
          }
        }

        return onDrop(source, target, piece);
      },
    [
      boardPosition,
      expectedUci,
      missSequence.clearSequence,
      missSequence.startSequence,
    ],
  );

  return {
    missSequence,
    refutation: missSequence.refutation,
    customArrows,
    boardPosition,
    boardAnimating: missSequence.display.animating,
    wrapDropHandler,
  };
}
