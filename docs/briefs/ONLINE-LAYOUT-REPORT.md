# REPORT ONLINE-LAYOUT · Status: done

Date: 2026-10-23, 03:13 WAT (UTC+01:00)
Owner: Hermes (ChatGPT), The Boost Nation
Brief: `docs/briefs/ONLINE-LAYOUT.md`, including ROUND 2.
Repository: `/Users/mac/Documents/PROJECTS/mad-settings`
Branch: `release-games` · HEAD: `3714735` · changes remain uncommitted.

## DID

- Kept and re-verified the existing Tic-Tac-Toe, Connect 4 and shell work, then finished the remaining online layouts.
- While a GameShell online match is playing, replaced the large room bar and mode tabs with a slim room-code / online-count / back line. Kept the normal lobby, waiting and results presentation outside a playing match.
- Moved the existing server-offset countdown into the active player's strip, at 32×32 pixels. Preserved its accessible timer label, server deadline, sound and urgent-state behavior; did not create timers for simultaneous games.
- Removed repeated player-name / turn panels in online Tic-Tac-Toe, Connect 4, Dots, Ayo, Whot, Ocho, Ten Ten, Same and Race. Kept compact game-specific scores, lives, seed or instruction text. Also compacted the separate TriviaOnline view used by the trivia route.
- Applied Whot/Ocho overrides only inside their online wrappers; shared card-table CSS, solo views and 3D renderers were not modified. Explicit Tailwind important modifiers prevent unlayered card-table CSS from restoring the removed boxes.
- Kept real inputs and actions: Same word submission, labelled Ten Ten direction buttons, and numeric-keyboard score entry for Race. No rules, backend functions, dependencies or scoring changes.
- Finished the Playwright harness using the real `button[role="tab"]` PLAY CAMPERS markup, rather than assuming a `div` tab. It uses two independent mobile contexts with distinct `mad-settings-chess-id` and `mad-settings-player` values, creates/joins a room through the UI, and starts each match through the invite/join UI.
- Removed the fixed `layout-failure-host.png` and `layout-failure-guest.png` screenshots after the complete successful run. Historical failed attempts remain in the evidence JSON for traceability; the latest run is the final passing one.

Application files changed:

- `src/components/arcade/GameShell.tsx`
- `src/components/games/EndlessTicTacToe.tsx`
- `src/components/games/Connect4.tsx`
- `src/components/games/DotsAndBoxes.tsx`
- `src/components/games/Ayo.tsx`
- `src/components/games/Whot.tsx`
- `src/components/games/Ocho.tsx`
- `src/components/games/TenTen.tsx`
- `src/components/games/SameOnline.tsx`
- `src/components/games/RaceOnline.tsx`
- `src/components/games/TriviaOnline.tsx`

The application diff is confined to the shell and online UI portions of these files. Test scripts, screenshots, logs and this report are additional verification artifacts under `docs/briefs/`.

## EVIDENCE

### Final real-browser run

Command: `python3 -u docs/briefs/online-layout-browser.py`

- Exit code: 0.
- Existing frontend: `http://localhost:3000`; no second server was started and no server was stopped.
- Latest run started: `2026-10-23T03:10:03+0100`.
- Two distinct browser profiles; viewport 375×812, touch-enabled mobile Chromium.
- Room `5LT3` created and joined through the UI; closed through the backend and read back as closed after testing.
- All 15 GameShell online routes registered in `src/lib/rules/index.ts` passed, covering all of the brief's online components and every shared Race route.
- 45 board-state measurements and 45 corresponding game screenshots. Every screenshot's PNG dimensions were independently checked as 375×812.
- Every measurement asserts nonempty board geometry, top >= 0, bottom <= 812, left >= 0, right <= 375, document width <= 375 and scrollY == 0. Visible board buttons/inputs are also checked for clipping. Card-name/turn duplicates are checked as hidden.
- All timed-game rings were inside the active player's strip and measured 32×32. The active seat was verified against the actual server turn.
- No browser page errors in the final run. No room-cleanup error.
- Greatest measured bottom across all 45 states, including waiting peers and post-action states: 718.3125 pixels, below the 812-pixel viewport limit.

| Online route | Start: active player or simultaneous player, bottom px | Largest bottom across tested states, px | Screenshot |
| --- | ---: | ---: | --- |
| tictactoe | 535 | 549 | `shots/layout-tictactoe.png` |
| connect4 | 604 | 618 | `shots/layout-connect4.png` |
| dots | 535 | 549 | `shots/layout-dots.png` |
| ayo | 636 | 650 | `shots/layout-ayo.png` |
| whot | 704.3125 | 718.3125 | `shots/layout-whot.png` |
| ocho | 704.3125 | 718.3125 | `shots/layout-ocho.png` |
| tenten | 444 | 444 | `shots/layout-tenten.png` |
| same | 428 | 428 | `shots/layout-same.png` |
| trivia | 484 | 484 | `shots/layout-trivia.png` |
| minesweeper | 412 | 412 | `shots/layout-minesweeper.png` |
| chopchop | 412 | 412 | `shots/layout-chopchop.png` |
| puzzles | 412 | 412 | `shots/layout-puzzles.png` |
| search | 412 | 412 | `shots/layout-search.png` |
| vault | 412 | 412 | `shots/layout-vault.png` |
| bingo | 412 | 412 | `shots/layout-bingo.png` |

