// A working gta6-cover-art-01 entry (Node 22, standard library only): the app is this directory's app/ folder, plain
// static files a desktop browser loads offline (app/index.html and its ES modules, no library and no network
// request), and the program hands it in. It copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library. Only the plumbing, not the
// cover art the bounty asks for: Cover Snap, a plain one-photo square cover with a sunset tint and a bold caption,
// exported as a 1080 x 1080 PNG. Its two sample photos (app/samples/) were made for make.fun with an image model and
// are free to use. Build your own GTA-style cover maker in its place, put your 3 or 4 PNG or JPEG screenshots in
// screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// Vice Panels hand-in checks, added for this entry: before anything is copied, the repository is
// checked against the shape the scorer demands — an app/index.html, 3 or 4 screenshots of at most
// 256 KiB each, and the vendored library in place — so a malformed entry fails here with a plain
// reason instead of at the gate. After the dossier is written, one summary line reports what was
// handed in. Neither step changes a byte of the output; the dossier options below are the starter's.
const SCREENSHOT_MAX_BYTES = 262144;

function assertEntryShape(root: string): { appFiles: number; screenshots: string[] } {
  const appDir = join(root, 'app');
  if (!existsSync(join(appDir, 'index.html'))) throw new Error('app/index.html is missing');
  if (!existsSync(join(root, 'vendor', 'makefun-app.ts'))) throw new Error('vendor/makefun-app.ts is missing');
  const appFiles = readdirSync(appDir, { recursive: true }).length;
  const shotsDir = join(root, 'screenshots');
  const screenshots = existsSync(shotsDir)
    ? readdirSync(shotsDir).filter((name) => !name.startsWith('.')).sort()
    : [];
  if (screenshots.length < 3 || screenshots.length > 4) {
    throw new Error(`screenshots/ holds ${screenshots.length} images; the gate takes 3 or 4`);
  }
  for (const name of screenshots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > SCREENSHOT_MAX_BYTES) throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
  }
  return { appFiles, screenshots };
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const shape = assertEntryShape(here);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(
  `vice-panels: handed in ${shape.appFiles} app entries and ${shape.screenshots.length} screenshots ` +
    `(${shape.screenshots.join(', ')}); dossier.json is ${Buffer.byteLength(dossier)} bytes`,
);
