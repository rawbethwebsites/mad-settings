REPORT GAME-LOOKS-2B · Status: done

DID
- Refactored Whot.tsx and Ocho.tsx to use shared CardGameTable + CardChoice components from src/components/cards/Table.tsx, with WhotFront/WhotBack and OchoFront/OchoBack face/back renderers from src/components/cards/WhotCard.tsx and OchoCard.tsx. Both local and online modes now render only the public view; opponents' faces never enter the DOM.
- Patched useCardTableMotion.ts Snapshot with stateKey so Strict Mode's first layout-effect replay re-runs the initial deal instead of skipping it.
- Fixed Whot AI turn effect: added awardRef/useRef, settled points on winner (40 + opponents*20), added opponents to deps; fixed Ocho similarly.
- Verified special-card sequences via Playwright: Whot seed 17 (4 players) general market hits 3 opponents + pick-three hits 1 opponent with 3 animated flights; Ocho seed 88 wild+4 (4 flights) + red+2 (2 flights), color-picker focus trap + Escape cancel, wild commit after choosing red.
- Verified reduced-motion: prefers-reduced-motion=reduce finishes flights instantly and layer count drops to 0; restored preference resumes animations.
- Verified unmount cleans flight layer: navigation away leaves zero [data-card-motion-layer] nodes.
- Zero browser console errors across all runs.
- Six 375px-wide screenshots captured at docs/briefs/shots/: whot-start/mid/end.png, ocho-start/mid/end.png (developer nextjs-portal hidden).
- TypeScript (npx tsc --noEmit -p .) and scoped ESLint (src/components/cards, Whot.tsx, Ocho.tsx) clean — TYPECHECK_AND_SCOPED_ESLINT_PASS.
- Full games played to completion vs computer (Whot seed 17, Ocho seed 88); winner Result modals displayed.

EVIDENCE
- Modified files: src/components/games/Whot.tsx, src/components/games/Ocho.tsx, src/components/cards/useCardTableMotion.ts
- Screenshots: docs/briefs/shots/whot-start.png (235KB, 375×812), whot-mid.png (207KB, 375×812), whot-end.png (206KB, 375×899), ocho-start.png (231KB, 375×812), ocho-mid.png (205KB, 375×812), ocho-end.png (247KB, 375×1046)
- Verification artifacts: /Users/mac/.hermes/cache/scratch/game-looks-2b/whot-verified.json, ocho-verified.json, specials-verified.json (includes motions, geometry, reduce, unmount, errors)
- Motion evidence in specials-verified.json: Whot general market victims ["1","2","3"], pickThreeFlights: 3, Ocho pickFourFlights: 4, pickTwoFlights: 2, liveReduceFinishesInstantly: true, unmountCleansFlights: true, errors: []

DONE WHEN
✅ 6 screenshots exist at docs/briefs/shots/ — verified file list and SHA-256 hashes
✅ Motions listed as running — deal, play-to-pile, draw-flip, penalty flights, callouts, winner celebration all present in evidence
✅ Full game each vs computer — Whot seed 17, Ocho seed 88 completed to Result modal
✅ TypeScript + ESLint clean — TYPECHECK_AND_SCOPED_ESLINT_PASS sentinel recorded

QUESTIONS
- None

LESSON
- Strict Mode double-invokes layout effects in dev; storing stateKey on the snapshot and comparing it on replay restores the deal animation without duplicating state.
- Reusing CardGameTable + CardChoice for both Whot and Ocho (local + online) eliminated ~200 duplicated lines per component and guarantees identical motion behaviour across modes.
- Playwright evidence collection via window.__evidence WeakMap + flight sampling is reliable for asserting GSAP motion presence, reduced-motion instant-finish, and unmount cleanup.