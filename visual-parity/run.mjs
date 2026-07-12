// [RUN] Convenience orchestrator: capture both targets, then compare.
// Assumes the candidate Next.js server is already running (CANDIDATE_BASE).
// Legacy brings up its own static server inside capture.mjs.
//
//   node run.mjs
//
// For finer control run the three steps yourself:
//   node capture.mjs --target=legacy
//   node capture.mjs --target=candidate
//   node compare.mjs

import { spawn } from 'node:child_process';

function step(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 || code === 1 ? resolve(code) : reject(new Error(`${args.join(' ')} exited ${code}`))));
    p.on('error', reject);
  });
}

const node = process.execPath;
await step(node, ['capture.mjs', '--target=legacy']);
await step(node, ['capture.mjs', '--target=candidate']);
const cmp = await step(node, ['compare.mjs']);
process.exit(cmp);
