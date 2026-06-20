import { useCallback, useState, type ReactNode } from 'react';
import {
  AnalysisBoard,
  AnalysisErrorBoundary,
  HighlightChessboard,
  PlyNavigation,
  ThemeProvider,
  ChessboardDnDProvider,
  DEFAULT_ANSWER_ARROW_COLOR,
  type AnalysisContext,
  type AnalysisEngineOptions,
  type BoardThemeId,
  type PlyNavigationRenderProps,
} from 'react-chess-core';
import { buildReplayAnalysisContext } from './buildReplayAnalysisContext';
import { DEFAULT_BOARD_WIDTH } from './constants';
import { useReplayTrainer } from './hooks/useReplayTrainer';
import {
  TRAIN_COLOR_LABEL,
  buttonStyle,
  centerContainerStyle,
  controlsRowStyle,
  customBoardStyle,
  feedbackContainerStyle,
  feedbackMessageStyle,
  headerStyle,
  mainContainerStyle,
  palette,
  playerNameStyle,
  statusLineStyle,
  subtleTextStyle,
} from './replayTrainerStyles';
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
  boardTheme?: BoardThemeId;
  boardWidth?: number;
  /** Side shown at the bottom of the board. Defaults to white. */
  orientation?: 'white' | 'black';
  /** Stockfish options for the built-in analysis board. Set `enabled: false` to hide engine lines. */
  engine?: AnalysisEngineOptions;
  /** Custom ply navigation UI (e.g. MUI). Omit for the core default with scrubber. */
  renderPlyNavigation?: (props: PlyNavigationRenderProps) => ReactNode;
  /** Range scrubber on ply navigation. Default true. */
  showPlyScrubber?: boolean;
}

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
  boardTheme,
  boardWidth = DEFAULT_BOARD_WIDTH,
  orientation = 'white',
  engine,
  renderPlyNavigation,
  showPlyScrubber = true,
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
    state.stopAutoplay();
    setAnalysisSnapshot(
      buildReplayAnalysisContext(state.game, state.plyIndex, boardOrientation),
    );
    setAnalysisOpen(true);
  }, [state.game, state.plyIndex, boardOrientation, state.stopAutoplay]);

  const closeAnalysis = useCallback(() => {
    setAnalysisOpen(false);
  }, []);

  if (state.loading) {
    return (
      <div style={centerContainerStyle(boardWidth, colors.subtle)}>
        Loading game…
      </div>
    );
  }

  if (state.error || !state.game) {
    return (
      <div style={centerContainerStyle(boardWidth, colors.error)}>
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
            DEFAULT_ANSWER_ARROW_COLOR,
          ],
        ]
      : [];

  const draggable = training && !state.complete;

  return (
    <ThemeProvider theme={theme} boardTheme={boardTheme}>
      <div style={mainContainerStyle(boardWidth, colors)}>
        <div style={headerStyle}>
          <span style={playerNameStyle}>
            {(game.white ?? 'White')} vs {(game.black ?? 'Black')}
          </span>
          {game.result && <span style={subtleTextStyle(colors)}>{game.result}</span>}
        </div>

        <ChessboardDnDProvider>
          <HighlightChessboard
            boardWidth={boardWidth}
            checkSquare=""
            hintSquare={null}
            incorrectMoveSquare={state.incorrectMoveSquare}
            correctMoveSquare={state.correctMoveSquare}
            position={state.displayFen}
            boardOrientation={boardOrientation}
            arePiecesDraggable={
              draggable &&
              !state.correctMoveSquare &&
              !state.incorrectMoveSquare
            }
            isDraggablePiece={({ piece }: { piece: string }) => {
              if (state.trainColor === 'white') return piece[0] === 'w';
              if (state.trainColor === 'black') return piece[0] === 'b';
              return piece[0] === state.sideToMove;
            }}
            onPieceDrop={(source: string, target: string, piece: string) =>
              state.handleDrop(source, target, piece)
            }
            customArrows={customArrows}
            lastMoveUci={state.lastMoveUci}
            promotionDialogVariant="modal"
            areArrowsAllowed={false}
            customBoardStyle={customBoardStyle}
          />
        </ChessboardDnDProvider>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <PlyNavigation
            plyIndex={state.plyIndex}
            totalPly={state.totalPly}
            canPrev={state.canPrev}
            canNext={state.canNext}
            onGoFirst={state.goFirst}
            onGoPrev={state.goPrev}
            onGoNext={state.goNext}
            onGoLast={state.goLast}
            onGoTo={state.goTo}
            theme={theme}
            showScrubber={showPlyScrubber}
            renderPlyNavigation={renderPlyNavigation}
          />
          <button
            type="button"
            onClick={state.toggleAutoplay}
            disabled={!state.autoplayActive && !state.canNext}
            style={buttonStyle(colors, state.autoplayActive ? 'ghost' : 'primary')}
            aria-label={state.autoplayActive ? 'Stop autoplay' : 'Autoplay game'}
          >
            {state.autoplayActive ? 'Stop' : 'Play'}
          </button>
        </div>

        <div style={statusLineStyle(colors)}>
          Half move {Math.min(state.plyIndex + (state.complete ? 0 : 1), state.totalPly)} of{' '}
          {state.totalPly}
          {training && !state.complete && (
            <>
              {` · ${TRAIN_COLOR_LABEL[state.trainColor]}`}
              {state.trainColor === 'both'
                ? ` · ${state.sideToMove === 'b' ? 'Black' : 'White'} to move`
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

        <div style={feedbackContainerStyle}>
          {state.complete && training && (
            <span style={feedbackMessageStyle(colors, 'success')}>
              End of game — drill complete
            </span>
          )}
          {!state.complete && state.feedback === 'correct' && (
            <span style={feedbackMessageStyle(colors, 'success')}>Correct</span>
          )}
          {!state.complete && state.feedback === 'incorrect' && (
            <span style={feedbackMessageStyle(colors, 'error')}>
              Game move was {state.expectedSan}
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
