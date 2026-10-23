BRIEF  GAME-LOOKS-1B · Owner: Hermes (ChatGPT) · Gate: none (local only, no commits)
GOAL  3D Ayo and Connect 4 look unmistakably like the real games on a phone, in vs-computer and online play.
CONTEXT  Repo /Users/mac/Documents/PROJECTS/mad-settings, branch release-games (don't switch/commit). Read docs/briefs/GAME-LOOKS.md, AGENTS.md. Current 3D (by a previous builder) fails visually — see docs/briefs/shots/layout-connect4.png (orange slats in a black box, no frame, no holes) and layout-ayo.png (dark scene, only glowing arcs, no board or seeds visible). Files: src/components/three/GameCanvas.tsx, src/components/games/ayo3d/AyoBoard3D.tsx, src/components/games/connect4-3d/Connect4Board3D.tsx, used by Ayo.tsx / Connect4.tsx (vs computer + AyoOnline / Connect4Online). Rules don't change.
STEPS
 1. Connect 4: a blue plastic upright frame, 7x6 round holes you can see through, coral and purple discs that drop down a column with a small bounce; camera straight-on with slight tilt so the whole frame fills the width at 375px; winning four glow. Tap a column to drop.
 2. Ayo: a carved wooden board seen from slightly above (camera ~35-45° down), 2 rows of 6 pits + 2 stores clearly visible, seeds as small pebbles in each pit (count readable: show the number on/near each pit too), seeds hop pit to pit when sown, legal pits glow on your turn; your row nearest the camera.
 3. Lighting: warm campfire key light + enough fill that the board is clearly readable (no near-black scenes). Board fills most of the canvas at 375x812.
 4. Prove it: Playwright at 375x812, vs computer: screenshots start/mid/end for both (docs/briefs/shots/c4-*.png, ayo-*.png), play a full game of each to the end. If the 3D can't be made to read clearly, ship a polished 2D/CSS-3D version instead and say so.
 5. npx tsc --noEmit -p . and npm run build clean.
 NEVER run pkill/killall/kill except on a PID you started yourself. Dev server may already run on :3000; if not, start your own on :3070.
CONSTRAINTS Only the files listed above. No deps, no commits.
DONE WHEN  screenshots clearly show a real Connect 4 frame with discs and a real Ayo board with seeds; full game each; tsc/build clean.
DELIVER  REPORT at docs/briefs/GAME-LOOKS-1B-REPORT.md (DID / EVIDENCE / DONE WHEN ✅❌ / QUESTIONS / LESSON).
