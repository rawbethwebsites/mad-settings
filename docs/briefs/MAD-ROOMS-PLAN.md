# MAD-ROOMS — Implementation plan (v1, pre eng-review)

Brief: `docs/briefs/MAD-ROOMS.md` · Branch: `camp-rooms` · Convex: DEV deployment only.

## 0. What exists today (evidence)

| Area | Today | File |
|---|---|---|
| Player profile | localStorage only, `roomCode` invented locally, never shared | `src/lib/player.ts` (`createRoom`, `getRoomCode`) |
| Join | Picks name/avatar, "host" just generates a random local code | `src/app/join/page.tsx` |
| Online play | Only Camp Chess: secret browser id, presence, invites, server-validated moves | `convex/chess.ts`, `src/lib/chessOnline.ts`, `src/components/chess/OnlineChess.tsx` |
| Convex client | Created inside `OnlineChess` with `useMemo(new ConvexReactClient)` | `OnlineChess.tsx:22-23` |
| Game wrapper | `GameShell` loads player, renders header, `award()` writes localStorage | `src/components/arcade/GameShell.tsx` |
| Game rules | Pure functions live inside each game component (`place`, `drop`, `apply`, `step`, `playCard`, `play` …) | `src/components/games/*.tsx` |
| Pages without GameShell | bingo, same, search, puzzles, vault, chess | `src/app/games/*/page.tsx` |
| Tests | None. No test runner in `package.json`. | `package.json` |

## 1. Identity (shared by rooms + chess)

* One secret **camperId** per browser = the existing chess id key (`mad-settings-chess-id`), so Camp Chess and rooms see the same camper. New helper `getCamperId()` in `src/lib/roomClient.ts` re-exports `getChessPlayerId`.
* Secret id is only ever sent *from* the client as an argument. No query returns it. Clients address other campers by the public `roomPlayers._id`.

## 2. Convex data model (`convex/schema.ts`)

```
rooms        { code, name, hostId(secret), status: "open"|"closed", currentGame?,
               round?: { number, game?, status: "live"|"ended", startedAt, endedAt? },
               createdAt, updatedAt }                       index by_code
roomPlayers  { roomId, playerId(secret), name, avatar, isHost, lastSeen, score,
               kicked, joinedAt }                           index by_room, by_room_player, by_player
scoreEvents  { roomId, roomPlayerId, game, points, round, key, createdAt }
                                                            index by_key, by_room_round
matches      { roomId, game, seats: [{ roomPlayerId, name, avatar, accepted }],
               state(JSON string, server-only), turn, status: "waiting"|"playing"|"finished"|"abandoned",
               winner?(seat | -1 draw), round, createdBy, createdAt, updatedAt }
                                                            index by_room_status
partyRounds  { roomId, game: "trivia"|"bingo"|"same", roomRound, status, phase, step,
               data(JSON server-only), deadline?, createdAt }  index by_room
partyAnswers { roundId, roomPlayerId, step, answer, points, correct?, createdAt }
                                                            index by_round_step, by_round_player
```

## 3. Convex functions

`convex/rooms.ts`
* `createRoom({playerId,name,avatar,roomName?})` → unique 4-char code (same alphabet as chess), creator row `isHost=true`.
* `joinRoom({code,playerId,name,avatar})` → server checks code; errors: "No room with code ABCD…", "This room has closed", "The host removed you from this room". Re-join keeps score.
* `heartbeat({code,playerId})` – patches `lastSeen` (throttled server-side), online = seen in last 30 s.
* `leaveRoom`, `kick({code,playerId,target})` host-only, `setCurrentGame` host-only, `startRound`/`endRound` host-only.
* `awardPoints({code,playerId,game,points,key})` – client-reported (solo games). Whitelisted game ids, integer 1..cap per game, dedupe by `key`, rate limit per (player, game).
* Internal helper `grantPoints(ctx, roomPlayer, game, points, key)` used by server-scored games (matches, party rounds, chess).
* Queries: `get({code,playerId})` → room public view + `me` + roster (name, avatar, isHost, lastSeen, score) + `serverNow`; `leaderboard({code, round?})`.

