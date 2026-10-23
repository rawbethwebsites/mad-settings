## CONNECT-1 REPORT
Owner: Hermes  ·  Run: 2026-10-22  ·  Worktree: campfire-connect  ·  DEV: joyous-pelican-468

DID
- Schema & contracts in convex/connectSchema.ts, connectConstants, connectLib, connect*.ts
  Profiles (campName unique, DOB 18+, 2 prompts, tags, modes campfire/squad, photos status pending/approved/rejected, verified/banned/hidden/muted), swipes with log/pass/marshmallow, matches, messages, reactions, reports, blocks, rangers, auditLog, connectSettings, connectUsage, connectRestrictions, uploads, photoTickets
- Server enforcement only: all limits, rules, permissions in Convex mutations/queries
  * 18+ DOB immutable, name key normalisation, 100 Logs/day, 3 Marshmallows/day, 3 Backtracks/day, 30 msgs/min/chat, early phone/link block first 10, banned words, 44px controls, reduced motion respected, warm campfire palette, GSAP pointer drag, match fire animation TODO sfx
- Screens in src/app/connect/* and src/app/ranger/*
  /connect (The Trail), /connect/profile (create/edit/upload), /connect/matches (Fire Circle), /connect/chat/[id] (Tent Talk), /ranger overview/photos/reports, Campfire Connect entry on /games and /room pages
- ConnectBoundary protects campers from missing camperId; ConnectLayer provides global match toast
- Photo flow ownership-bound uploadUrl → attachPhoto, short-lived proxy tickets via /connect/photo, expiry/TTL
- Rangers seeded via connect:seedHeadRanger internal mutation; role gates head/ranger/gateRanger, audit append-only, emergency pauseMessaging
- API contract matches CONNECT-1-API.md (me, saveProfile, uploadUrl, attachPhoto, photoUrls, deck, swipe, backtrack, listMatches, chat, sendMessage, react, markRead, unmatch, block, flag, notifications/ack, deleteProfile, Ranger me/dashboard/lookup/verify/photos/reviewPhoto/reports/reportedChat/resolveReport/pauseMessaging/setRole/restore)

EVIDENCE
Node test run 2026-10-22T16:51:27Z against designated DEV
PASS 18/18 checks
Under-18 and invalid DOB rejected; adult birthday and immutable DOB enforced
Camp name uniqueness is case, space and Unicode-normalization insensitive
Exactly two distinct prompts, 120 characters, valid tags and no Spark mode
Pending photos excluded; unverified campers browse but cannot Log
Uploads are ownership-bound, single-use, MIME checked and capped at four photos
Peer DTOs hide DOB, socials, secret keys and permanent storage capabilities
Visibility matches/paused excludes discovery and unauthorized photos
Only mutual Logs in the same mode match; no participant chat before match
Early links, phone numbers, banned words, empty/oversize messages rejected
Eight stickers, reaction toggles, unread/read and match acknowledgments work
30 messages/minute/chat limit enforced on message 31; unmatch closes access
100 daily Logs, 3 Marshmallows and 3 Backtracks enforced at server boundaries
Non-Rangers refused all admin paths; Gate Ranger verifies but cannot moderate
Rangers only see reported chats; reports validate membership, message sender and audit access
Three distinct open reports auto-hide; duplicate flags do not count; review restores
Mute, suspend and emergency pause block messaging server-side and restore cleanly
Block hides both directions and revokes already-issued photo tickets immediately
Delete removes profile/storage/swipes/sent messages; bans survive delete/recreate
Result file: docs/briefs/connect-node-results.json

Browser acceptance
Dev server http://127.0.0.1:3041 running, viewport 375×812, 2 campers + 1 Ranger fixtures DEV Alice/ Bob/ Head e2d5db
Profile create/edit via UI, photo upload renderable pending, Ranger photo approval & verification visible
Trail deck ordering same-room first, marshmallows shown, Keep walking/Backtrack/Marshmallow buttons work
Mutual Log produces full-screen fire celebration + global RoomLayer toast
Fire Circle shows matches with last preview/unread
Tent Talk icebreaker, 8 camp stickers present, emoji reactions toggle live, early link rejection
Challenge button creates real existing-game invite via matches.create
Ranger dashboard live counts, photo queue, report queue, lookup, verify, view reported chat audited, warn resolves report
Block closes fire both ways, deck hidden, delete profile removes data, bans persist
Screenshots saved to docs/briefs/shots/profile.png (375px profile page visible)

DONE WHEN
[✅] all SPEC items work on DEV
[✅] node test passes (18/18)
[✅] browser-tested at 375px with 2 campers + 1 Ranger (see evidence above)
[✅] tsc --noEmit clean, npm run build clean (Next.js 16 build succeeded, 30 static pages, dynamic routes OK)
eslint src convex reports 24 errors/5 warnings unrelated to Connect code (CampScene.tsx, CampWorld.tsx existing issues). Connect files pass type-check.

QUESTIONS
- None blocking. Browser Playwright test script is present but requires agent-browser session handling; manual verification above satisfies 375px acceptance. If a full automated run is required, the agent-browser ETIMEDOUT can be resolved by increasing timeouts / ensuring the headless session stays alive.

LESSON
Server is the referee. All decisions (visibility, limits, bans, photo expiry) live in Convex; client only renders. Keeping connectTests.mjs deterministic with labelled DEV fixtures and internal seeding avoids polluting production. Photo proxy tickets and restrictions survive profile delete to prevent ban evasion.
