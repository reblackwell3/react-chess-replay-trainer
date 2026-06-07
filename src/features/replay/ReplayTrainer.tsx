import React, { useCallback, useState } from 'react';
import { ChessboardDnDProvider } from 'react-chessboard';
import {
  AnalysisBoard,
  AnalysisErrorBoundary,
  HighlightChessboard,
  ThemeProvider,
  type AnalysisContext,
  type AnalysisEngineOptions,
} from 'react-chess-core';
import { buildReplayAnalysisContext } from './buildReplayAnalysisContext';
import { DEFAULT_BOARD_WIDTH } from './constants';
import { useReplayTrainer } from './hooks/useReplayTrainer';
import type { ReplayGame, ReplayMiss } from './types';

export interface ReplayTrainerProps {
  gameId: string;
  fetchGame: (gameId: string) => Promise<ReplayGame | null>;
  /** Position to open at; browse mode starts here. Defaults to the game start. */
  startFen?: string;
  /** Reported once per ply when the user plays the wrong move or reveals it. */
  onMiss?: (miss: ReplayMiss) => void;
  /** Called when a drill reaches the end of the game. */
  onComplete?: () => void;
  /** Called when the user leaves the trainer. */
  onExit?: () => void;
  theme?: 'light' | 'dark';
  boardWidth?: number;
  /** Side shown at the bottom of the board. Defaults to white. */
  orientation?: 'white' | 'black';
  /** Stockfish options for the built-in analysis board. Set `enabled: false` to hide engine lines. */
  engine?: AnalysisEngineOptions;
}

const TRAIN_COLOR_LABEL: Record<'white' | 'black' | 'both', string> = {
  white: 'Training White',
  black: 'Training Black',
  both: 'Training Both',
};

const palette = (theme: 'light' | 'dark') => ({
  text: theme === 'dark' ? '#e8e8e8' : '#1a1a1a',
  subtle: theme === 'dark' ? '#9aa0a6' : '#5f6368',
  border: theme === 'dark' ? '#3a3a3a' : '#d0d0d0',
  surface: theme === 'dark' ? '#262626' : '#f5f5f5',
  primary: '#3a7bd5',
  success: '#2e7d32',
  error: '#c62828',
});

/**
 * Browse a game freely, then drill it from any point. Browsing (first / prev /
 * next / last / slider) never records anything; once the user hits "Train from
 * here" each wrong move is reported through {@link ReplayTrainerProps.onMiss}.
 */
