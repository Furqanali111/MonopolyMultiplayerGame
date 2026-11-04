# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Groups of 2 to 6 friends playing a Monopoly-style board game together online, each on their own device. Mixed desktop and phone: some laptop browsers, some phones, so the board and every panel must work at both sizes. They join by sharing a room link, usually in an evening session that runs long. Solo players can also play against computer opponents.

## Product Purpose
A real-time, browser-based property-trading board game with no accounts. Players roll, buy, build, trade, auction and bankrupt each other until one is left. Success is a full game that feels fair, readable and fast, with nobody waiting on a stalled turn or lost after a dropped connection.

## Positioning
Private rooms by link with no sign-up, bots that fill empty seats, and games that survive refreshes, dropped connections and server restarts (identity token, grace period, host handover, forfeit, saved rooms).

## Operating Context
- Turn-based; one player acts at a time while everyone watches the board. State updates arrive as structured events (dice, moves, money, ownership, cards, jail, turn changes) that the UI can animate.
- Players act with a turn timer (90s default); an absent player is played by a stand-in. A deadline event announces whose time is running.
- Lobby: host sets house rules (starting cash, Free Parking pot), adds or removes bots, then starts. After a game: ranked standings with stats, and a host rematch.
- In-room text chat.

## Capabilities and Constraints
- Stack: React 18, Vite, TypeScript, Tailwind, shadcn/ui, Socket.IO client.
- Game logic is shared (src/game) and server-authoritative online; the UI only displays state and sends intents.
- Player IDs are strings. Up to 6 players; each has a colour.
- Terminology is the standard board-game vocabulary (properties, rent, mortgage, houses and hotels, auction, trade, jail).
- Undecided: the product's public name and identity. Because it may go public, it should not rely on Hasbro's name, trademarks or branding; the name and tile names are an open decision for the owner. Keep the product name in one place so it can change.

## Brand Commitments
Palette is pinned by the owner: "Casino noir" (near-black base, gold, felt green, ruby). Animation with Motion and React Bits is requested. No logo, name or voice is established yet.

## Evidence on Hand
Working game, lobby, board and modals in src/. No testimonials, user numbers or brand assets exist; none may be invented.

## Product Principles
- Readable before beautiful: at a glance, whose turn it is, what just happened, what can be done now.
- Motion explains state changes (a roll, a move, a payment, a purchase); it never delays an action the player is waiting to take.
- Nobody is ever stuck: the next action, its deadline and any absent player are always visible.
- Works the same on a phone as on a laptop; no feature is desktop-only.

## Accessibility & Inclusion
Players and property groups are never told apart by colour alone (player pieces carry an initial or shape). Text meets WCAG AA contrast on the dark base; motion respects prefers-reduced-motion.
