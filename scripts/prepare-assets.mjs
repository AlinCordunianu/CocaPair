import { mkdir, cp, copyFile } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('public/models', { recursive: true });
await copyFile('best.tflite', 'public/models/best.tflite');
await cp('node_modules/@litertjs/core/wasm', 'public/runtime', {
  recursive: true,
});
// LiteRT's WASM loader uses importScripts, so its worker must be classic.
await build({
  entryPoints: ['src/services/detector.worker.js'],
  outfile: 'public/runtime/detector-worker.js',
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: true,
});
console.log('Copied original model and local LiteRT runtime assets.');
