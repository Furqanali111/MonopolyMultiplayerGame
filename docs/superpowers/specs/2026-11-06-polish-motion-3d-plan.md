# Launch polish plan: motion, sound and 3D

Goal: make the game feel designed, not assembled. Players should feel weight when the dice land, a token that walks the board, and money that moves.

## What already exists (do not rebuild)

- `motion` v14 for animation. Pawn already hops tile by tile (`PawnSprite` in `GameBoard.tsx`), dice tumble (`Dice.tsx`), chip flights (`ChipFlights.tsx`), floor by floor buildings.
- `src/services/sound.ts`: ~30 named cues with real samples in `public/sounds` and synth fallback, mute toggle.
- `src/game/` has `GameEvent` and `diffEvents`: one place that turns a state change into events.

So the gaps are: flat 2D pawns and dice, no music or ambience, no mixer, no card or screen transitions, no shared motion language. 3D is the last layer, not the first.

## Approach (recommended): 2.5D

Keep the DOM board (crisp text, accessible, already works on mobile). Tilt it with CSS perspective. Overlay one transparent react-three-fiber canvas that draws only the tokens and the dice. Lazy-load it so the home screen stays light. If WebGL is missing, the device is weak, or reduced motion is on, fall back to today's 2D pawns and dice.

Rejected: a full 3D board. It costs text legibility, deed clicking, accessibility and mobile performance for little extra effect.

## Rule that keeps multiplayer safe

Animation and sound are driven only from `diffEvents(prev, next)`. The server stays authoritative. The 3D dice do not simulate physics: the server rolls, the client plays a tumble that ends on the known faces. No physics engine, no desync.

## Phases (each is one PR off `develop`)

### 0. Art direction and motion tokens (0.5 day)
- Pick the look: one board palette, one gold accent, one shadow style, one font pairing. Run `taste-skill` and `impeccable` on the existing screens, write `DESIGN.md`.
- Motion tokens in one file `src/lib/motion.ts`: 3 durations (fast 150ms, base 300ms, slow 600ms), 2 easings, 1 spring. Every animation after this uses them.
- Done when: a one page spec and the tokens file exist.

### 1. 2D motion pass (2 to 3 days)
Cheapest and biggest visible win. All with `motion`, all respect `useReducedMotion`.
- Screen transitions between `home | setup | game | lobby | gameover` (`Index.tsx`, `AnimatePresence`).
- Turn banner sweep ("Your turn") and active player panel glow.
- Money counters roll up and down; floating `+$200` / `-$150` at the player panel.
- Card draw: Chance and Community Chest flip in from the centre, hold, then slide to the deck (`CardDisplay.tsx`).
- Property buy: deed lifts, stamps the owner colour onto the tile.
- Jail: bars slam down on the tile; GO: gold ring burst.
- Auction gavel, trade swap animation, bankruptcy fade to grey, win screen confetti.
- Board hover and click feedback on tiles.

### 2. Audio system (1.5 days)
- Add a mixer to `sound.ts`: `music`, `sfx`, `ui` buses with separate volume, saved in localStorage; settings popover with 3 sliders plus mute.
- Background music loop (one calm lounge track, CC0 or licensed, under 1.5 MB, loops cleanly) that ducks 60% under dice, card and win cues.
- Missing cues: your-turn ping, button hover and press, deed flip, token hop pitch rising per step, countdown ticks on auctions, lobby join and ready.
- Start audio only after first user gesture (browser rule); stop when tab is hidden.
- Add credits to `public/sounds/CREDITS.md`.

### 3. 3D tokens (3 to 4 days)
- Add `three`, `@react-three/fiber`, `@react-three/drei` in a lazy chunk (`React.lazy`, loaded when entering `game`).
- 6 classic tokens (top hat, car, dog, ship, boot, iron). Source as CC0 GLB or build from lathe geometry; budget under 60 KB each, Draco compressed. Tinted with `PLAYER_COLORS`, one extra ring so colour blind players can tell them apart.
- Overlay canvas sits above the board, `pointer-events: none`, same coordinates as `centerOf()` so it reuses today's board math.
- Movement: per tile hop arc with squash on landing, a soft contact shadow, camera nudge on arrival at corners. Jail is a straight slide, not a walk (matches current behaviour).
- Board tilt: CSS `rotateX(18deg)` with perspective, eased in when the game starts; tiles stay readable at this angle.
- Fallback: current `Pawn` component when WebGL fails, `prefers-reduced-motion`, or measured FPS drops below 40 for 2 seconds.

### 4. 3D dice (1.5 days)
- Two cubes in the same canvas, thrown from the roller's panel, tumble, settle on the server values. Pre-authored rotation curves per face so the end orientation is exact.
- Replace the 2D `Dice` visual but keep its props (`values`, `isRolling`) so `GameScreen` does not change. `dice` and `clack` cues fire on throw and on landing.
- Fallback to the current 2D dice.

### 5. Performance, mobile, QA (2 days)
- Cap pixel ratio at 2, `frameloop="demand"` when nothing moves, dispose geometries on unmount.
- Budgets: 3D chunk under 350 KB gzip, first interactive unchanged on home screen, 60 FPS on a mid phone, 30 minute game with no memory growth.
- Test matrix: Chrome, Safari iOS, Firefox, one low end Android. Two tab multiplayer run to confirm both sides see the same moves.
- Run `frontend-visual-qa`, `design:accessibility-review`, then `ponytail-review` on each PR.

## Order and total

0 -> 1 -> 2 -> 3 -> 4 -> 5. Phases 1 and 2 are independent and can run in parallel; both ship value without any 3D. Roughly 11 to 13 working days. If time is tight, ship after phase 2 and treat 3 to 5 as the "v1.1 wow" release.

## Risks

- Token models: good free ones are scarce. Fallback is lathe built shapes, less pretty but zero licensing risk. Decide before phase 3.
- Music licensing: use CC0 or paid licence, record it in `CREDITS.md`.
- Overlay alignment: canvas and DOM board must resize together; test at odd window sizes and mobile rotation.
- Bundle size: keep three.js out of the main chunk.

## Decisions needed from you

1. 2.5D overlay (recommended) or a full 3D board?
2. Token models: sourced GLB, or procedural shapes?
3. Music: want it at all, and what mood (jazzy lounge, upbeat, chill)?
4. Ship after phase 2 first, or hold launch for the 3D?
