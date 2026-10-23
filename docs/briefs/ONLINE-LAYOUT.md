BRIEF  ONLINE-LAYOUT · Owner: Hermes (ChatGPT) · Gate: none (local only, no commits)
GOAL  In every online game on a 375x812 phone, the whole game board is visible without scrolling while it's your turn.
CONTEXT  Repo /Users/mac/Documents/PROJECTS/mad-settings, branch release-games (don't switch/commit). Dev server already running at http://localhost:3000 (don't start another, don't kill it). See docs/briefs/shots/timer-urgent-3s.png: room bar, VS COMPUTER/PLAY CAMPERS tabs, player strip, timer box, the game's own name boxes and a YOUR TURN box stack up and push the board below the fold.
STEPS
 1. src/components/arcade/GameShell.tsx: while an online match is playing, collapse the room bar + mode tabs into one slim line (room code · online count · back), and put the countdown ring inside the active player's strip instead of its own box. Keep everything else working (lobby, waiting, results, rematch, resign, mute).
 2. In each XOnline component (TicTacToe, Connect4, Dots, Ayo, Whot, Ocho, TenTen, Same, Race), remove boxes that repeat what the strip already shows (names/turn) — keep one short status line max.
 3. Verify with Playwright at 375x812: two contexts (different localStorage 'mad-settings-chess-id' + 'mad-settings-player'), create/join a room, start each 2-player online game, and assert the board container's bottom <= 812 (getBoundingClientRect) for the player whose turn it is. Save docs/briefs/shots/layout-<game>.png for each.
 4. npx tsc --noEmit -p . and npm run build clean.
 NEVER run pkill/killall/kill except on a PID you started yourself.
CONSTRAINTS Only GameShell.tsx and the online UI parts of the game components. No rules/server changes, no deps, no commits.
DONE WHEN  board fully visible at 375x812 for all online games (assertions + screenshots); tsc/build clean.
DELIVER  REPORT at docs/briefs/ONLINE-LAYOUT-REPORT.md (DID / EVIDENCE / DONE WHEN ✅❌ / QUESTIONS / LESSON).

ROUND 2 (resume): last run fixed Tic-Tac-Toe (layout-tictactoe*.png) then stopped while retrying Connect 4 (your test waited for a 'div[role="tab"]' that may not exist — check the real markup of the PLAY CAMPERS button first). Check git diff, keep what works, finish the remaining games (connect4, dots, ayo, whot, ocho, tenten, same, a race game), delete layout-failure-*.png when fixed, and WRITE the REPORT. If the dev server on :3000 is down, start your own on :3060.
