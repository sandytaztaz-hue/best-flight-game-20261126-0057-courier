// SKY COURIER — make.fun entry program (Node 22, standard library only).
// Copies game/ and screenshots/ from beside this file to the output directory
// and writes /output/dossier.json with the vendored make.fun library.
// Output dir resolution: MAKEFUN_OUTPUT_DIR env, then --output <dir>, then /output.
// Run locally:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//           or: node main.ts --output out

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

function parseOutputDir(argv) {
  const flag = argv.indexOf('--output');
  if (flag >= 0 && argv[flag + 1]) return argv[flag + 1];
  const eq = argv.find((a) => a.startsWith('--output='));
  if (eq) return eq.slice('--output='.length);
  return null;
}

const out = process.env.MAKEFUN_OUTPUT_DIR ?? parseOutputDir(process.argv.slice(2)) ?? '/output';

// The entry is static files only: no build step, no network, no dependencies.
// Anything missing here is a hard failure rather than a silent partial entry.
if (!existsSync(join(here, 'game', 'index.html'))) {
  console.error('SKY COURIER: game/index.html not found beside main.ts');
  process.exit(1);
}
if (!existsSync(join(here, 'game'))) {
  console.error('SKY COURIER: game/ not found beside main.ts');
  process.exit(1);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or
// one over 256 KiB; more than 993 files in game/ or 48 MiB of game files, in all,
// or a path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log('SKY COURIER: wrote ' + out + '/dossier.json');
