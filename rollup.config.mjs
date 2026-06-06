import { createRequire } from 'node:module';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        exports: 'auto',
      },
      {
        file: pkg.module,
        format: 'esm',
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve({ extensions: ['.ts', '.tsx', '.js', '.jsx'] }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
    ],
    external: [
      'react',
      'react-dom',
      'react-chessboard',
      'chess.js',
      'react-chess-core',
    ],
  },
];
