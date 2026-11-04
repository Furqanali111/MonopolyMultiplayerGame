---
name: Monopoly Master Edition (working title)
description: A private card room, not a toy board. Lacquered near-black, a felt well, brass hairlines; cash is chips, deeds are playing cards.
colors:
  gold: "#E3B341"
  gold-soft: "#EACF90"
  gold-deep: "#9B7427"
  gold-ink: "#1F1608"
  felt: "#2FA36B"
  felt-light: "#5BB983"
  felt-rim: "#1F5C3E"
  felt-well: "#0F3D27"
  ruby: "#E45367"
  ruby-text: "#E4535D"
  ruby-deep: "#8F0024"
  ground: "#0E1116"
  panel: "#171B22"
  raised: "#1F252E"
  rule: "#2A313C"
  bone: "#F3EFE6"
  slate-muted: "#838D9C"
  slate-300: "#9CA5B4"
  property-brown: "#8B5A3C"
  property-lightblue: "#7CCBF0"
  property-pink: "#E0609E"
  property-orange: "#F28C38"
  property-red: "#DB4B4B"
  property-yellow: "#F2CF45"
  property-green: "#3FAE6A"
  property-blue: "#3D6FD6"
  property-railroad: "#6C7584"
  property-utility: "#9CA5B4"
typography:
  display:
    fontFamily: "Limelight, Hanken Grotesk Variable, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0.02em"
  wordmark:
    fontFamily: "Limelight, Hanken Grotesk Variable, serif"
    fontSize: "clamp(52px, 11vw, 112px)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.02em"
  title:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  figure:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.2
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.25
  tile:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "clamp(8px, 1.28cqw, 12px)"
    fontWeight: 500
    lineHeight: 1.12
rounded:
  hairline: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  card: "14px"
  chip: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.gold-soft}"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.bone}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-destructive:
    backgroundColor: "{colors.ruby}"
    textColor: "{colors.bone}"
    rounded: "{rounded.md}"
    height: "44px"
  button-ghost:
    textColor: "{colors.slate-muted}"
    rounded: "{rounded.md}"
    height: "44px"
  input:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.bone}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "8px 12px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.bone}"
    rounded: "{rounded.md}"
    padding: "12px"
  dialog:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.bone}"
    rounded: "{rounded.lg}"
    padding: "24px"
  seat-current:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  deed-pip:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.bone}"
    rounded: "{rounded.sm}"
    height: "24px"
  dice-tray:
    backgroundColor: "{colors.felt-well}"
    rounded: "{rounded.chip}"
  die:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ground}"
    rounded: "7px"
  deed-card:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ground}"
    rounded: "{rounded.card}"
    padding: "20px"
---

# Design System: Monopoly Master Edition (working title)

Open owner decision: the public product name lives in `src/lib/brand.ts` (`PRODUCT_NAME`, `PRODUCT_DESCRIPTOR`, currently "Monopoly" / "Master Edition") and is not final; a public product should not rely on Hasbro's name or marks. Every screen reads it from that one file, so renaming is a one-line edit and this document's title is provisional. React Bits components in use are exactly two: `ClickSpark` (purchase spark on the primary action) and `Noise` (felt grain on the well and the home screen). Motion (`motion/react`) drives all other animation.

## Overview

**Creative North Star: "The Private Card Room"**

A lacquered near-black table with a felt well, brass-tinted hairlines and bone-white type. Cash is chips, players are chips, deeds are playing cards. Surfaces are flat fills with 1px rules and 6px corners; depth comes from tone and from inset felt, not from glows. It is an operating tool for a live game: at a glance a player knows whose turn it is, the deadline, what just happened, and the one gold button they can press.

Density is medium and utilitarian: a square board at centre, a right column of seats, action panel and log/chat; on phones the board sits on top with a sticky bottom action bar and a tabbed sheet. Motion is functional and short (150-250ms state changes, 0.7s count-ups, 0.8s chip flights) and every motion respects reduced-motion.

**Key Characteristics:**
- One filled gold action per view; everything else is outline, secondary or ghost.
- Chips are the recurring object: pawns, cash flights, bid tokens.
- Felt green is the table and success; ruby is rent, danger and urgency.
- Limelight is a rare display voice; Hanken Grotesk does all the work, with tabular numerals.
- Flat fills, 1px rules, no neon glow, no glass, no gradient text.

## Colors

A dark, nearly monochrome cool-slate room with one warm brass accent, a green table and a red alarm.

### Primary
- **Brass Gold** ({colors.gold}): the single filled action colour, the current-player border and pawn ring, the countdown ring, focus ring, caret, selection tint, full-set star. Hover shifts to **Pale Brass** ({colors.gold-soft}). Text on gold is **Gold Ink** ({colors.gold-ink}, the `--primary-foreground`). **Aged Brass** ({colors.gold-deep}) is defined but reserved.

