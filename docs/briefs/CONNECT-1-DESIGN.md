# Campfire Connect · local design map

2026-10-22 · CONNECT-1

Strategy: friends and game teammates, not dating. A small social space inside the existing MAD SETTINGS night. Keep its heavy display type, cream, coral, acid and black. Keep official TBN attribution. No homepage, game, room or score redesign.

Wireflow: Games / Room → The Trail ↔ Fire Circle ↔ My camp. New campers create a profile, upload 1–4 photos, and see approval/verification guidance. The Trail shows one camper, two prompts and vibe tags. Visible Keep walking / Pull up a Log / Marshmallow / Backtrack controls are equal alternatives to gestures. A mutual Log opens a dismissible match celebration; Tent Talk has icebreaker, text/stickers, reaction controls, Challenge and safety menu. Rangers have live overview/lookup, photos and reports, with only authorized actions.

Tokens: page #05040c (existing); warm surface #211c24; raised #30262f; text #FDFBF7; secondary #d7c6bf; border #72564e. Existing coral #FB7185 for fire accents, acid #BEF264 for verified/success, purple #6D28D9 for minor brand details, cyan #22D3EE for focus. Font: inherited Geist / font-display. 8px rhythm, 16px body, controls >=44px. Cards use poster-border/poster-shadow with a restrained warm edge and soft glow, not bright large fills. Linear's luminance-stepped surfaces inform hierarchy, not its cool palette; local brand and warm brief override it.

Motion: GSAP pointer drag and 220ms fling, merging Lucide flames and sparks on match. prefers-reduced-motion means no drag transforms/flings/celebration movement. All actions remain visible and functional. No new dependencies. Existing sfx.ts missing: TODO markers only, no invented sound import.

Accessibility: semantic forms, explicit labels, status/error live regions, native confirm for destructive actions, wrapping navigation, safe-area padding, visible keyboard focus, no color-only status, polite network-status text. Profile creation is a draft until it has an approved photo. Never display another camper's DOB/secret id; socials only inside matched Tent Talk. Explain that this MVP uses the browser's opaque camper key, not account-grade identity.
