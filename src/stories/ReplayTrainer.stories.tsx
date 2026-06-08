import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ReplayTrainer } from '../features/replay/ReplayTrainer';
import {
  fetchMorphyOperaGame,
  morphyOperaGame,
} from './fixtures/morphyOperaGame';

const meta: Meta<typeof ReplayTrainer> = {
  title: 'Replay/ReplayTrainer',
  component: ReplayTrainer,
  parameters: {
    docs: {
      description: {
        component:
          'Browse Morphy’s Opera Game, drill moves from any point, and report misses. Engine analysis is disabled in Storybook by default.',
      },
    },
  },
  args: {
    gameId: morphyOperaGame.gameId,
    fetchGame: fetchMorphyOperaGame,
    theme: 'dark',
    engine: { enabled: false },
    onMiss: fn(),
    onComplete: fn(),
    onExit: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof ReplayTrainer>;

/** Morphy’s Opera Game (1858) — classic queen-side mating attack. */
export const MorphyOperaGame: Story = {};

export const LightTheme: Story = {
  args: {
    theme: 'light',
  },
};

/** Opens just before Black’s …Qe6, with White ready to play Rd1. */
export const MidgameAttack: Story = {
  args: {
    startFen:
      '4kb1r/p2rqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR4 b k - 1 14',
  },
};

export const BrowseOnly: Story = {
  args: {
    onMiss: undefined,
    onComplete: undefined,
    onExit: undefined,
  },
};
