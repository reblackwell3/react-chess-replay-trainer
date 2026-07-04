import {
  fenAtPly as fenAtPlyFromCore,
  findPlyIndexForFen as findPlyIndexForFenFromCore,
  normalizeFen as normalizeFenFromCore,
} from 'react-chess-core';
import { REPLAY_START_FEN } from './constants';
import type { ReplaySide, TrainColor } from './types';

export { normalizeFenFromCore as normalizeFen };

/** FEN after applying the first `ply` moves from the replay start position. */
export function fenAtPly(movesUci: string[], ply: number): string {
  return fenAtPlyFromCore(movesUci, ply, REPLAY_START_FEN);
}

/** Index of the next move to play to reach `targetFen` from the replay start. */
export function findPlyIndexForFen(
  movesUci: string[],
  targetFen: string,
): number {
  return findPlyIndexForFenFromCore(movesUci, targetFen, REPLAY_START_FEN);
}

export function sideToMove(fen: string): ReplaySide {
  return fen.trim().split(/\s+/)[1] === 'b' ? 'b' : 'w';
}

export function isTrainSideToMove(
  trainColor: TrainColor,
  side: ReplaySide,
): boolean {
  return (
    trainColor === 'both' ||
    (trainColor === 'white' && side === 'w') ||
    (trainColor === 'black' && side === 'b')
  );
}
