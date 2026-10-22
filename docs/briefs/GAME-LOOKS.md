# GAME LOOKS — shared design direction (read before any game-look brief)

Goal: every game looks like the real thing on a table at a night-time camp, with the same 3D / motion quality as our homepage campsite (src/components/camp3d/*, @react-three/fiber + three + gsap, already installed).

Look
- Real materials: wooden Ayo board with carved pits and real seeds; real Whot cards (cream card, maroon WHOT back, shape + number corners); real Ocho/UNO-style cards; glossy plastic Connect 4 frame with heavy discs; chess pieces on a wooden board; paper Bingo card with ink-dab marks.
- Scene mood: warm campfire light (orange key light, soft flicker), dark night background with a hint of the brand colours (brand-purple, brand-acid, brand-coral). The game object is the hero, lit like a product shot.
- Brand UI around the game stays as is (poster-border, font-display, bg-brand-*): headers, score boxes, buttons.

Motion (GSAP or R3F frames)
- Every move animates: seeds hop pit to pit when sown, discs drop and bounce, cards deal from the deck, slide to the pile and flip, captured items fly to the score.
- Turn changes pulse the active player; wins get a short celebration (confetti / glow / camera push-in). 300–700 ms per motion; never block the next tap for longer than the motion.
- Respect prefers-reduced-motion (cut to the end state).

Rules for builders
- ONE presentational board/table per game, used by BOTH the vs-computer component and the `XOnline` export. Game rules stay in src/lib/rules/* — do not change rules, props, server code or scoring.
- Phones first: 60 fps on a mid Android. Cap dpr at 1.5, no shadows heavier than one soft shadow, low-poly geometry, procedural textures or small images (< 150 KB each) in public/games/.
- 3D canvases load with next/dynamic (ssr: false) and show the current 2D board while loading; if WebGL is missing, fall back to a polished 2D version.
- Tap targets stay big (min 44 px) and work with touch; the board fits the screen at 360 px wide without scrolling sideways.
- Accessibility: keep aria-labels for every tappable pit / column / card.
- No new dependencies except @react-three/drei if truly needed (ask in QUESTIONS first otherwise).
