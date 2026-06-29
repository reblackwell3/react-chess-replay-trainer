import type { SxProps, Theme } from '@mui/material';

const trainerControlButtonStyles = {
  fontSize: { xs: '0.875rem', lg: '0.9375rem', xl: '1rem', xxl: '1.0625rem', xxxl: '1.125rem' },
  py: { lg: 0.85, xxl: 1, xxxl: 1.1 },
} as const;

/** Shared drill controls grid: 2×2 on mobile, single column on landscape/desktop beside board. */
export const trainerDrillControlsGridSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr 1fr', lg: '1fr' },
  gap: 1,
  width: { xs: '100%', lg: 'auto' },
  minWidth: { lg: 140, xxl: 160, xxxl: 180 },
  flexShrink: 0,
  px: { xs: 1, lg: 0 },
  pb: { xs: 0.5, lg: 0 },
  '& .MuiButton-root': { width: '100%', ...trainerControlButtonStyles },
};

/** Full-width train-side row; first in both layouts. */
export const trainerTrainSideGroupSx: SxProps<Theme> = {
  gridColumn: '1 / -1',
  order: 1,
};

/** Mobile row 2 left; landscape row 3. */
export const trainerAnalyzeBtnSx: SxProps<Theme> = {
  order: { xs: 2, lg: 3 },
};

/** Mobile row 2 right; landscape row 4. */
export const trainerHintBtnSx: SxProps<Theme> = {
  order: { xs: 3, lg: 4 },
};

/** Mobile row 3 left; landscape row 2 (Drill line or Stop drilling). */
export const trainerDrillOrStopBtnSx: SxProps<Theme> = {
  order: { xs: 4, lg: 2 },
};

/** Mobile row 3 right; landscape row 5. */
export const trainerShowMoveBtnSx: SxProps<Theme> = {
  order: { xs: 5, lg: 5 },
};
