BRIEF  MAD-ROOMS · Owner: Antigravity · Due: 2026-10-23 · Gate: none (local branch only, nothing public)

GOAL        Campers on their own phones join one real camp room, see each other, and play the camp games together, while a host sees and runs the whole group on one screen.

WHY         MAD SETTINGS is a TBN showcase ("games on phones"). Today only Camp Chess works between phones. The room code is saved on each phone and never shared, and the other 16 games run on one phone only. At camp that breaks the promise.

CONTEXT     Repo: this folder (Next.js + Convex). Branch: camp-rooms (already checked out, work only here).
            Read AGENTS.md first: this Next.js has breaking changes; read node_modules/next/dist/docs before writing Next code.
            Reference pattern to copy: Camp Chess online (convex/chess.ts, src/lib/chessOnline.ts, src/components/chess/OnlineChess.tsx).
            It keeps a secret playerId in the browser, never returns it to clients, and uses presence + invites. Reuse that approach.
            Player profile today: src/lib/player.ts (localStorage only). Game wrapper: src/components/arcade/GameShell.tsx.
            Games: src/app/games/* and src/components/games/*.
            Convex: CONVEX_DEPLOYMENT in .env.local is the DEV deployment.

STEPS
 0. Run /gstack-plan-eng-review on your plan for steps 1-6 before writing code. Fix what it flags.
 1. ROOMS (Convex): tables rooms (code, name, hostId secret, status, currentGame?, createdAt) and roomPlayers (roomId, playerId secret, name, avatar, isHost, lastSeen, total score).
    Mutations/queries: createRoom (creator becomes host), joinRoom(code), heartbeat (presence, online = seen in last 30s), leaveRoom, kick (host only), setCurrentGame (host only), awardPoints(game, points).
    Room codes are checked on the server: a wrong code shows a clear error.
 2. JOIN FLOW: /join creates a real room ("I'm the host") or joins one by code. Keep the camper's name + avatar. Old localStorage players still load and are asked to join a room.
 3. ROOM SCREEN /room/[code] (every camper): who is in the group with avatar, online dot and score; live leaderboard; the game the host picked with a big JOIN button; leave room.
 4. HOST SCREEN /room/[code]/host (host only, also works on a laptop or TV): roster with online state, kick, pick the game everyone plays now, start/end round, live leaderboard, big room code + QR code to join. Big-screen friendly.
 5. GAMES PLAYABLE TOGETHER, in this order:
    a. Two-player turn games online with seats picked from the room roster (same flow as Camp Chess): Tic-Tac-Toe, Connect 4, Dots and Boxes, Ayo. Use one generic Convex "matches" table (game, roomId, seats, state JSON, turn, status, winner); the server rejects moves from the wrong player or out of turn.
    b. 2-4 player card games online: Whot, Ocho. Each player only receives their own hand.
    c. Host-led party games: Bingo, Trivia, Don't Say the Same Thing. The host starts the round from the host screen, everyone answers on their own phone at the same time, and results land on the room leaderboard.
    d. Solo games (Minesweeper, TenTen, ChopChop, Puzzle Rush, Ultimate Search, The Vault): keep them solo, but scores post to the room leaderboard.
    e. Camp Chess: keep working; its lobby shows the room's players first.
 6. Every game page shows the room bar (room code, players online, my score) and a back-to-room link.
 7. Push functions to the DEV deployment only (npx convex dev --once). Then npm run build and npm run lint must pass.
 8. Test with at least 3 separate browser sessions (host + 2 campers) at phone width: create room, join, roster updates live, host picks a game, play one full 2-player match, one Whot game with 3 players, one host-led Trivia round, kick a player. Run /gstack-qa against http://localhost:3000 and fix what it finds.
 9. Run /gstack-review on the branch diff and fix real issues.
10. Commit after each of steps 1, 3-4, 5a, 5b, 5c, 5d-6, with clear messages.

CONSTRAINTS
 - Work only on branch camp-rooms. Do NOT push, open PRs, merge, or deploy (no Vercel, no `convex deploy`, no prod).
 - Do not message anyone or post anything.
 - Keep the existing brand look (brand-cream / brand-black / brand-purple, font-display, the GameShell style). Phone first.
 - Never send another player's secret id to any client. Card hands are private.
 - Don't rewrite games' rules or the 3D homepage; change only what multiplayer needs.
 - Domain is theboostnation.space, never .com.
 - Don't touch the registration flow or the Telegram notify.

DONE WHEN
 [ ] A host can create a room; 2+ campers on other browsers join by code and appear on host + room screens within ~2s.
 [ ] Host screen: roster, online state, kick, pick game, start/end round, leaderboard, code + QR.
 [ ] Tic-Tac-Toe, Connect 4, Dots, Ayo playable between two phones; wrong-turn moves rejected on the server.
 [ ] Whot and Ocho playable by 2-4 phones with private hands.
 [ ] Bingo, Trivia, Same run as host-led rounds for the whole room.
 [ ] Solo games post scores to the room leaderboard.
 [ ] Camp Chess still works.
 [ ] npm run build and npm run lint pass; functions pushed to dev only.
 [ ] /gstack-qa and /gstack-review run, findings fixed or listed.

DELIVER     Commits on branch camp-rooms + a REPORT (Handbook format) saved to docs/briefs/MAD-ROOMS-REPORT.md, with test evidence (screenshots in docs/briefs/shots/). Mark each DONE WHEN item ✅/❌ honestly. "Couldn't verify X" beats a guess.