### Secondary
- **Table Felt** ({colors.felt}): success and the accent token; **Felt Light** ({colors.felt-light}) for positive money deltas and the connected dot; **Felt Well** ({colors.felt-well}) is the board's centre fill with **Felt Rim** ({colors.felt-rim}) as its inner rule.

### Tertiary
- **Rent Ruby** ({colors.ruby}): destructive fills, hotels, mortgaged badge. **Ruby Text** ({colors.ruby-text}) for negative deltas, jail, bankrupt, urgent countdown (10s or less), disconnected. **Ruby Deep** ({colors.ruby-deep}) is defined, reserved.

### Neutral
- **Lacquer Ground** ({colors.ground}): page, board field, input fill.
- **Panel Ink** ({colors.panel}): cards, seats, tiles, dialogs.
- **Raised Ink** ({colors.raised}): hover and secondary-button fill.
- **Brass-tinted Rule** ({colors.rule}): every 1px border and scrollbar thumb.
- **Bone** ({colors.bone}): foreground text, dice faces, deed cards.
- **Slate Muted** ({colors.slate-muted}): secondary text and ghost buttons; **Slate 300** ({colors.slate-300}) for tile icons.

### Property groups
Ten board colours tuned for the dark ground (`property-*` tokens, mirrored as `PROPERTY_HEX` in `kit.tsx`). They appear only as tile bands, deed pips and deed-row spines, never as UI accents.

### Named Rules
**The One Gold Button Rule.** Gold is the only filled action colour and appears as one primary per view. Cash figures, tags and labels stay bone.
**The Felt Is The Table Rule.** Green means the table or a gain; red means rent, loss or danger. Do not use either as decoration.
**The Colour Is Never Alone Rule.** Players are told apart by the initial on their chip, not by colour.

## Typography

**Display Font:** Limelight (Hanken Grotesk, serif fallback)
**Body Font:** Hanken Grotesk Variable (system-ui, sans-serif)
**Label/Mono Font:** Hanken Grotesk with `tnum`; monospace only for the room code.

**Character:** Art-deco capitals as a rare marquee over a quiet humanist grotesk. Numbers are always tabular so money does not jitter.

### Hierarchy
- **Display** (400, 2.25rem / text-4xl, 1.25): Limelight, only the three screen titles: "Pick your name", "Take a seat", and the winner line.
- **Wordmark** (400, clamp(52px, 11vw, 112px), 0.95): home screen; at 18px (text-lg) in the top bar; scaled with the board (`3.6cqw`, 14-34px) in the well.
- **Title** (600, 1.125rem, tight): dialog titles.
- **Body** (400, 14px, 1.43): descriptions and log; muted text uses Slate Muted.
- **Figure** (600, 17px, tabular): player cash via `Money`.
- **Label** (600, 11-13px, sentence case): `PanelTitle` (13px muted), pips, "you" tag. Never uppercase, never tracked.
- **Tile** (500, clamp 8-12px by container width): board names and prices; hidden when the board is under 520px wide.

### Named Rules
**The Marquee Rule.** Limelight appears only for the wordmark and the three screen titles. Nothing else gets the display face.
**The Tabular Money Rule.** Every dollar figure is tabular and goes through `Money` where it can change.

## Layout

A standard app shell: top bar (wordmark, room code, turn countdown ring), a square board that takes the available width, and a right column of seats, action panel and log/chat tabs. The board is a CSS size container, so tile type, dice, icons and pawns scale with the board width (`cqw` units), not the viewport. The grid is 11 by 11 tracks with 1.5fr corners (`1.5fr repeat(9, 1fr) 1.5fr`); the 9 by 9 centre is the felt well. On phones the board stacks on top, the action panel is `sticky bottom-0` with safe-area padding, and players, log and chat live in a tabbed sheet. Spacing follows the Tailwind 4px scale (gaps 6, 8, 12, 16; panel padding 12-14px, dialog 20/24px). Touch targets are 44px high on mobile and 40px at `md`. Layout containers use `container` with 1rem padding, 1400px at 2xl.

## Elevation & Depth

Flat by default; depth is tonal (ground, panel, raised) plus inset felt. There are no glows. Shadows are limited to physical objects and the modal.

