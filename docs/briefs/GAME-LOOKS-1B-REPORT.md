# REPORT GAME-LOOKS-1B · Status: done

Date: 2026-10-23  
Author: Hermes (ChatGPT), The Boost Nation  
Branch: `release-games` · Local only · No commits, dependency changes or deployments

## DID

Rebuilt both shared presentational boards; vs-computer and Online exports use the same renderer. Kept the game rules, scoring, AI and public game-component props unchanged.

- **Connect 4:** upright blue plastic frame with two genuinely perforated skins, 7 × 6 open circular holes, support feet, coral `#FB7185` / purple `#6D28D9` discs, a 440 ms gravity drop plus 160 ms landing bounce, and lime `#BEF264` winning-four rings. Slight camera tilt, nearly full-width framing and full-height semantic column buttons.
- **Ayo:** carved wood geometry with procedural grain, 12 round pits and two end stores, visible low-poly pebble seeds, readable DOM pit/store counts, legal-pit glow and a 650 ms pit-to-pit sowing animation. The player's row stays nearest the camera for either seat.
- **Shared canvas:** warm orange key light with strong ambient/hemisphere/cool fill; configurable orthographic framing; DPR capped at 1.5; creation/error/context-loss fallbacks. Reduced motion retains the board but cuts moves to their end state.
- **Loading and fallback:** state-aware CSS board previews during `next/dynamic` loading and playable CSS boards when WebGL is unavailable. Kept the poster-style game shell and existing controls.

Implementation edits are limited to:

1. `src/components/three/GameCanvas.tsx`
2. `src/components/games/ayo3d/AyoBoard3D.tsx`
3. `src/components/games/connect4-3d/Connect4Board3D.tsx`
4. `src/components/games/Ayo.tsx`
5. `src/components/games/Connect4.tsx`

Other concurrent working-tree changes were left alone. Evidence and this report are saved under `docs/briefs/` as requested; test harnesses stayed outside the repository.

## EVIDENCE

### Real full games at 375 × 812

Playwright Chromium with touch enabled, against the freshly built production server on local port 3070. Moves were made through the rendered buttons against the unchanged computer opponents, not by injecting a finished state. The final acceptance run began at `2026-10-23T04:25:40+0100`.

| Game | Human moves | Observed final result | Start / mid / end screenshots |
| --- | ---: | --- | --- |
| Connect 4 | 5 | COMPUTER WINS; four adjacent bottom-row purple discs highlighted | [start](shots/c4-start.png) · [mid](shots/c4-mid.png) · [end](shots/c4-end.png) |
| Ayo | 20 | COMPUTER WINS, **6 to 26** | [start](shots/ayo-start.png) · [mid](shots/ayo-mid.png) · [end](shots/ayo-end.png) |

All six required PNGs are actual 375 × 812 captures. End states expose PLAY AGAIN and disable the board's move controls. Vision review of the final six-shot contact sheet confirmed recognizable blue-frame / wooden-board materials, readable boards and no clipping. Exact state and win verification came from DOM data, geometry and image analysis rather than the vision model's incidental narrative.

- Main machine-readable record: [game-looks-1b-evidence.json](shots/game-looks-1b-evidence.json), including actual moves, state text, screenshot paths, target bounds, fallback checks and error arrays.
- At 375 px: Connect 4 canvas **343 × 327.296875 px**, column targets at least **44.828125 px** wide; Ayo canvas **335 × 203.453125 px**, pit targets **45.203125 × 69.171875 px**. Both fit within the 812 px viewport.
- At 360 and 430 px: document width equals viewport width; no horizontal overflow; both boards remain in bounds. Minimum target width at 360 px is **44 px**. Reduced-motion moves still change real state.
- Final production acceptance: **0 uncaught page errors, 0 console errors, 0 HTTP responses ≥400**.
- Additional captures: [disc drop](shots/c4-drop.png), [seed sow](shots/ayo-sow.png), [Connect 4 WebGL-off fallback](shots/c4-fallback.png), [Ayo WebGL-off fallback](shots/ayo-fallback.png). Each WebGL-off board accepted a legal move and changed state with no canvas present.
- Image analysis of the actual `c4-end.png` found **four separate lime rings**, agreeing with the DOM board's winning bottom-row purple discs.

