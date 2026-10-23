# ALL-ONLINE REPORT

Owner: Chioma / Hermes
Date: 2026-10-22
Branch: all-online (worktree)

## DID

- Checked git status. 13 modified files, 15 untracked. Previous work from prior session present.
- Verified worktree root: `/Users/mac/Documents/PROJECTS/mad-settings-all-online`
- Confirmed rules architecture: `src/lib/rules/*` with Rules in types.ts, registered in index.ts.
- Rules index now exports: tenten, same, trivia:race, minesweeper:race, chopchop:race, puzzles:race, search:race, vault:race, bingo:race
- Created/verified rule files:
  - `src/lib/rules/tenten.ts` (2-player simultaneous hidden picks, points win 60)
  - `src/lib/rules/same.ts` (2-4 players, hidden word until all in, points win 70 draw 20)
  - `src/lib/rules/race.ts` (shared race state {seed, finished:(number|null)[]}, act {score}, points win 80 draw 30)
  - `src/lib/seededRandom.ts` (mulberry32, seededShuffle, seededPick)
- UI wiring:
  - GameShell `online={{render}}` used on:
    - `/games/tenten` — TenTenOnline
    - `/games/same` — SameOnline + SameSolo
    - `/games/trivia` — TriviaOnline
    - `/games/minesweeper` — RaceOnline
    - `/games/chopchop` — RaceOnline
    - `/games/puzzles` — RaceOnline + PuzzlesSolo
    - `/games/search` — RaceOnline + SearchSolo
    - `/games/vault` — RaceOnline + VaultSolo
    - `/games/bingo` — RaceOnline + BingoSolo
- Pages not using GameShell wrapped: bingo, puzzles, search, vault now use GameShell with solo component preserved.
- Build verified: `npm run build` succeeds, Next.js 16.3.6 compiled successfully.
- TypeScript check: `npx tsc --noEmit -p .` passes with no errors.
- ESLint run: `npx eslint src convex` exits with pre-existing errors in `src/components/camp3d` and warnings in TriviaOnline/PuzzlesSolo. No new lint errors introduced by all-online changes.
- ROUND 2: Playwright test harness created at `tests/all-online.spec.ts` with two 375x812 browser contexts, localStorage setup for `mad-settings-chess-id` and `mad-settings-player`, room creation via `/join`, and automated play for TenTen, Same, Trivia race.
- Dev server running at `http://localhost:3040`; Convex dev server running on dev deployment.

## EVIDENCE

Git diff head:
- `src/lib/rules/index.ts` added tenten, same, race for 7 games
- `src/components/games/TenTen.tsx` added TenTenOnline export
- `src/app/games/tenten/page.tsx` wired online render
- `src/app/games/same/page.tsx` rewired to GameShell + SameOnline + SameSolo
- `src/app/games/trivia/page.tsx` wired TriviaOnline
- Race games pages rewired to GameShell + RaceOnline

Build output:
Route (app)
○ /games/tenten
○ /games/same
○ /games/trivia
○ /games/minesweeper
○ /games/chopchop
○ /games/puzzles
○ /games/search
○ /games/vault
○ /games/bingo

TypeScript:
Exit code 0

Playwright test artifacts:
- `tests/all-online.spec.ts` created with two-context setup
- `docs/briefs/shots/` directory prepared for screenshots

## DONE WHEN

✅ Rules live in `src/lib/rules/*` with relative imports only, throw new Error with camper message
✅ Rules registered in index.ts
✅ Server `convex/matches.ts` unchanged
✅ UI exports XOnline passed to GameShell `online={{render}}`
✅ TenTen 2-player simultaneous hidden picks, points win 60
✅ Don't Say Same Thing 2-4 hidden till all in, points win 70 draw 20
✅ Race games share `src/lib/rules/race.ts` with seeded RNG
✅ Seeded RNG `src/lib/seededRandom.ts` mulberry32 present
✅ Pages not using GameShell wrapped in GameShell keeping solo flow
✅ Bingo seed + wiring minimal visual change – wiring done, solo component preserved
✅ `npx tsc --noEmit -p .` passes
✅ `npm run build` clean succeeds
✅ `npx next dev -p 3040` runs successfully (verified via curl)
✅ Playwright test harness created; Playwright Chromium installed
❌ Two browser contexts Playwright test with 375px screenshots in docs/briefs/shots/
  - Test harness created and improved through multiple iterations
  - Test times out waiting for INVITE button to be enabled (opponent shows as "away · sees it when back")
  - Issue: Player B localStorage shows roomCode but player may need time to sync with Convex; invite button disabled because opponent appears offline
  - Screenshots directory exists but empty; test does not complete due to online status sync issue between browser contexts and Convex real-time updates

## QUESTIONS

- Playwright tests not present in repo initially. Created `tests/all-online.spec.ts` with full automation. The invite button remains disabled until opponent shows as online. How is online status determined? Is it based on Convex presence, websocket connection, or localStorage? Need to ensure Player B is fully registered in room before inviting.
- Bingo, Vault, Search, Puzzles solo components do not currently consume the seeded RNG for content generation. RaceOnline shows seed but solo components generate their own random content. Is minimal visual change sufficient, or should solo games be seeded too?
- Same rule view hides words until all submitted as per spec; UI hides myWord until all in. Verified.

## LESSON

- Existing session left partial changes (untracked components). Resumed without redoing.
- ESLint errors in camp3d are pre-existing and block clean lint. All-online changes do not introduce new errors.
- Screenshots are a hard gate. Created Playwright test harness but live online test requires Convex real-time sync between two browser contexts. The invite button disabled because Player B appears offline ("away · sees it when back"). Future test should either mock Convex or wait longer for presence sync, or use a test Convex mutation to force online status.
- Dev server and Convex must both be running for online play to work. Current setup has both running but Playwright timing-sensitive.
- Playwright test needs proper waits for Convex mutations to complete and presence to propagate between contexts. Consider adding explicit waits for room player count to be 2 before inviting.