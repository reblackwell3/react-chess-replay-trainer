import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import {
  BOARD_EVAL_BAR_RESERVE_PX,
  MIN_BOARD_WIDTH,
  MOBILE_VIEWPORT_BOTTOM_PAD_PX,
  TRAINER_BOARD_VIEWPORT_BOTTOM_RESERVE_PX,
  responsiveMaxBoardWidth,
  TABLET_LANDSCAPE_TRAINER_BOARD_WIDTH,
  TABLET_MAX_BOARD_WIDTH,
  ULTRA_WIDE_BOARD_WIDTH_SCALE,
  LARGE_DESKTOP_BOARD_WIDTH_SCALE,
  WIDE_DESKTOP_BOARD_WIDTH_SCALE,
  type ResponsiveMaxBoardWidthOptions,
} from './boardLayoutConstants';
import { useTrainerPanelMeasureRef } from './TrainerPanelLayout';

export type UseFittedBoardWidthOptions = ResponsiveMaxBoardWidthOptions & {
  /** Width reserved by puzzle controls when placed beside the board. */
  besideControlsReservePx?: number;
  /** When set, caps the board using container height minus this reserve (stacked controls). */
  stackedControlsReservePx?: number;
  /** Cap board size by the measure container height (fill-height trainer layouts). */
  fitToContainerHeight?: boolean;
  /** Grow the board up to this share of the measure container width (e.g. review at 50%). */
  targetViewportWidthFraction?: number;
};

export const fitBoardWidth = (
  containerWidth: number,
  maxBoardWidth: number,
  besideControlsReservePx = 0,
  maxBoardHeight?: number,
): number => {
  const available = Math.max(0, containerWidth - besideControlsReservePx);
  let fitted = Math.min(maxBoardWidth, available);
  if (maxBoardHeight != null && maxBoardHeight > 0) {
    fitted = Math.min(fitted, maxBoardHeight);
  }
  return Math.max(MIN_BOARD_WIDTH, Math.floor(fitted));
};

export const effectiveMaxBoardWidth = (
  cappedMax: number,
  containerWidth: number,
  targetViewportWidthFraction?: number,
): number => {
  if (targetViewportWidthFraction == null) {
    return cappedMax;
  }
  const viewportWidth =
    typeof window !== 'undefined' ? window.innerWidth : 0;
  const widthBasis = Math.max(containerWidth, viewportWidth);
  if (widthBasis <= 0) {
    return cappedMax;
  }
  return Math.max(
    cappedMax,
    Math.floor(widthBasis * targetViewportWidthFraction),
  );
};

/** Shrinks the chessboard to the measured column width, with a phone cap. */
export const useFittedBoardWidth = (
  maxBoardWidth: number,
  options?: UseFittedBoardWidthOptions,
) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cappedMax = responsiveMaxBoardWidth(maxBoardWidth, isMobile, options);
  const besideControlsReservePx = options?.besideControlsReservePx ?? 0;
  const stackedControlsReservePx = options?.stackedControlsReservePx ?? 0;
  const fitToContainerHeight = options?.fitToContainerHeight ?? false;
  const targetViewportWidthFraction = options?.targetViewportWidthFraction;
  const panelMeasureRef = useTrainerPanelMeasureRef();
  const fallbackContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = panelMeasureRef ?? fallbackContainerRef;
  const boardAnchorRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(cappedMax);

  const updateBoardWidth = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const { width, height } = container.getBoundingClientRect();
    let maxBoardHeight: number | undefined;

    if (targetViewportWidthFraction != null && typeof window !== 'undefined') {
      const bottomReserve =
        stackedControlsReservePx > 0
          ? stackedControlsReservePx
          : TRAINER_BOARD_VIEWPORT_BOTTOM_RESERVE_PX;
      const verticalReserve =
        BOARD_EVAL_BAR_RESERVE_PX +
        bottomReserve +
        MOBILE_VIEWPORT_BOTTOM_PAD_PX;

      // Fill-height trainer panels vertically center the board, so boardTop-based
      // viewport math under-estimates available space and collapses the board.
      if (fitToContainerHeight && height > 0) {
        const heightCap = height - verticalReserve;
        if (heightCap > 0) {
          maxBoardHeight = heightCap;
        }
      }
    } else if (stackedControlsReservePx > 0) {
      // Viewport fitting avoids a feedback loop when the measure ref sits on a
      // content-sized inner box (tablet portrait review / line trainers).
      if (typeof window !== 'undefined') {
        const boardTop =
          boardAnchorRef.current?.getBoundingClientRect().top ??
          container.getBoundingClientRect().top;
        const viewportMax =
          window.innerHeight -
          boardTop -
          BOARD_EVAL_BAR_RESERVE_PX -
          stackedControlsReservePx -
          MOBILE_VIEWPORT_BOTTOM_PAD_PX;
        if (viewportMax > 0) {
          maxBoardHeight = viewportMax;
        }
      } else if (height > 0) {
        maxBoardHeight = height - stackedControlsReservePx;
      }
    } else if (fitToContainerHeight && height > 0) {
      const heightCap =
        height - BOARD_EVAL_BAR_RESERVE_PX - MOBILE_VIEWPORT_BOTTOM_PAD_PX;
      if (heightCap > 0) {
        maxBoardHeight = heightCap;
      }
    }
    setBoardWidth(
      fitBoardWidth(
        width,
        effectiveMaxBoardWidth(cappedMax, width, targetViewportWidthFraction),
        besideControlsReservePx,
        maxBoardHeight,
      ),
    );
  }, [
    besideControlsReservePx,
    cappedMax,
    fitToContainerHeight,
    stackedControlsReservePx,
    targetViewportWidthFraction,
  ]);

  useLayoutEffect(() => {
    setBoardWidth(cappedMax);
  }, [cappedMax]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    updateBoardWidth();

    const observer = new ResizeObserver(updateBoardWidth);
    observer.observe(container);
    window.addEventListener('resize', updateBoardWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBoardWidth);
    };
  }, [updateBoardWidth]);

  return { containerRef, boardAnchorRef, boardWidth, maxBoardWidth: cappedMax };
};

