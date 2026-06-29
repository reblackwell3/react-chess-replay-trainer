import React, { createContext, useContext, useRef } from 'react';
import { Box } from '@mui/material';
import { useTrainerPanelChrome } from './TrainerPanelChromeContext';

/** Max width for game/course metadata beside the trainer board on desktop. */
export const TRAINER_INFO_PANEL_MAX_WIDTH = {
  xs: 420,
  xxl: 480,
  xxxl: 540,
} as const;

const TrainerPanelMeasureContext =
  createContext<React.RefObject<HTMLDivElement | null> | null>(null);

/** Full-width shell ref for responsive board sizing inside {@link TrainerPanelLayout}. */
export const useTrainerPanelMeasureRef = () =>
  useContext(TrainerPanelMeasureContext);

type TrainerPanelLayoutProps = {
  info?: React.ReactNode;
  children: React.ReactNode;
  /** Stretch to fill a flex parent (review page on tablet). */
  fillHeight?: boolean;
};

const fillHeightSx = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column' as const,
};

const infoPanelSx = {
  width: '100%',
  maxWidth: TRAINER_INFO_PANEL_MAX_WIDTH,
  pt: { lg: 0.5 },
  px: { xs: 1, lg: 0 },
};

const stackedHeaderRowBaseSx = {
  display: { xs: 'grid', lg: 'none' },
  rowGap: { xs: 1.5 },
  alignItems: 'start',
  mb: 2,
  width: '100%',
  maxWidth: { xs: TRAINER_INFO_PANEL_MAX_WIDTH, md: '100%' },
  mx: { xs: 'auto', md: 0 },
  pt: { lg: 0.5 },
  px: { xs: 1, lg: 0 },
};

/**
 * Keeps the trainer board centered in the viewport. Game/course metadata sits in
 * a left box on large screens (balanced by an empty right column) or above the
 * board on smaller viewports, without shifting the board horizontally.
 */
export const TrainerPanelLayout = ({
  info,
  children,
  fillHeight = false,
}: TrainerPanelLayoutProps) => {
  const measureRef = useRef<HTMLDivElement>(null);
  const sidebarLeading = useTrainerPanelChrome();
  const hasSidebar = Boolean(sidebarLeading || info);

  return (
  <TrainerPanelMeasureContext.Provider value={measureRef}>
  <Box
    ref={measureRef}
    sx={{
      width: '100%',
      ...(fillHeight ? fillHeightSx : {}),
    }}
  >
    {hasSidebar ? (
      <Box
        sx={{
          ...stackedHeaderRowBaseSx,
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: sidebarLeading
              ? 'minmax(0, 1fr) minmax(0, 1fr)'
              : 'minmax(0, 1fr)',
          },
          ...(sidebarLeading ? { columnGap: { md: 2, lg: 3 } } : {}),
        }}
      >
        {info ? <Box minWidth={0}>{info}</Box> : null}
        {sidebarLeading ? <Box minWidth={0}>{sidebarLeading}</Box> : null}
      </Box>
    ) : null}

    <Box
      sx={{
        display: 'grid',
        width: '100%',
        alignItems: fillHeight ? 'center' : 'start',
        alignContent: fillHeight ? 'center' : 'start',
        minHeight: fillHeight ? '100%' : undefined,
        gridTemplateColumns: hasSidebar
          ? { xs: 'minmax(0, 1fr)', lg: '1fr minmax(0, max-content) 1fr' }
          : 'minmax(0, 1fr)',
        ...(fillHeight ? { flex: 1, minHeight: 0 } : {}),
      }}
    >
      {hasSidebar ? (
        <Box
          sx={{
            display: { xs: 'none', lg: 'block' },
            justifySelf: 'end',
            pr: 3,
            ...infoPanelSx,
          }}
        >
          {info}
          {sidebarLeading && info ? (
            <Box sx={{ mt: { lg: 2, xxxl: 2.5 } }} />
          ) : null}
          {sidebarLeading}
        </Box>
      ) : null}

      <Box
        sx={{
          gridColumn: { xs: 1, lg: hasSidebar ? 2 : 1 },
          justifySelf: 'center',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          ...(fillHeight
            ? {
                ...fillHeightSx,
                justifyContent: 'center',
              }
            : {}),
        }}
      >
        {children}
      </Box>

      {hasSidebar ? <Box sx={{ display: { xs: 'none', lg: 'block' } }} /> : null}
    </Box>
  </Box>
  </TrainerPanelMeasureContext.Provider>
  );
};