`convex/matches.ts` (generic two-player + card engine)
* `create({code,playerId,game,opponents[]})`, `respond({matchId,playerId,accept})`, `start`, `move({matchId,playerId,move})`, `leave`, `rematch`, `get({matchId,playerId})` (per-seat view), `mine({code,playerId})` (invites + active).
* `move`: seat lookup from secret id → reject "You are not in this game" / "It is not your turn" / "That move is not allowed" (engine throws).
* On finish: server grants points per seat (same values as the solo games) via `grantPoints` with key `match:<id>:<round>:<seat>`.

`convex/rules/*.ts` — pure rule modules **moved** (not rewritten) out of the components:
`tictactoe.ts`, `connect4.ts`, `dots.ts`, `ayo.ts`, `whot.ts`, `ocho.ts` + `index.ts` registry implementing

```ts
interface Engine<S, M> {
  minPlayers, maxPlayers,
  init(n: number, names: string[]): S,
  turn(s: S): number,
  apply(s: S, seat: number, move: M): S,   // throws on illegal
  outcome(s: S): null | { winner: number | null },   // null winner = draw
  view(s: S, seat: number | null): unknown,          // hides other hands / market
  points(s: S, seat: number): number,
}
```
Solo components import the same functions (AI opponents unchanged).

`convex/party.ts` — host-led rounds
* Trivia: server shuffles 10 question ids; phases `question` → `reveal`; `answer` once per player per question, before deadline; scoring = existing formula `10 + secondsLeft + (streak>2 ? 5 : 0)`; correct answer index never returned during `question`. Points granted at reveal. Scheduler auto-reveals at deadline.
* Bingo: per-player 5×5 card derived from round seed + roomPlayerId (server computes, never stored); host `call` picks a random uncalled word; player `claim(marks)` verified server-side (line complete, all called) → 20 pts once per player per round.
* Don't Say the Same Thing: server ladder (`buildLadder`); host opens a step, all alive players submit one word; host closes (or deadline); normalised duplicates are OUT, blanks are OUT; survivors +`SAME_POINTS_PER_STEP`; round ends when ladder done or < 2 alive.

`convex/chess.ts` (small changes)
* `online` takes optional `code` → presence rows of that room's members flagged `inRoom` and sorted first.
* On finish/resign, grant chess points to each player's room membership server-side.

## 4. Frontend

* `src/lib/convexClient.ts` – one shared `ConvexReactClient` singleton; `src/components/rooms/ConvexClientProvider.tsx` used by `app/games/layout.tsx`, `app/room/layout.tsx`, `app/join/layout.tsx` (homepage/3D untouched). `OnlineChess` switches to the shared client.
* `src/lib/roomClient.ts` – `getCamperId`, error-message unwrapping, `useRoom()` hook (room, me, roster, onlineCount, award()).
* `/join` – keeps name/avatar (prefilled from old profile), host → `createRoom` → `/room/CODE/host`; join → `joinRoom` → `/room/CODE`; `?code=` prefill (QR) under `<Suspense>`.
* `/room/[code]` – roster (avatar, online dot, score), live leaderboard (total + this round), current game card with big JOIN, incoming invites, leave.
* `/room/[code]/host` – host-only; big code + QR (`qrcode` package → SVG), roster with kick, game picker, start/end round, party controls, leaderboard; `lg:` grid for laptop/TV.
* `RoomBar` (code · online count · my score · ← ROOM) in `GameShell` + the 6 non-shell pages; shows "Join a room" when not a member; shows invite toasts.
* Game pages: mode switch **VS COMPUTER** (existing component, untouched rules) / **VS CAMPERS** (new `OnlineMatch` lobby + per-game online boards in `src/components/online/`).
* Bingo/Trivia/Same pages: when the room has a live party round of that game → online player UI; otherwise existing local game.
* Solo games: `GameShell.award` (and direct `addScore` callers in search/puzzles/vault/chess-vs-AI) also post to `rooms.awardPoints`.
* Old profiles: `/games` hub shows "Join your camp room" card when `rooms.get` says not a member.

## 5. Order + commits (brief step 10)
1. Schema + rooms.ts → commit
2. Join flow (part of 3-4 commit)
3-4. Room + host screens → commit
5a. rules extraction + matches + 4 boards → commit
5b. whot/ocho engines + boards → commit
5c. party.ts + 3 UIs → commit
5d-6. solo scores + RoomBar everywhere + chess lobby → commit

## 6. Verification
* `npx convex dev --once` (DEV), `npm run build`, `npm run lint`.
* Browser test: 3 isolated sessions at 390px width (host + 2 campers).
