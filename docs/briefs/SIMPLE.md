BRIEF  SIMPLE · Owner: Hermes (ChatGPT) · Gate: none (local + DEV only, no commits)
GOAL  Anyone — even a child — understands every MAD SETTINGS screen in 5 seconds and can do the main thing without help. (Rob: "a baby should be able to use madsettings".)
CONTEXT  Repo /Users/mac/Documents/PROJECTS/mad-settings, branch release-games (don't switch/commit). Dev server on :3000 (don't kill it). Read AGENTS.md. Another job is editing the 3D Ayo/Connect 4 files (src/components/three, ayo3d, connect4-3d, Ayo.tsx, Connect4.tsx) — DON'T touch those.
RULES FOR EVERY SCREEN
 - One big obvious main button. Plain words first, camp words second (e.g. "🪵 Like" not "Pull up a log"; "Meet campers" with "The Trail" as a small label).
 - No jargon, no long paragraphs, max ~12 words of instructions per screen. Big tap targets. Icons + words.
 - Defaults are the easy option; never block a first try with setup the user doesn't understand.
 - Every error says exactly what to tap next, in one short sentence. No scary banners when nothing is wrong.
FIX THESE (Campfire Connect, src/app/connect*, src/components/connect/*, convex/connect.ts):
 1. Profile = one short screen: name, birthday, photo (optional), "Start meeting campers". Both Friends and Teammates ON by default; prompts/tags optional and collapsed under "Add more (optional)".
 2. Remove the Ranger-verification gate for liking: any camper with a profile can Like. "Verified" stays as a badge Rangers can give. Photos: show immediately to the owner; others see them once approved (until then show the avatar) — no blocking.
 3. Rename on screen: Log → "🪵 Like", Keep walking → "✋ Skip", Marshmallow → "🍡 Super like", Backtrack → "↩ Undo", Fire Circle → "Matches", Tent Talk → "Chat", My camp → "My profile", The Trail → "Meet campers". Keep the camp look and the "You lit a fire!" match moment.
 4. The "Reconnecting to camp…" banner must only show after the connection has really been lost for 3+ seconds, never on first load.
 5. First visit: a 3-step "How it works" strip (Like → Match → Chat) that can be dismissed.
ALSO (outside the 3D files): /join, /room/[code], /room/[code]/host, /games hub, GameShell (src/components/arcade/GameShell.tsx) — apply the same rules to the words and buttons (e.g. "PLAY CAMPERS" → "Play a friend", "VS COMPUTER" → "Play the computer"; join page: "Your name", "Pick a face", one big "Join" button; host gets one big "Start a room").
 Server change in convex/connect.ts is allowed only for item 2; push to DEV with `npx convex dev --once`.
TEST  Playwright 375x812, fresh browser (empty localStorage): create profile → like → match with a second context → chat; join a room; start a game vs computer and vs a friend. Screenshot every screen to docs/briefs/shots/simple-*.png. For each screenshot write one line: "What is this screen? What do I tap?" — if the answer isn't obvious from the screenshot, fix it.
 npx tsc --noEmit -p . and npm run build clean. NEVER run pkill/killall/kill except a PID you started.
DELIVER  REPORT at docs/briefs/SIMPLE-REPORT.md (DID / EVIDENCE / DONE WHEN ✅❌ / QUESTIONS / LESSON).
