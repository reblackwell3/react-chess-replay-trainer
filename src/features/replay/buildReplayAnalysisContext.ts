import { REPLAY_START_FEN } from './constants';
import type { AnalysisContext } from 'react-chess-core';
import type { ReplayGame } from './types';

/** Build a core {@link AnalysisContext} for the current replay browse position. */
export function buildReplayAnalysisContext(
  game: ReplayGame,
  plyIndex: number,
  boardOrientation: 'white' | 'black',
): AnalysisContext {
  return {
    initialFen: REPLAY_START_FEN,
    solutionMoves: game.movesUci,
    currentPly: Math.max(0, Math.min(plyIndex, game.movesUci.length)),
    boardOrientation,
  };
}