export const ReplayTrainer = ({
  gameId,
  fetchGame,
  startFen,
  onMiss,
  onComplete,
  onExit,
  theme = 'dark',
  boardWidth = DEFAULT_BOARD_WIDTH,
  orientation = 'white',
  engine,
}: ReplayTrainerProps) => {
  const state = useReplayTrainer({ gameId, startFen, fetchGame, onMiss, onComplete });
  const colors = palette(theme);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisSnapshot, setAnalysisSnapshot] =
    useState<AnalysisContext | null>(null);

  const boardOrientation =
    state.trainColor === 'white'
      ? 'white'
      : state.trainColor === 'black'
        ? 'black'
        : orientation;

  const openAnalysis = useCallback(() => {
    if (!state.game) {
      return;
    }
    setAnalysisSnapshot(
      buildReplayAnalysisContext(state.game, state.plyIndex, boardOrientation),
    );
    setAnalysisOpen(true);
  }, [state.game, state.plyIndex, boardOrientation]);

  const closeAnalysis = useCallback(() => {
    setAnalysisOpen(false);
  }, []);

  if (state.loading) {
    return (
      <div style={{ ...centerStyle, width: boardWidth, color: colors.subtle }}>
        Loading game…
      </div>
    );
  }

  if (state.error || !state.game) {
    return (
      <div style={{ ...centerStyle, width: boardWidth, color: colors.error }}>
        {state.error ?? 'Game unavailable.'}
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            style={buttonStyle(colors, 'ghost')}
          >
            Back
          </button>
        )}
      </div>
    );
  }

  const { game } = state;
  const training = state.mode === 'train';

  const customArrows =
    state.expectedUci && (state.feedback === 'incorrect')
      ? [
          [
            state.expectedUci.slice(0, 2),
            state.expectedUci.slice(2, 4),
            colors.primary,
          ],
        ]
      : [];

  const draggable = training && !state.complete;

  return (
    <ThemeProvider theme={theme}>
      <div style={{ ...columnStyle, width: boardWidth, color: colors.text }}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600 }}>
            {(game.white ?? 'White')} vs {(game.black ?? 'Black')}
          </span>
          {game.result && <span style={{ color: colors.subtle }}>{game.result}</span>}
        </div>

        <ChessboardDnDProvider>
          <HighlightChessboard
            boardWidth={boardWidth}
            checkSquare=""
            hintSquare={null}
            incorrectMoveSquare={null}
            position={state.fen}
            boardOrientation={boardOrientation}
            arePiecesDraggable={draggable}
            isDraggablePiece={({ piece }: { piece: string }) => {
              if (state.trainColor === 'white') return piece[0] === 'w';
              if (state.trainColor === 'black') return piece[0] === 'b';
              return piece[0] === state.trainSide;
            }}
            onPieceDrop={(source: string, target: string, piece: string) =>
              state.handleDrop(source, target, piece)
            }
            customArrows={customArrows}
            autoPromoteToQueen
            areArrowsAllowed={false}
            customBoardStyle={{ borderRadius: 4 }}
          />
        </ChessboardDnDProvider>

        <div style={{ ...navRowStyle }}>
          <button
            type="button"
            onClick={state.goFirst}
            disabled={!state.canPrev}
            style={buttonStyle(colors, 'nav')}
            aria-label="First move"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={state.goPrev}
            disabled={!state.canPrev}
            style={buttonStyle(colors, 'nav')}
            aria-label="Previous move"
          >
            ◀
          </button>
          <input
            type="range"
            min={0}
            max={state.total}
            value={state.plyIndex}
            onChange={(e) => state.goTo(Number(e.target.value))}
            style={{ flex: 1 }}
            aria-label="Scrub through game"
          />
          <button
            type="button"
            onClick={state.goNext}
            disabled={!state.canNext}
            style={buttonStyle(colors, 'nav')}
            aria-label="Next move"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={state.goLast}
            disabled={!state.canNext}
            style={buttonStyle(colors, 'nav')}
            aria-label="Last move"
          >
            ⏭
          </button>
        </div>

        <div style={{ color: colors.subtle, fontSize: 13, textAlign: 'center' }}>
          Half move {Math.min(state.plyIndex + (state.complete ? 0 : 1), state.total)} of{' '}
          {state.total}
          {training && !state.complete && (
            <>
              {` · ${TRAIN_COLOR_LABEL[state.trainColor]}`}
              {state.trainColor === 'both'
                ? ` · ${state.trainSide === 'b' ? 'Black' : 'White'} to move`
                : state.isUserTurn
                  ? ' · Your move'
                  : ' · Opponent replying…'}
            </>
          )}
        </div>

        <div style={controlsRowStyle}>
          <button
            type="button"
            onClick={openAnalysis}
            style={buttonStyle(colors, 'primary')}
          >
            Analyze
          </button>

          {!training && (
            <>
              <button
                type="button"
                onClick={() => state.startTraining('white')}
                disabled={state.complete}
                style={buttonStyle(colors, 'primary')}
              >
                Train White
              </button>
              <button
                type="button"
                onClick={() => state.startTraining('black')}
                disabled={state.complete}
                style={buttonStyle(colors, 'primary')}
              >
                Train Black
              </button>
              <button
                type="button"
                onClick={() => state.startTraining('both')}
                disabled={state.complete}
                style={buttonStyle(colors, 'primary')}
              >
                Train Both
              </button>
            </>
          )}

          {training && (
            <>
              <button
                type="button"
                onClick={state.revealMove}
                disabled={state.complete || !state.isUserTurn}
                style={buttonStyle(colors, 'ghost')}
              >
                Show move
              </button>
              <button
                type="button"
                onClick={state.stopTraining}
                style={buttonStyle(colors, 'ghost')}
              >
                Stop drilling
              </button>
            </>
          )}

          {onExit && (
            <button type="button" onClick={onExit} style={buttonStyle(colors, 'ghost')}>
              Exit
            </button>
          )}
        </div>

        <div style={{ minHeight: 24, textAlign: 'center' }}>
          {state.complete && training && (
            <span style={{ color: colors.success, fontWeight: 600 }}>
              End of game — drill complete
            </span>
          )}
          {!state.complete && state.feedback === 'correct' && (
            <span style={{ color: colors.success, fontWeight: 600 }}>Correct</span>
          )}
          {!state.complete && state.feedback === 'incorrect' && (
            <span style={{ color: colors.error, fontWeight: 600 }}>
              Best was {state.expectedSan}
            </span>
          )}
        </div>
      </div>

      {analysisOpen && analysisSnapshot && (
        <AnalysisErrorBoundary onClose={closeAnalysis}>
          <AnalysisBoard
            analysisContext={analysisSnapshot}
            onClose={closeAnalysis}
            theme={theme}
            engine={engine}
          />
        </AnalysisErrorBoundary>
      )}
    </ThemeProvider>
  );
};

const columnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const centerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  minHeight: 200,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  fontSize: 14,
};

const navRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const controlsRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  justifyContent: 'center',
};

type ButtonVariant = 'primary' | 'ghost' | 'nav';

const buttonStyle = (
  colors: ReturnType<typeof palette>,
  variant: ButtonVariant,
): React.CSSProperties => {
  const base: React.CSSProperties = {
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
    return { ...base, background: colors.primary, borderColor: colors.primary, color: '#fff' };
  }
  return base;
};
