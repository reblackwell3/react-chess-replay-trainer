/**
 * EndChess viewport bands (width-based).
 *
 * Aspect ratio: we key off viewport width only. On rotate, width changes
 * (e.g. iPad 768×1024 portrait → 1024×768 landscape), so the band updates
 * automatically. No separate orientation breakpoints are needed unless we hit
 * a case where width stays the same but height is unusually short.
 */

/** Inclusive pixel bounds for each band. */
export const VIEWPORT = {
  mobileMax: 767,
  tabletPortraitMin: 768,
  tabletPortraitMax: 1023,
  tabletLandscapeMin: 1024,
  tabletLandscapeMax: 1365,
  desktopMin: 1366,
  /** Full HD and wider — bump typography and content width. */
  wideDesktopMin: 1920,
  /** 1440p / scaled 4K — further scale boards and tables. */
  ultraWideMin: 2560,
} as const;

/** Last px in the tablet-portrait width band (768–1023). */
export const TABLET_PORTRAIT_MAX_PX = VIEWPORT.tabletPortraitMax;

/** MUI `theme.breakpoints.*` values — sm/md/lg map to our tablet/desktop bands. */
export const MUI_BREAKPOINT_VALUES = {
  xs: 0,
  sm: VIEWPORT.tabletPortraitMin,
  md: VIEWPORT.tabletLandscapeMin,
  lg: VIEWPORT.desktopMin,
  xl: 1536,
  xxl: VIEWPORT.wideDesktopMin,
  xxxl: VIEWPORT.ultraWideMin,
} as const;

/** `(max-width: …)` media query matching {@link TABLET_PORTRAIT_MAX_PX}. */
export const maxWidthTabletPortraitQuery = `(max-width:${TABLET_PORTRAIT_MAX_PX}px)`;

/** Tablet landscape band (1024–1366px), incl. iPad Pro landscape. */
export const tabletLandscapeQuery = `(min-width:${VIEWPORT.tabletLandscapeMin}px) and (max-width:${VIEWPORT.desktopMin}px)`;

/** Full HD and wider. */
export const wideDesktopQuery = `(min-width:${VIEWPORT.wideDesktopMin}px)`;

/** 1440p / large 4K viewports. */
export const ultraWideDesktopQuery = `(min-width:${VIEWPORT.ultraWideMin}px)`;

export type ViewportBand =
  | 'mobile'
  | 'tabletPortrait'
  | 'tabletLandscape'
  | 'desktop';

/** Classify a viewport width without React (tests, SSR). */
export const viewportBandForWidth = (widthPx: number): ViewportBand => {
  if (widthPx <= VIEWPORT.mobileMax) {
    return 'mobile';
  }
  if (widthPx <= VIEWPORT.tabletPortraitMax) {
    return 'tabletPortrait';
  }
  if (widthPx <= VIEWPORT.tabletLandscapeMax) {
    return 'tabletLandscape';
  }
  return 'desktop';
};
