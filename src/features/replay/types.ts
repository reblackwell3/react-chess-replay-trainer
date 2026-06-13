export type ReplaySide = 'w' | 'b';

/** A game to replay/drill. Move lists are parallel (UCI + optional SAN). */
export type ReplayGame = {
  gameId?: string;
  white?: string;
  black?: string;
  whiteElo?: number;
  blackElo?: number;
  result?: string;
  timeControl?: string;
  timeClass?: string;
  date?: string;
  movesUci: string[];
  movesSan?: string[];
};

/** Reported when the user plays the wrong move (or reveals) during a drill. */
export type ReplayMiss = {
  /** 0-based ply index into {@link ReplayGame.movesUci}. */
  index: number;
  /** FEN of the missed position (the trainer is to move here). */
  fen: string;
  /** Correct move at this position. */
  expectedUci: string;
  expectedSan: string;
  /** Side to move at {@link fen}. */
  sideToMove: ReplaySide;
  /** Opponent's prior ply that produced {@link fen}, when one exists. */
  setupFen?: string;
  setupUci?: string;
};

export type ReplayMode = 'browse' | 'train';

export type ReplayFeedback = 'correct' | 'incorrect' | null;

/**
 * Which side the user drills. With a single color the opponent's replies are
 * played automatically after each correct guess; `'both'` drills every ply.
 */
export type TrainColor = 'white' | 'black' | 'both';