### Shared Online components, locally verified

[game-looks-1b-online-fixtures.json](shots/game-looks-1b-online-fixtures.json) records a backend-free fixture using the actual `AyoOnline` / `Connect4Online` exports, shared boards and unmodified rules. Only the local `act` callback and test-only dynamic-import adapter were supplied by the fixture. Production pages separately exercised real Next.js dynamic loading.

- Both seats made real rule-valid moves in both games; waiting and spectator controls were disabled.
- Ayo seat 1's six legal controls were on the lower/near row; the outgoing pit index matched that seat. [Seat 1 screenshot](shots/ayo-online-seat1.png).
- Connect 4 full columns were disabled; a winning fixture rendered exactly four lime rings. [Seat 1 screenshot](shots/c4-online-seat1.png).
- Geometry inspection: **42 actual frame holes**, all **42 hole-center rays unobstructed**, with a solid-corner ray hitting the frame. Ayo contained **14 carved openings** and **48 initial pebble meshes**.
- Frame sampling observed disc travel, a landing bounce and a moving sowing pebble. With reduced motion, the disc was immediately seated and the sowing pebble hidden.
- On a device-scale-factor-2 context, renderer DPR was **1.5**. Initial measured draw calls / triangles: Connect 4 **7 / 27,332**; Ayo **76 / 19,760**. These are desktop Chromium measurements, not a claim of physical Android frame rate.

This verifies shared Online presentation, seat mapping and callback wiring. It is **not** a live Convex room, two-device synchronization or reconnect test.

### Build and static checks

All passed after the final implementation edit:

- `npm run build` — optimized build succeeded; all 30 static pages generated.
- `npx tsc --noEmit -p .` — exit 0, no diagnostics.
- Scoped ESLint over the five implementation files — exit 0, no diagnostics.
- `git diff --check` — exit 0.

`npm run lint` was also run. Repository-wide lint is **not clean**: it reports **14 errors in the unrelated camp3d files** (`CampPeople.tsx`, `CampScene.tsx`, `CampWorld.tsx`) and **16 warnings** across the repository. Those files were not edited for this brief. The five scoped files pass lint. Next also prints the existing warning about ignoring `/Users/mac/package-lock.json` outside the Git repository; the production build succeeds.

## DONE WHEN ✅❌

- ✅ Recognizable real Connect 4 frame, round openings, visible coral/purple discs and winning-four glow — final screenshots, 42-hole ray test and four-ring checks.
- ✅ Recognizable wooden Ayo board, two rows of six pits, two stores, seeds and readable counts — screenshots and 14-opening / 48-pebble initial-scene inspection.
- ✅ Warm, readable lighting and phone-sized framing — six final screenshots and bounds checks at 360 / 375 / 430 px.
- ✅ Full vs-computer game of each — real terminal results and recorded moves above.
- ✅ Shared vs-computer / Online presentation — both seats exercised in actual Online exports locally.
- ✅ Required TypeScript and production build clean — successful commands above.
- ✅ No rule, scoring, AI, dependency, commit, branch-switch or deployment changes by this brief.

## QUESTIONS

No decision is needed to complete the local brief. Live multiplayer networking and physical mid-range Android 60 fps remain unverified; neither is claimed here. Repository-wide camp-scene lint fixes are outside this file-restricted task.

## LESSON

Model the recognizable physical object first: real holes and a blue frame for Connect 4; a lit wood surface, recessed bowls and visible pebbles for Ayo. Keep accessible DOM controls and counts independent of WebGL. Capture screenshots only after the unchanged AI delay **and** the subsequent move animation have settled. Verify material/readability visually, but verify exact state, seat mapping and winning cells from actual application data.
