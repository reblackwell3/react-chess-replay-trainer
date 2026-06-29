import { VIEWPORT } from './viewportBreakpoints';

/** Smallest playable board (still readable on narrow phones). */
export const MIN_BOARD_WIDTH = 240;

/** Cap main play boards on phone-sized viewports. */
export const MOBILE_MAX_BOARD_WIDTH = 300;

/** Upper bound when filling tablet-width trainer columns (below desktop side-by-side info). */
export const TABLET_MAX_BOARD_WIDTH = 960;

/** Modest board width when info sits beside the board on large tablets (e.g. iPad Pro landscape). */
export const TABLET_LANDSCAPE_TRAINER_BOARD_WIDTH = 640;

/** Scale trainer boards on large desktop viewports (1536px+). */
export const LARGE_DESKTOP_BOARD_WIDTH_SCALE = 1.1;

/** Scale trainer boards on wide desktop viewports (1920px+). */
export const WIDE_DESKTOP_BOARD_WIDTH_SCALE = 1.2;

/** Scale trainer boards on ultra-wide / 4K viewports (2560px+). */
export const ULTRA_WIDE_BOARD_WIDTH_SCALE = 1.45;

/** Review board target width as a share of the trainer measure container (desktop). */
export const TRAINER_BOARD_VIEWPORT_WIDTH_FRACTION = 0.44;

/** @deprecated Use {@link TRAINER_BOARD_VIEWPORT_WIDTH_FRACTION}. */
export const REVIEW_BOARD_VIEWPORT_WIDTH_FRACTION =
  TRAINER_BOARD_VIEWPORT_WIDTH_FRACTION;

/** Keep in sync with react-chess-puzzle-kit puzzleBoardLayout.ts */
export const PUZZLE_CONTROLS_STACK_BREAKPOINT_PX = VIEWPORT.desktopMin - 1;
export const PUZZLE_CONTROLS_BESIDE_RESERVE_PX = 176;
/** Side control column in replay / course trainers (minWidth 140 + gap 16). */
export const TRAINER_CONTROLS_BESIDE_RESERVE_PX = 156;

/** Caption + stacked puzzle/review controls below the board (tablet portrait). */
export const PUZZLE_CONTROLS_STACKED_RESERVE_PX = 220;

/** Drill controls, scrubber, status, and feedback below the board on stacked layouts. */
export const REPLAY_CONTROLS_STACKED_RESERVE_PX = 260;

/** {@link BoardPositionEval} bar + margin above the chessboard. */
export const BOARD_EVAL_BAR_RESERVE_PX = 24;

/** Breathing room at the bottom of the mobile viewport when fitting the board. */
export const MOBILE_VIEWPORT_BOTTOM_PAD_PX = 8;

/** Scrubber, caption, and status below fill-height trainer boards. */
export const TRAINER_BOARD_VIEWPORT_BOTTOM_RESERVE_PX = 200;

export type ResponsiveMaxBoardWidthOptions = {
  /** When set, mobile uses this cap instead of {@link MOBILE_MAX_BOARD_WIDTH}. */
  mobileMaxBoardWidth?: number;
};

export const responsiveMaxBoardWidth = (
  maxBoardWidth: number,
  isMobile: boolean,
  options?: ResponsiveMaxBoardWidthOptions,
): number => {
  if (!isMobile) {
    return maxBoardWidth;
  }
  const mobileCap = options?.mobileMaxBoardWidth ?? MOBILE_MAX_BOARD_WIDTH;
  return Math.min(maxBoardWidth, mobileCap);
};
