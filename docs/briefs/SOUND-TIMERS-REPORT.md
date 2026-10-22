# REPORT SOUND-TIMERS · Status: needs-decision

Date: 2026-10-22 (WAT)
Owner: Hermes (ChatGPT), The Boost Nation
Brief: `docs/briefs/SOUND-TIMERS.md`
Repository: `/Users/mac/Documents/PROJECTS/mad-settings`
Branch / HEAD: `release-games` / `8db2543` — no commits or branch switches.
Status: Sound implementation and the specified timed-match acceptance pass. The broader “every online game” timer goal has an existing API limitation described below; no client-only deadlines were invented.

## DID

- Added the header speaker control to GameShell, standalone chess, and the live-room player shell. Mute persists per browser in `mad-settings-muted`, suppresses new audio/haptics, and immediately mutes the output gain of already-scheduled sounds.
- Added gesture-based audio unlocking and development-only `[mad:sfx]` console logging. Generic controls tap once; semantic gameplay controls opt out of generic taps with `data-sfx="none"`.
- Added reusable countdown, turn, and result sound hooks. Countdown cues fire once per displayed second at 5/4/2/1; urgent replaces the tick at 3, with a short vibration. Turn and result cues are deduplicated.
- Added a visible countdown ring to GameShell for every match that supplies an active turn and server deadline: tic-tac-toe (20s), Connect4 and Dots (25s), Ayo, Whot and Ocho (30s). The clock uses `turnDeadline` and the `serverNow - Date.now()` offset, refreshes when the page becomes visible, labels whose move it is, and leaves timeout adjudication to the server. Results display the server's timeout reason.
- Wired human/computer moves, captures, card events, answer feedback, results, and existing solo countdowns across all 16 game routes. Online move/turn/result feedback uses live match changes. Added invite notifications in RoomLayer and the separate chess lobby, plus live-room trivia/bingo feedback.
- Exposed Bingo Solo's existing call-next action with a button so players can call and mark words. No scoring or rules changes.
- Respected reduced motion for the new ring transition and vibration. Solo games retain their existing timer durations and behavior.
- Pushed the unchanged existing functions to DEV with `npx convex dev --once`, after checking the deployment is DEV. The final push succeeded at 19:24:19 WAT. A transient authorization fetch failure on the preceding attempt cleared on retry. Ran the real online acceptance again after the successful push.
- Added reproducible Python Playwright probes and saved evidence/screenshots. No new npm dependencies, server/rules changes, production deployment, or commits.

## EVIDENCE

### Real browser acceptance — 12/12 checks passed

Command:

`SOUND_TEST_URL=http://127.0.0.1:3041 python3 docs/briefs/sound-timers-browser.py`

Evidence: `docs/briefs/shots/sound-timers-evidence.json`.

The probe uses installed Chromium, 375×812 mobile contexts, real Web Audio, and the real DEV backend. It instruments sound/vibration calls and skews one phone's clock; it does not mock gameplay or backend responses.

Verified:

1. Human and computer tic-tac-toe placements each log `place`.
2. Restart logs one generic `tap`.
3. Muting stops human/AI sound scheduling.
4. Mute survives a reload and exposes the unmute control.
5. Incoming invite logs one `invite`.
6. With Tobi's phone clock five minutes fast, both phones initially show 20 seconds.
7. Ada sees “Your move”; Tobi sees “Ada's move”.
8. Ada idles for the requested 21 seconds; the real server finishes the match with `Ada ran out of time.` and winner seat 1. The final readback completed 22.93 seconds after the probe's start marker. Match ID: `m972kx6h2hcpxebhwczaksbx5x8gs6v1`.
9. Ada hears four ticks, one urgent cue, and one lose cue, without rerender duplicates.
10. Tobi hears four ticks, one urgent cue, and one win cue, without rerender duplicates.
11. The reduced-motion context records no vibration; the normal context records turn/urgent vibration.
12. The tested tic-tac-toe views have no horizontal overflow or page errors at 375×812.

The test room was closed in cleanup, verified in the JSON evidence.

### All game routes — 16/16 sound smoke checks passed

Command:

`SOUND_TEST_URL=http://127.0.0.1:3041 python3 docs/briefs/sound-timers-games.py`

Evidence: `docs/briefs/shots/sound-timers-games-evidence.json`.

Each route returned HTTP 200, displayed a mute button, exercised a real interaction, and reported no page errors. Observed cues:

| Game | Exercised event / observed cues |
| --- | --- |
| Tic-tac-toe | Human and AI placement: `place`, `place` |
| Connect4 | Real canvas drop and AI response: `drop`, `drop` |
| Dots | Human and AI line: `place`, `place` |
| Ayo | Real canvas sow and AI response: `place`, `place` |
| Whot | Deal: `card` |
| Ocho | Deal: `card` |
| Chess | Start, e2–e4, AI response: `tap`, `place`, `place` |
| Trivia | Start and answer feedback: `tap`, `error` |
| Bingo | Call and mark: `card`, `place` |
| Puzzles | Correct answer: `capture` |
| Don't Say the Same Thing | Start/countdown: `tap`, `urgent`, `tick`, `tick` |
| Ten Ten | Start/countdown/missed pick: `tap`, `urgent`, `tick`, `tick`, `error` |
| Chop Chop | Select and invalid swap: `tap`, `error` |
| Minesweeper | Reveal: `flip` |
| Search | Correct answer: `capture` |
| Vault | Correct code: `win` |

