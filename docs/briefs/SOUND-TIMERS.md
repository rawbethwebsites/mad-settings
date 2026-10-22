BRIEF  SOUND-TIMERS · Owner: Hermes (ChatGPT) · Gate: none (local + DEV only, no commits)
GOAL  Every game on MAD SETTINGS has sound and, in online play, a visible turn timer.
CONTEXT  Repo /Users/mac/Documents/PROJECTS/mad-settings, branch release-games (don't switch/commit). Read AGENTS.md and docs/briefs/GAME-LOOKS.md.
  - Sound kit: src/lib/sfx.ts (play('tap'|'place'|'drop'|'card'|'flip'|'capture'|'tick'|'urgent'|'turn'|'invite'|'win'|'lose'|'error'), buzz(ms), isMuted/setMuted, event 'mad:mute').
  - Server timers already exist: matches.get returns turnDeadline (ms) and serverNow; rules have turnSeconds (tictactoe 20, connect4 25, dots 25, ayo 30, whot 30, ocho 30); timeout = auto-draw (whot/ocho) or forfeit.
STEPS
 1. GameShell (src/components/arcade/GameShell.tsx): a mute/unmute speaker button in the header (remembered per phone). Online match view: a countdown ring/bar for the player whose turn it is, computed from turnDeadline with clock offset (serverNow vs Date.now()); ticks each second in the last 5 s ('tick'), 'urgent' + buzz at 3 s, 'turn' + buzz when it becomes your turn, 'win'/'lose' on result. Copy: "Your move · 12s" / "Ada's move · 8s"; when time runs out show "Ran out of time" from the result reason.
 2. Sounds in every game, vs computer AND online: tap on buttons, place (tic-tac-toe, dots line, chess move), drop (connect4), capture (ayo capture, chess capture, dots box), card/flip (whot/ocho deal/play/draw), win/lose at the end; trivia/race games: tick in the last 5 s of each question, win/lose. Invite toast in src/components/room/RoomLayer.tsx plays 'invite'. Keep calls light (one sound per event).
 3. Solo timed games keep their own timers; just add the tick/urgent sounds to them.
 4. Push functions to DEV only (`npx convex dev --once`; .env.local is dev). Never `convex deploy`.
 5. Test in a browser at 375x812 (Playwright): a vs-computer game with sound events logged (wrap play() with console.debug in dev), and an online tic-tac-toe between two contexts (different localStorage 'mad-settings-chess-id') where one player waits 21 s and loses on time. Screenshots of the timer ring to docs/briefs/shots/timer-*.png.
 6. npx tsc --noEmit -p . and npm run build clean.
 NEVER run pkill/killall/kill except on a PID you started yourself.
CONSTRAINTS No server/rules changes, no new deps, no commits. Respect mute and reduced motion.
DONE WHEN  mute button works; timer ring + sounds in online play; sounds in all games; timeout test passes with screenshots; tsc/build clean.
DELIVER  REPORT (DID / EVIDENCE / DONE WHEN ✅❌ / QUESTIONS / LESSON) at docs/briefs/SOUND-TIMERS-REPORT.md.
