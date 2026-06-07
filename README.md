# react-chess-replay-trainer

A React component for replaying a chess game move-by-move and drilling it.

- **Browse** freely through the game (first / prev / next / last / jump) without
  recording anything, so you can pick the part of the game you want to study.
- **Train White / Train Black / Train Both** start a drill at the current ply:
  you guess each move, and every mistake is reported via `onMiss` so the host can
  (for example) enroll the missed position into a spaced-repetition deck.
  - With **Train White** or **Train Black** you only guess that side's moves; the
    opponent's reply is played automatically after each correct guess, and the
    board is rotated so the trained side is on the bottom.
  - With **Train Both** you drill every ply for both colors.
- **Analyze** opens the built-in analysis board (`AnalysisBoard` from
  `react-chess-core`) at the current position.

Depends on `react-chess-core` (board, engine, analysis board), `react-chessboard`,
and `chess.js`.

## Usage

```tsx
import { ReplayTrainer } from 'react-chess-replay-trainer';

<ReplayTrainer
  gameId={gameId}
  startFen={fenWhereUserWasBrowsing}
  fetchGame={fetchGame}
  onMiss={(miss) => enrollMissedPosition(miss)}
  onExit={() => setTraining(null)}
  theme="dark"
  engine={{ depth: 18, multiPv: 3 }}
/>;
```

For a custom shell, use `useReplayTrainer` with `AnalysisBoard` from the same package:

```tsx
import {
  useReplayTrainer,
  buildReplayAnalysisContext,
  AnalysisBoard,
} from 'react-chess-replay-trainer';
```
