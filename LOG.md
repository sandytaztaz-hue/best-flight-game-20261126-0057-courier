# LOG — Sky Courier rebuild (best-flight-game-20261126-0057-courier)

## Context
- Comp: best-flight-game-20261126-0057 "Make the best flight game", FREE, $500 top-50, deadline Nov 28 09:57 WIT, blind round 1 closes Nov 26 21:57 WIT.
- Live entry "Real Falcon — Ace Combat Run" (sub 01a21611, commit 750d4c4c, repo ...-realistic) is combat. Sand 13:24 WIT: "Makin parah dong bro, Ganti konsep samain kya Top 1-10". Field is dominated by courier/ring-run games; judge criteria literally ask for "a runway or a target ring ahead", which courier has naturally.
- Sand gassed the courier concept 13:28 WIT ("Gas coba bro Liatin ke gw dlu") — PRESENT-FIRST, show screenshots before any submit. This rebuild REPLACES the live entry (Force_Last) only after he approves.
- Judge criteria (comp detail, read 13:25 WIT): AI judge compares games pairwise by SCREENSHOTS + source outline, ranks by pick rate. Every screenshot MUST show: cockpit or chase view over recognisable terrain, aircraft in frame with instruments lit, a runway or a target ring ahead, altitude/speed/heading on HUD. Complete original game, static files, keyboard+mouse, 3-4 real screenshots + dossier.

## Coordinator setup (13:30 WIT)
- Quota checked live: can_submit TRUE, day cap 6, taken 1, left 5.
- gh auth live as sandytaztaz-hue.
- Kit dir: ~/workspace/makefun/best-flight-game-20261126-0057-kit/best-flight-game-20261126-0057-kit. Node 22 binary: ~/workspace/makefun/github-core-clone-01/node-v22.21.1-linux-x64/bin/node (v22.21.1).
- Badge template + pipeline carried over from Build D LOG (process details only — writer never reads old code).
- Writer spawned 13:30 WIT (session 701ef791) with full prose brief: Sky Courier concept (pilot Raka "Merpati", home strip Pulau Kenari, 6 legs, 5 named regulars + Inspector Halim VIP, ring-gate combo mechanic, 6+ upgrades, weather, 3 save slots, dense frames, realistic media-tool assets, 4 staged screenshots, playtest all-pass, main.ts stdlib-only exit 0, fresh repo best-flight-game-20261126-0057-courier, README exact badge template, owner.json both locations, LICENSE SPDX, vendor/makefun-game.ts unchanged from kit).
- Writer does NOT bundle and does NOT submit. Coordinator does parent-finish after writer returns: kit-check via kit-check-quiet.sh, session-file bundle (direct, no recorder), verify, report screenshots + commit + bundle to parent.

## Progress
- 13:30 WIT: writer spawned, awaiting build.
- 13:44 WIT: writer COMPLETED (session 701ef791). Build: Raka "Merpati", 6 legs, 5 named islanders + Insp. Halim, ring combo x2.5, 6 upgrades, 4 weather states, 3 save slots, WebAudio synth, 8 photorealistic assets. Playtest 28/28 PASS. main.ts exit 0 (two output dirs), serve.mjs HTTP 200. Screenshots 144,306 / 184,180 / 211,755 / 166,868 B, all <256 KiB. BLOCKER: no commit — writer's git command tripped an execution-risk flag; repo created (https://github.com/sandytaztaz-hue/best-flight-game-20261126-0057-courier) but EMPTY; all files staged locally.
- 13:45 WIT: coordinator read all 4 screenshots full-size. Shot 1 (cockpit) CLEAN. Shot 4 (home base) CLEAN, dense, all labels inside boxes. DEFECTS: shot 2 "RING 123 m" label partly hidden behind plane's rear float; shot 3 "RING ... m" label almost entirely hidden behind the plane's wing (only fragments visible); shot 3 "THR" label possibly clipped at right edge. Fix worker spawned 13:45 WIT (session 08bbb31c): move RING label to a plane-proof spot, check THR, re-render shots 2-3, re-read, re-playtest, then commit ALL + push + gh repo edit About, report commit SHA. Coordinator then does kit-check + bundle + final report.
- 13:31–13:45 WIT: assets generated (8 media-tool images, photorealistic 3D-render look):
  6 backgrounds 1280x720 (archipelago, canyon, dawn fog, rain squall, island strip, hangar),
  plane hero sprite (green-screen chroma-keyed, trimmed 1100x534) + parcels sprite.
  Processed with process-assets.mjs (work-dir tooling): JPEG q72 bgs, keyed PNG sprites.