Coverage limits: these are route/interactions smoke checks, not exhaustive endgames or two-phone tests for every ruleset. Vault uses a local-only camper profile with the four pieces already collected. Puzzles/Search submit with the input's existing Enter handler; their pre-existing narrow-screen CHECK-button overflow is not claimed fixed. This is headless-browser verification, not an on-device listening test.

### Screenshots

All saved under `docs/briefs/shots/`:

- `timer-solo-sound.png`
- `timer-your-move-12s.png`
- `timer-opponent-move.png`
- `timer-urgent-3s.png`
- `timer-timeout-loser.png`
- `timer-timeout-winner.png`

### Type/build/lint and scope checks

Raw command output and exact exit codes for the final captured verification run: `docs/briefs/shots/sound-timers-cli-verification.txt`. This includes the full unchanged-file lint diagnostics, not just the summary below.

- `npx tsc --noEmit -p .` — exit 0.
- `npm run build` — exit 0; all 24 static pages generated. Next warns about an unrelated `/Users/mac/package-lock.json` outside this repository; build succeeds.
- ESLint on the 31 changed/new TypeScript files — exit 0, zero errors and four unused-symbol warnings.
- `git diff --check` — exit 0.
- `git diff --exit-code -- convex src/lib/rules package.json package-lock.json next.config.ts` — exit 0: no server/rules/dependency/configuration changes.
- `npm run lint` — exit 1: 15 existing errors and 18 warnings across the repository. The errors are in unchanged `camp3d/CampPeople.tsx`, `camp3d/CampScene.tsx`, `camp3d/CampWorld.tsx`, and `games/ayo3d/AyoBoard3D.tsx` (React hook/compiler rules). These tracked files have no diff; they were not changed or suppressed for this brief. This is not a full-repository lint pass.
- Browser runs used an isolated webpack frontend on `127.0.0.1:3041`, avoiding interference with existing local servers. Its `src` copy was verified byte-for-byte identical to the repository before finalization; it uses the real DEV Convex backend. No repository build configuration was changed to achieve this.

## DONE WHEN ✅❌

- ✅ Mute button works and is remembered per phone/browser.
- ✅ Countdown ring and last-five/urgent/turn/result sounds work for the six existing server-timed, turn-based online rulesets.
- ✅ Sounds are wired across all games; all 16 game routes have passing real-interaction sound smoke evidence.
- ✅ Two independent online tic-tac-toe contexts pass the real timeout test with screenshots and exact server-result readback, including clock-skew and reduced-motion checks.
- ✅ TypeScript and production build pass.
- ✅ DEV push completed and was followed by successful real backend acceptance. No production deploy, commits, new dependencies, or server/rules changes.
- ❌ Literal goal of a deadline-backed turn timer in **every** online mode is not fully achievable under this brief's no-server/rules-change constraint. The separate `convex/chess.ts` / `OnlineChess.tsx` API supplies no `turnDeadline` or `serverNow`. Its moves/captures/turns/results/invites now have sound, but chess remains untimed. Simultaneous Same/Ten Ten and score-submission race modes also do not expose an active server-timed turn; no arbitrary countdown was added to them. Trivia retains its existing per-question clock with sound.
- ❌ Full-repository lint remains red due to the unchanged errors listed above; the brief's required tsc/build gates and changed-file ESLint pass.

## QUESTIONS

- Should deadline-backed timers be added to the separate online chess backend, and should the currently untimed simultaneous/race rulesets gain server deadlines? That needs a separate server/rules brief or explicit approval, including durations and timeout outcomes.
- Existing UI follow-up, not changed here: Puzzles/Search CHECK controls overflow on a narrow phone (Enter submission works), and GameCanvas returns an empty fallback for its 3D-only boards under reduced motion/WebGL unavailability. A phone-layout/accessibility brief should address these without mixing it into sound changes.

## LESSON

Use the server's deadline and offset rather than trusting a phone's clock. Deduplicate semantic cues from accepted state changes, suppress the generic tap where gameplay already owns feedback, and test mute against actual audio scheduling. Do not invent client-only authority to make an untimed backend appear timed. Report route-smoke coverage separately from a genuine two-client server timeout test.

## Raw browser acceptance output

Final real-backend acceptance after the successful DEV push (copied as printed):

```text
PASS vs-computer human and AI placements ["place", "place"]
PASS generic restart taps once ["place", "place", "tap"]
PASS mute suppresses human and AI audio scheduling {"before": [3, 3], "after": [3, 3]}
PASS mute persists across reload "mad-settings-muted=1; unmute button visible"
PASS invite toast sounds once ["invite"]
PASS server-offset countdown despite guest clock +5 minutes [20, 20]
PASS active-player copy {"Ada": "20\n\nYour move \u00b7 20s", "Tobi": "20\n\nAda's move \u00b7 20s"}
PASS real server timeout after idle 21 seconds {"elapsed": 22.93, "match": "m972kx6h2hcpxebhwczaksbx5x8gs6v1", "status": "finished", "result": {"reason": "Ada ran out of time.", "winners": [1.0]}}
PASS Ada final-five and result sound deduplication ["tap", "tap", "tap", "turn", "tick", "tick", "urgent", "tick", "tick", "lose"]
PASS Tobi final-five and result sound deduplication ["invite", "tap", "tick", "tick", "urgent", "tick", "tick", "win"]
PASS reduced-motion suppresses vibration {"Ada": [35, [40, 60, 40]], "Tobi": []}
PASS phone layout and runtime "375x812; no horizontal overflow or page errors"
```
