BRIEF  GAME-LOOKS-2B · Owner: Hermes (ChatGPT) · Gate: none (local only, no commits)
GOAL  Whot and Ocho feel like real card games on a phone: readable hand, warm camp table, every card motion running.
CONTEXT  Repo /Users/mac/Documents/PROJECTS/mad-settings, branch game-looks (don't switch or commit). Read docs/briefs/GAME-LOOKS.md, AGENTS.md. Files: src/components/cards/*, src/components/games/Whot.tsx, Ocho.tsx (vs-computer + WhotOnline/OchoOnline share one table). Rules src/lib/rules/whot.ts, ocho.ts: don't change. gsap installed. You already started this (session stopped at 15:56 by a machine restart): check git diff and continue, don't redo.
STEPS
 1. `npx next dev -p 3030`; localStorage 'mad-settings-player' = {"name":"TEST","avatar":"🔥","roomCode":"","joinedAt":0,"scores":{},"vaultPieces":[],"badges":[]}; open /games/whot and /games/ocho at 375x812 (npx playwright). Every hand card readable at 360-375px (fan showing corner index, or 2 rows; no clipping or scrollbar), unplayable dimmed but crisp, numbers fit, warm wood/felt table with campfire glow.
 2. GSAP motions (300-700ms, reduced-motion instant): deal from market; played card flies to pile with slight rotation; draw slides from market and flips; pick-2/pick-3/general-market cards fly to victims; "OCHO!"/last-card callout; winner celebration.
 3. Play one full game of each vs computer to the end (Playwright script ok).
 4. 375px screenshots in docs/briefs/shots/: whot-start/mid/end.png, ocho-start/mid/end.png. Clear unused-var warnings in your files.
 NEVER run pkill/killall/kill on anything except a PID you started yourself.
CONSTRAINTS Only src/components/cards/*, Whot.tsx, Ocho.tsx + screenshots. No deps, no commits.
DONE WHEN 6 screenshots exist; motions listed as running; full game each; `npx tsc --noEmit -p .` + eslint on your files clean.
DELIVER REPORT (DID / EVIDENCE with paths / DONE WHEN ✅❌ / QUESTIONS / LESSON) saved to docs/briefs/GAME-LOOKS-2B-REPORT.md.