Screenshot paths in this table are relative to `docs/briefs/`. Each route also has a `layout-<game>-peer.png` screenshot. Post-action screenshots are listed in the evidence JSON.

Real interactions additionally checked:

- Tic-Tac-Toe move replicated to the other context; timer moved to seat 1; the new active board still fit.
- Dots line tap changed the turn and the new active board still fit.
- Whot and Ocho market draws changed the turn; both the next active board and the drawing player's updated hand fit.
- Ten Ten direction picks reached the server; the reveal and score `[0, 1]` were read back; the reveal panel fit.
- Same word `tree` was submitted and read back from the server; the submitted view fit.
- Trivia advanced to the next question after a real answer tap.
- Each shared Race route accepted a score of 0; the server returned the submitting player's score and a hidden-score finished marker; its submitted view fit.
- Waiting/join, persistent mute across reload, resuming the live match, two-step resign, results, restored mode tabs, rematch round 2 and back to the lobby all passed. Each game's resign result was read back from the server.

Canonical evidence:

- `docs/briefs/online-layout-browser.py` — reproducible real-browser checks; no mocks or new runtime dependencies.
- `docs/briefs/shots/online-layout-evidence.json` — exact rectangles, state labels, screenshot paths, lifecycle results and final successful run.
- `docs/briefs/online-layout-verification.log` — complete final 15-route browser stdout.
- `docs/briefs/shots/layout-results.png` — result-screen evidence.

### Static checks and production build

- `npx tsc --noEmit -p .` — exit 0.
- `git diff --check` — exit 0.
- ESLint on all 11 changed application files — exit 0; no errors, two existing unused-helper warnings (`Grid` and `Board`).
- `npm run build` — exit 0; Next.js 16.3.6 compiled successfully, TypeScript completed, and 24 static pages were generated. Next emitted its existing warning about `/Users/mac/package-lock.json` being outside the Git repository; that unrelated configuration was not changed.
- Raw output: `docs/briefs/online-layout-build.log`.

Additional full-repository check: `npm run lint` exits 1 with 15 errors and 18 warnings. The error files are unchanged from HEAD: `camp3d/CampPeople.tsx`, `camp3d/CampScene.tsx`, `camp3d/CampWorld.tsx` and `games/ayo3d/AyoBoard3D.tsx`. Existing React hook / Three.js diagnostics are outside this brief's edit scope. Full diagnostics: `docs/briefs/online-layout-lint.log`. This is NOT a full-repository lint pass.

## DONE WHEN

- ✅ The whole board container fits at 375×812 for the active player in every timed online route and both players in simultaneous modes: all 15 routes, 45 passing measurements, matching screenshots.
- ✅ Slim playing-match room/navigation line and embedded countdown ring: DOM assertions plus per-route screenshots.
- ✅ Redundant online player/turn boxes removed without changing solo rendering or shared board implementations: scoped diff and card-label visibility assertions.
- ✅ Lobby, waiting/join, results, rematch, resign and mute still work: real two-context lifecycle checks.
- ✅ `npx tsc --noEmit -p .` and `npm run build` both exit 0.
- ✅ ROUND 2 completed: Connect 4 and every remaining listed component verified, fixed failure screenshots deleted, report saved here.
- ✅ Stayed on `release-games` at `3714735`; no commits, branch switches, new dependencies, rules/server changes or production deployment. Existing port-3000 server still returned HTTP 200 at final verification.
- ❌ Optional broader check, not a DONE WHEN requirement: repository-wide lint is not clean because of the unchanged errors listed above.

## QUESTIONS

No decision is needed to complete this local layout brief.

Verification boundary: these are real two-player initial-round and selected post-action layout checks, not exhaustive gameplay/endgame tests, arbitrary accumulated card-hand sizes, 3–4-player layouts, physical-phone tests or reduced-motion/WebGL-fallback certification. Connect 4 and Ayo used their existing real canvas renderers; only their container fit was asserted. The pre-existing Ten Ten reveal/winner presentation and 3D fallback concerns were not redesigned under this layout-only brief. Chess uses its separate online system and is not part of the brief's XOnline/GameShell registry.

No release, production deployment or additional backend change is authorized or claimed.

## LESSON

Inspect actual roles and accessible labels before writing selectors: PLAY CAMPERS is a button with role `tab`, and Dots coordinates are one-based. Wait for hydration rather than interpreting a short locator timeout as a missing feature. Scope card-table overrides to online wrappers and account for unlayered CSS precedence. Prove phone fit with actual rectangles and visible-control bounds on both independent players, not with a full-page screenshot or a single successful game.
