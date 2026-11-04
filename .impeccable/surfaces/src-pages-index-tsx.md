---
version: 1
slug: "src-pages-index-tsx"
primary_target: "src/pages/Index.tsx"
related_targets: []
---

## Scope and mode
Whole app, Operate: lobby, setup, game table, modals, game over. Players mix desktop and phone.

## Direction contract
THESIS: A private card room, not a toy board. The table is lacquered near-black with a felt well and brass hairlines; cash is chips, deeds are playing cards. Refuses neon glow, glass cards, gradient text and emoji icons.

OWN-WORLD: Ground #0E1116, panels #171B22 with 1px #2B323D rules, bone text #F3EFE6, slate muted #838D9C. Gold #E3B341 is the single filled action colour; elsewhere it only marks state with a line or ring (current seat, active pawn, deadline ring, selected choice, full-set star). Cash, tags and figures stay bone; felt #2FA36B / deep felt #004318 is the table and success; ruby #E45367 is rent and danger. Type: Limelight (deco capitals) only for the wordmark and three screen titles (Pick your name, Take a seat, the winner); Hanken Grotesk everywhere else, tabular numerals for money. Flat fills, 1px brass-tinted rules, small 6px radii, no soft glows. Chips are the recurring object: pawns, cash, and bid tokens.

STORY: Within a second the player knows whose turn it is, their deadline, what just happened, and the one thing they can do next (one gold button).

FIRST VIEWPORT (desktop): top bar with room code and turn deadline; square board centre with a felt well holding the dice tray and last-event line; right column with players (chip pawn, cash, deed pips, status), then the action panel with a single gold primary, then log/chat tabs. Phone: board on top, fixed bottom action bar, tabbed sheet for players, log, chat.

FORM: Standard app shell (top bar, board, side panel; bottom sheet on phone). Controls are standard buttons, tabs, inputs. Seed: none (pinned direction).

SIGNATURE: Cash as chips. Money changes animate as chips sliding between a player and the table with a tick-up count; a purchase fires a brief gold chip spark. Dice settle in the felt tray.

RISK: Gold plus near-black can read as a generic luxury template; the chip and felt specifics and strict one-gold-button rule keep it a working game.