export type UseTrainerFittedBoardWidthOptions = {
  designBoardWidth: number;
  /** Horizontal space for controls when they sit beside the board on tablet layouts. */
  besideControlsReservePx?: number;
  /** Vertical space for caption + controls when they stack below the board. */
  stackedControlsReservePx?: number;
  /** Grow the board up to the trainer panel height on desktop. */
  fitToContainerHeight?: boolean;
  /** Target board width as a fraction of the measure container (review fills ~half the screen). */
  targetViewportWidthFraction?: number;
};

/** Side controls only on large desktop — tablets (incl. iPad Pro) stack below the board. */
export const useTrainerControlsBeside = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up('lg'));
};

/** Fills tablet-width trainer columns; keeps the design width on large desktop layouts. */
export const useTrainerFittedBoardWidth = ({
  designBoardWidth: designWidth,
  besideControlsReservePx = 0,
  stackedControlsReservePx = 0,
  fitToContainerHeight = false,
  targetViewportWidthFraction,
}: UseTrainerFittedBoardWidthOptions) => {
  const theme = useTheme();
  const isControlsBeside = useTrainerControlsBeside();
  const isUltraWide = useMediaQuery(theme.breakpoints.up('xxxl'));
  const isWideDesktop = useMediaQuery(theme.breakpoints.up('xxl'));
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('xl'));
  // iPad Pro landscape (1366px) hits lg but not xl — a modest fixed bump, not full fill.
  const isCompactDesktop = useMediaQuery(theme.breakpoints.between('lg', 'xl'));

  const scaledDesignWidth = isUltraWide
    ? Math.round(designWidth * ULTRA_WIDE_BOARD_WIDTH_SCALE)
    : isWideDesktop
      ? Math.round(designWidth * WIDE_DESKTOP_BOARD_WIDTH_SCALE)
      : isLargeDesktop
        ? Math.round(designWidth * LARGE_DESKTOP_BOARD_WIDTH_SCALE)
        : designWidth;

  const maxBoardWidth = isLargeDesktop
    ? scaledDesignWidth
    : isCompactDesktop
      ? TABLET_LANDSCAPE_TRAINER_BOARD_WIDTH
      : TABLET_MAX_BOARD_WIDTH;

  const fitted = useFittedBoardWidth(maxBoardWidth, {
    besideControlsReservePx: isControlsBeside ? besideControlsReservePx : 0,
    stackedControlsReservePx: isControlsBeside ? 0 : stackedControlsReservePx,
    fitToContainerHeight: fitToContainerHeight && isControlsBeside,
    targetViewportWidthFraction: isControlsBeside
      ? targetViewportWidthFraction
      : undefined,
  });

  return { ...fitted, isControlsBeside };
};
