// Builds two bundles:
//   dist/extension.js — extension host (Node, CommonJS)
//   dist/webview.js   — pond UI (browser, IIFE)
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

const shared = {
  bundle: true,
  minify: production,
  sourcemap: !production,
  logLevel: 'info',
};

const configs = [
  {
    ...shared,
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.js',
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['vscode'],
  },
  {
    ...shared,
    entryPoints: ['src/webview/main.ts'],
    outfile: 'dist/webview.js',
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
  },
];

if (watch) {
  for (const config of configs) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
  }
} else {
  await Promise.all(configs.map((config) => esbuild.build(config)));
}
