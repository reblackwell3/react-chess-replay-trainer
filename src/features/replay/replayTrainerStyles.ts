import type { CSSProperties } from 'react';
import type { TrainColor } from './types';

export type ReplayTheme = 'light' | 'dark';

export type ReplayPalette = {
  text: string;
  subtle: string;
  border: string;
  surface: string;
  primary: string;
  success: string;
  error: string;
};

export type ButtonVariant = 'primary' | 'ghost' | 'nav';

export const TRAIN_COLOR_LABEL: Record<TrainColor, string> = {
  white: 'Training White',
  black: 'Training Black',
  both: 'Training Both',
};

export const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

export const centerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  minHeight: 200,
};

export const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  fontSize: 14,
};

export const controlsRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  justifyContent: 'center',
};

export const playerNameStyle: CSSProperties = {
  fontWeight: 600,
};

export const feedbackContainerStyle: CSSProperties = {
  minHeight: 24,
  textAlign: 'center',
};

export const customBoardStyle: CSSProperties = {
  borderRadius: 4,
};

export function palette(theme: ReplayTheme): ReplayPalette {
  return {
    text: theme === 'dark' ? '#e8e8e8' : '#1a1a1a',
    subtle: theme === 'dark' ? '#9aa0a6' : '#5f6368',
    border: theme === 'dark' ? '#3a3a3a' : '#d0d0d0',
    surface: theme === 'dark' ? '#262626' : '#f5f5f5',
    primary: '#3a7bd5',
    success: '#2e7d32',
    error: '#c62828',
  };
}

export function mainContainerStyle(
  boardWidth: number,
  colors: ReplayPalette,
): CSSProperties {
  return { ...columnStyle, width: boardWidth, color: colors.text };
}

export function centerContainerStyle(
  boardWidth: number,
  color: string,
): CSSProperties {
  return { ...centerStyle, width: boardWidth, color };
}

export function subtleTextStyle(colors: ReplayPalette): CSSProperties {
  return { color: colors.subtle };
}

export function statusLineStyle(colors: ReplayPalette): CSSProperties {
  return { color: colors.subtle, fontSize: 13, textAlign: 'center' };
}

export function feedbackMessageStyle(
  colors: ReplayPalette,
  tone: 'success' | 'error',
): CSSProperties {
  return {
    color: tone === 'success' ? colors.success : colors.error,
    fontWeight: 600,
  };
}

export function buttonStyle(
  colors: ReplayPalette,
  variant: ButtonVariant,
): CSSProperties {
  const base: CSSProperties = {
    padding: variant === 'nav' ? '4px 10px' : '8px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.text,
  };
  if (variant === 'primary') {
    return {
      ...base,
      background: colors.primary,
      borderColor: colors.primary,
      color: '#fff',
    };
  }
  return base;
}