### Shadow Vocabulary
- **Brass Rule** (`box-shadow: inset 0 0 0 1px hsl(var(--gold) / 0.22)`): hairline around the board.
- **Felt Well** (inset 1px felt-rim, inset 4px felt-well, inset 5px gold at 28%, inset 0 8px 24px rgba(0,0,0,.38)): the recessed table centre.
- **Dice Tray** (`inset 0 6px 14px rgba(0,0,0,.5), inset 0 0 0 1px gold/.22`): the pill tray the dice sit in.
- **Chip Lift** (`0 1px 0 rgba(0,0,0,.6), 0 3px 6px -2px rgba(0,0,0,.7), inset 0 0 0 1.5px rgba(14,17,22,.55)`): pawns and flying chips.
- **Modal** (`0 28px 70px -24px rgba(0,0,0,.85)` on an overlay of `hsl(218 30% 4% / .78)`): dialogs only.
- **Owner Ring** (`inset 0 0 0 1.5px <player colour>`): owned tile outline.

### Named Rules
**The Flat Until Physical Rule.** A surface gets a shadow only if it is an object on the table (chip, die, modal), never a card or panel.

## Shapes

Small, near-square corners: panels, seats, tiles, buttons and inputs use 6px (`--radius` 0.375rem; md 4px, sm 2px derived). Deed pips are 3-4px, colour swatches 1-2px. Chips, pawns, the dice tray and status dots are full circles/pills. Dice are 7px rounded squares. Playing-card deeds are 14px with an inset 9px border line, the one deliberate departure from 6px, because they are cards. Pawns are solid colour with a dashed inner edge and the player's initial, like a casino chip.

## Components

### Buttons
- **Shape:** 6px radius, 44px high on touch / 40px at md; `lg` is 48px, 15px text; `sm` 36px.
- **Primary:** Brass Gold fill, Gold Ink text, semibold; hover to Pale Brass. One per view; in the action panel it is full width.
- **Secondary:** Raised Ink fill with a 1px rule; hover shifts the border to gold at 40%.
- **Outline / Ghost / Destructive / Link:** outline hovers border gold/50; ghost is muted text that brightens; destructive is Rent Ruby.
- **Focus / press:** 2px gold ring with 2px offset from the ground; active moves down 1px; disabled is 40% opacity.

### Inputs / Fields
44px/40px, Lacquer Ground fill, 1px rule, 6px radius, tabular numerals, gold caret and gold 2px focus ring.

### Panels and Seats
Panel Ink with a 1px rule and 6px radius. The current player's seat gets a gold/60 border and a 6% gold wash; bankrupt seats drop to 45% opacity. A seat shows chip pawn (34px), name, location, cash via `Money`, and deed pips.

### Deed pips
24px-high chips on Lacquer Ground with a colour swatch, count, a gold star for a full set and `+n` buildings; mortgaged groups at 50% opacity.

### Dialogs
Panel Ink, 1px rule, 8px radius, 20/24px padding, max 512px, scrim at 78% near-black. Trade, auction, bankruptcy and deed dialogs share this shell; deeds render as bone playing cards.

### Chip pawn and chip flights (signature)
`Pawn` is the player: colour fill, dashed inner ring, initial. `Money` counts to the new value over 0.7s and floats a green or ruby delta. `ChipFlights` sends up to five 18px chips (one per about $100) from payer to payee seat, or between a seat and the well for bank events. A purchase fires a brief gold `ClickSpark`. All of it is skipped under reduced motion.

### Dice and countdown
Two bone dice (pips in ground colour) tumble in the felt tray and settle with a spring; "Doubles, roll again" appears in gold. `CountdownRing` is a gold ring that drains and turns ruby at 10 seconds.

## Do's and Don'ts

### Do:
- **Do** keep exactly one gold filled button per view and make it the next legal action.
- **Do** show money moving: use `Money` and `ChipFlights` for every cash change.
- **Do** pair colour with the player's initial or a label.
- **Do** keep type sentence case, tabular numerals for money, and Limelight to the three titles and the wordmark.
- **Do** use 1px rules at `{colors.rule}` and 6px corners; shadow only physical objects.
- **Do** read the product name from `src/lib/brand.ts`.

### Don't:
- **Don't** add neon glow, glass cards, gradient text or emoji icons.
- **Don't** use ruby or felt as decoration; they carry meaning.
- **Don't** use uppercase eyebrows or kickers above titles.
- **Don't** set cash figures or tags in gold.
- **Don't** introduce a second filled accent button style.

### Not canonized (defects the build carries)
- Board micro-text below 9px (mortgaged "M" badge 7px, owner initial down to 5px) is a legibility defect, not a size to reuse.
- The die's `0 2px 0 #B9B4A6` hard offset edge and the pawn's `0 1px 0` are hard offset shadows; they are not a system rule for other surfaces.
- The dice-tray fill `hsl(151 62% 9%)` is a one-off literal that differs from Felt Well.
