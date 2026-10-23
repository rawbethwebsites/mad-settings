# CONNECT-1 integration contract

2026-10-22 · Hermes · Local worktree only. This contract coordinates concurrent implementation; implementation and tests are authoritative.

No new dependencies, production deploys, commits or pushes. Never return anyone's playerId. Opaque camperId() is a bearer capability, not authenticated identity. Photo URLs must expire through a server-validated proxy, not a permanent storage URL. All UI uses existing brand plus warm, lighter-than-background campfire surfaces, visible >=44px controls, reduced motion. TODO sound integration (sfx not on branch).

## Shared constants
convex/connectConstants.ts exports CONNECT_PROMPTS (8 strings), CONNECT_TAGS (10 specified tags), CONNECT_STICKERS (8 emoji strings). Mode = 'campfire' | 'squad'. Swipe = 'log' | 'pass' | 'marshmallow'. Visibility = 'everyone' | 'matches' | 'paused'.

## Public DTO
Profile: {id, campName, photos: [{storageId, status}], prompts: [{question: number, answer: string}], tags: string[], modes: Mode[], verified: boolean, visibility, socials?: {instagram?: string, discord?: string}, sameRoom?: boolean, marshmallow?: boolean}. No DOB in peer DTOs. Own profile additionally dob, banned, hidden, mutedUntil, suspended, warning. No secret ids, including in reports/audits/reactions.
Match: {id, mode, peer: Profile, createdAt, lastMessage: string|null, unread: boolean}.

## api.connect
me query({playerId}) -> Profile|null (own extras above).
saveProfile mutation({playerId,campName,dob,modes,prompts,tags,socials,visibility}) -> profileId. Photos attach after initial save; initial incomplete profiles cannot enter deck. DOB validated server 18+; cannot bypass bans by deleting/recreating.
uploadUrl mutation({playerId}) -> string.
attachPhoto mutation({playerId,storageId}) -> null (server verifies storage ownership via upload reservation where possible, MIME/size, max 4; pending).
removePhoto mutation({playerId,storageId}) -> null.
photoUrls mutation({playerId,profileId}) -> {photos:[{storageId,url,status}],expiresAt}; approved only except own/Ranger queue, authorizes relationship/blocks/visibility. TTL <=5 min enforced by HTTP proxy. UI refreshes before expiry.
deck query({playerId,mode}) -> {cards: Profile[], logsLeft:number, marshmallowsLeft:number, backtracksLeft:number, canLog:boolean} (bounded).
swipe mutation({playerId,target:profileId,mode,kind}) -> {matchId: string|null}.
backtrack mutation({playerId,mode}) -> null (do not break established matches).
listMatches query({playerId}) -> Match[].
chat query({playerId,matchId}) -> {match: Match,messages: [{id,body,sticker:string|null,mine:boolean,createdAt,reactions:[{emoji,count,mine}]}],messageCount:number,messagingPaused:boolean,canSend:boolean,challenge:{code:string,target:roomPlayersId}|null}. Unmatched/unauthorized errors are camper-readable; bounded messages.
sendMessage mutation({playerId,matchId,body,sticker?:string}) -> messageId.
react mutation({playerId,messageId,emoji}) -> null (toggle).
markRead mutation({playerId,matchId}) -> null.
unmatch mutation({playerId,matchId}) -> null.
block mutation({playerId,target:profileId}) -> null.
flag mutation({playerId,target:profileId,matchId?:connectMatchesId,messageId?:connectMessagesId,reason}) -> reportId (validate item belongs to reported peer and chat). Report can target profile or specific chat message. Three distinct reporters auto-hide. No private-chat access for Rangers unless chat reported.
notifications query({playerId}) -> [{id:matchId,mode,campName,createdAt}] unacknowledged matches.
ackNotification mutation({playerId,matchId}) -> null.
deleteProfile mutation({playerId}) -> null (remove photos/storage, swipes, messages they sent, blocks, matches, profile; preserve moderation tombstones/audit).
seedHeadRanger INTERNAL mutation({playerId}) bootstrap once only.

## api.connectRangers
me query({playerId}) -> {role:'headRanger'|'ranger'|'gateRanger'}|null.
dashboard query({playerId}) -> {profiles:number,verified:number,matchesToday:number,openReports:number,messagingPaused:boolean,audit:[{id,action,actor:string,target:string|null,createdAt}]}.
lookup query({playerId,campName}) -> Profile[] (bounded; include moderation status, never DOB or playerId).
verify mutation({playerId,target:profileId,verified:boolean}) -> null.
photos query({playerId}) -> [{profile:Profile,storageId,url:string}] (expiring authorized proxy URLs via photoUrls if url empty).
reviewPhoto mutation({playerId,target:profileId,storageId,approve:boolean}) -> null.
reports query({playerId}) -> [{id,reason,campName,target:profileId,matchId:string|null,messageId:string|null,createdAt,context:string,status:string}].
reportedChat query({playerId,reportId}) -> {messages:[{id,body,sticker:string|null,campName,createdAt}]} only reported chat.
resolveReport mutation({playerId,reportId,action:'dismiss'|'warn'|'mute'|'suspend'|'ban',note?:string}) -> null. Review releases auto-hide if no unresolved threshold. All actions append audit atomically.
pauseMessaging mutation({playerId,paused:boolean}) -> null (headRanger only).
setRole mutation({playerId,target:profileId,role:'ranger'|'gateRanger'|null}) -> null (head only).

Gate Ranger verifies/lookup only. Ranger handles queue/reports/warn/mute/suspend; head additionally ban, roles, emergency pause. Every function enforces server permissions.

## Frontend ownership
Parent Hermes: chat page + global ConnectLayer + layout mount + /games and /room entry + verification + report.
Camper UI worker: src/components/connect/ConnectShell.tsx, ConnectPhoto.tsx, Trail.tsx, ProfileEditor.tsx, FireCircle.tsx, connect.css, src/app/connect/{layout,page,profile/page,matches/page}. No chat or global layout changes.
Ranger UI worker: src/components/connect/Ranger*.tsx and src/app/ranger/** only. May import ConnectShell/ConnectPhoto supplied by camper worker. No other shared files.
Backend worker: convex/schema.ts, convex/connect*.ts, convex/http.ts (preserve existing HTTP routes), scripts/connect-test.mjs; generated code only by real Convex CLI. Own DEV sync and Node test, no frontend edits. Communicate contract deviations immediately.
