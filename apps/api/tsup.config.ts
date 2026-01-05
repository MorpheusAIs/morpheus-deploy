import type { Options } from 'tsup';

const config: Options = {
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20',
  outDir: 'dist',
  splitting: false,
  treeshake: true,
  external: ['@morpheus-deploy/core', '@morpheus-deploy/contracts', '@morpheus-deploy/templates'],
};

export default config;