- Game written from the prose brief only (game/index.html + game/game.js, ~730 lines):
  title + 3 save slots, home base (route map + shop + 6 named people + pilot log),
  flight (chase + cockpit views, ring gates, combo x2.5, cargo weight, fuel),
  results (grade + per-leg score graph), game over. WebAudio synth SFX + menu theme.
- Render fixes found by reading my own screenshots: destOf() for leg names without "→";
  naturalWidth-only image checks (@napi-rs Image has no .complete); JPEG quality must be a
  NUMBER 0-100 in toBuffer (object form ignored — first shots were 13 KB mush); cockpit
  compact bars restructured (text line + bar line, no overlap); top-bar right text
  shrink + right-align (was clipped off-screen); pilot-log lines shortened + column widened;
  ring label below ring with dark pill; cockpit yoke removed (crossed FUEL dial);
  fog/dusk under the runway overlay, rain streaks over; markRings() in staged shots
  (labels read "RING 0 m" before).
- Playtest (playtest.mjs, headless, real game code frame-by-frame): 28/28 PASS.
  Title → base → buy Radio (120→30cr) → blocked Engine buy at 30cr → save →
  fly all 6 legs (6/6, 7/7, 7/7, 7/7, 8/8, 8/8 rings, all grade S, total 9220) →
  results graph → back to base → forced out-of-fuel → game over → base → title →
  save round-trip in a fresh instance (credits 10150 + 6 legs + radio persist).
- main.ts verification: MAKEFUN_OUTPUT_DIR=/tmp/sky-out → exit 0, dossier.json + game/ +
  screenshots/ written; --output /tmp/sky-out2 → exit 0; node serve.mjs → index/game.js/
  assets all HTTP 200. vendor/makefun-game.ts byte-identical to kit starter (sha256 dc671875…).
  Screenshots: 4 × 1280x720 JPEG, 144–212 KiB each, all < 256 KiB.
- Repo: https://github.com/sandytaztaz-hue/best-flight-game-20261126-0057-courier

## Surgical render fix — RING label vs plane sprite (2026-11-26 ~13:50 WIT)
- Defects (read all 4 shots full-size): shot 2 "RING 123 m" left edge hidden behind the
  plane's rear float; shot 3 "RING … m" almost entirely hidden behind the left wing.
  Cause: drawRing() anchored the label pill below the ring, right where the chase-view
  plane sprite (W/2, H-210, 430 wide) sits.
- Fix (game/game.js, drawRing only, ~6 lines): in chase view the label pill is pinned to a
  fixed spot centred under the radio banner (pill y 168-192, text baseline 185) — a zone
  the aircraft sprite can never reach. Cockpit view keeps the ring-anchored label, so
  shot 1 is byte-identical; shot 4 (home base) untouched.
- THR label checked, NOT fixed: pixel-measured in shot 3 — glyphs span x 1229-1247, 32 px
  inside the 1280 frame; it only looks clipped because bright palm/sky behind it washes
  out the orange. Same draw call as shot 2 (fully legible), so geometrically unclippable.
  Left untouched to keep shot 1 byte-identical.
- Re-rendered via render-shots.mjs from the repo root: shots 1 + 4 hashes unchanged
  (bde0293b… / 32d8f39c…), shots 2 + 3 re-read full-size — "RING 123 m" and "RING 0 m"
  fully legible, zero overlap, nothing else regressed.
- playtest.mjs re-run: 28/28 PASS. main.ts --output /tmp/main-out: exit 0, dossier.json written.
