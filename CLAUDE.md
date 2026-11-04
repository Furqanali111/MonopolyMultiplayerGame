# Monopoly Multiplayer Game: Project Context

Pinned context for every session in this repo. Read first.

## The project

- **What**: A real-time, browser-based Monopoly game. Single player vs AI, and online multiplayer (2-6 players) through shareable room codes.
- **Owner**: Furqan Ali (GitHub: `Furqanali111/MonopolyMultiplayerGame`, remote `origin`).
- **Status**: Single player is complete. Multiplayer is in progress: guest login, rooms, lobby and ready status, server-side game start and the game action handlers exist. Still open: host migration on disconnect, reconnection, persistence, full sync polish, deployment.
- **Audience**: Friends playing casually in a browser, desktop first, mobile layout must not break.
- **Deployment target**: Railway free tier. Express serves the built frontend (`dist/`) in production, so one service hosts both.

## Tech stack (decided)

- **Frontend**: React 18 + TypeScript + Vite 7 (SWC), Tailwind CSS 3, shadcn/ui (Radix), lucide-react, sonner toasts, react-router-dom. Path alias `@` = `src/`.
- **Backend**: Node + Express + Socket.IO 4 in `backend/` (CommonJS, `ts-node` + `nodemon` in dev). Default port 3001.
- **Realtime**: `socket.io-client` through `src/services/socket.ts`. URL comes from `VITE_BACKEND_URL`, falls back to `window.location.origin`.
- **State**: React hooks only. No Redux, no external state store. In-memory `Map`s on the server (`sessions`, `rooms`). No database.
- **Scaffolded with Lovable** (`lovable-tagger` is in dev deps). Package name is still `vite_react_shadcn_ts`.

## Architecture: the one rule that matters

**The game engine is shared and the server is authoritative.**

- `src/game/engine.ts` (pure game rules), `constants.ts` (board, cards), `types.ts`, `ai.ts` are the single source of truth.
- The backend imports them directly from `../../src/game/*` (see `backend/tsconfig.json`, `rootDir: ".."`). The old copies in `backend/src/game/` were deleted on purpose. **Never re-create a second copy of the engine.**
- Engine functions mutate or return `GameState` and must stay free of React, DOM, socket and Node APIs so both sides can run them.
- In multiplayer the client never decides an outcome. It emits an intent, the server validates and runs the engine, then broadcasts the new `gameState`. Dice are rolled server-side (`rollTwo()` in `server.ts`).
- Single player runs the same engine locally in the browser, with AI from `ai.ts`.

### Server layout (`backend/src/server.ts`)

- Lobby events: `auth:login`, `room:create`, `room:join`, `room:leave`, `room:ready`, `room:start`.
- Game events go through one wrapper, `game(event, rule, run)`. It finds the room, checks phase, checks who is acting, runs the engine, broadcasts, and replies with `game:error` on rejection. **Add new game actions through `game()`**, never with a bare `socket.on` that skips the checks.
- Current actions: `rollDice`, `rollForJail`, `payJailFine`, `useJailCard`, `endTurn`, `buyProperty`, `declineProperty`, `buildHouse`, `sellHouse`, `mortgage`, `unmortgage`, `placeBid`, `passAuction`, `proposeTrade`, `acceptTrade`, `declineTrade`, `attemptPayment`, `declareBankruptcy`.
- README describes a future `managers/` and `handlers/` split. It does not exist yet. Do not do that refactor unless asked.

### Frontend layout (`src/`)

- `pages/Index.tsx` is a simple screen state machine: `home | setup | game | gameover | login | lobby`. No router-per-screen.
- `components/screens/`: Home, Setup, Login, Lobby, Game, GameOver. `components/game/`: board, dice, panels, auction, trade, bankruptcy, cards, log. `components/ui/` is shadcn: do not hand-edit, regenerate with the shadcn tooling.
- Reuse these before adding anything new. `GameScreen` has to work for both local (single player) and online state.

## Commands

```bash
npm install            # frontend deps (run `npm install` in backend/ too)
npm run dev            # frontend (vite) + backend (nodemon) together via concurrently
npm run dev:frontend   # vite only
npm run dev:backend    # backend only
npm run build          # vite build to dist/
npm run lint           # eslint
cd backend && npm run build && npm start   # production build and run
```

There is **no test suite** yet. Verify engine changes by running a real game (single player and, for multiplayer, two browser tabs against the dev server).

## Known gotchas

- **Ports**: frontend is **8080** (`vite.config.ts`), backend is **3001**. `FRONTEND_URL` (CORS) defaults to `http://localhost:8080` in `server.ts` and `backend/.env.example`. Change a port in all three places together.
- `.env` holds `VITE_BACKEND_URL` only. Never commit real secrets. Backend env (`PORT`, `FRONTEND_URL`) is read via `dotenv` from `backend/`.
- `backend/tsconfig.json` has `strict: false` and the server uses `any` heavily. Do not tighten types as a drive-by change.
- Server state is in memory: a restart wipes all rooms and games.
- The built output path in `server.ts` is `../../../../dist` relative to `backend/dist/backend/src/`. Changing `outDir` or `rootDir` breaks static serving.
- Docs `CHANGELOG.md`, `FIXES_AND_IMPROVEMENTS.md`, `UI_LAYOUT_FIXES.md`, `UI_UX_IMPROVEMENTS.md` are history of past fixes. Read `CHANGELOG.md` before touching rent, monopoly, jail, bankruptcy or doubles logic, those were bugs before.

## Game rules reference (decided behavior, do not "fix")

- Landing exactly on GO pays $200 (same as passing it).
- A monopoly can include mortgaged properties. You just cannot build until all in the set are unmortgaged.
- Three doubles in a row sends the player to jail. Doubles count resets at end of turn.
- Bankrupt players are eliminated, assets go to the creditor or the bank. Money never goes negative.
- Get Out of Jail Free cards return to the bottom of their deck when used.
- Chance "nearest Railroad" pays 2x rent, "nearest Utility" pays 10x the dice roll.
- Start money $1500, 32 houses, 12 hotels.

## Working style

- Ponytail mode / lazy senior dev: smallest change that fully works. No premature abstraction. Reuse existing components and the shared engine first.
- Keep the engine pure and deterministic where possible (inject dice, do not call `Math.random` inside rules).
- Fix root causes in the engine, not in the UI. A rule bug fixed only in one screen will come back in multiplayer.
- Never use em dashes in generated text, comments, commit messages or docs. Use a comma, colon, or rewrite.

## Git workflow

- `develop` is the source of truth for ongoing work. `master` is production only and only receives release merges.
- **Never push to `develop`, `master` or any `release/*` directly.** Every change goes through a PR.
- `release/vX.Y.Z` branches are cut from `develop`, stabilised there, deployed from there, then merged to `master` and tagged.
- Branch names: `feature/<short-title>`, `defect/<short-title>`, `hotfix/<short-title>` (hotfix is cut from the latest `release/*` or `master`). Lowercase kebab-case, 50 chars max after the prefix.
- Rebase onto latest `develop` before opening a PR (never merge `develop` into a feature branch). Squash-merge only.
- Hotfixes are back-ported to `develop` via a second PR.
- No force-push on shared branches.
- Conventional Commits, one-line subject only (`feat(server): ...`, `fix(engine): ...`, `docs: ...`). Explanation goes in the PR body.
- Before handing a code PR back, run the `ponytail:ponytail-review` skill on the diff and apply its findings.

## Skills to use

| Task | Invoke first |
|---|---|
| Any code change | `ponytail:ponytail` (always on) |
| New feature / screen | `superpowers:brainstorming` |
| Bug, desync, broken build | `superpowers:systematic-debugging` |
| Multi-file change | `superpowers:writing-plans`, then `superpowers:executing-plans` |
| New UI component or screen | `taste-skill:taste-skill`, `21st:21st-ui` |
| Visual polish | `taste-skill:soft-skill`, `impeccable:impeccable` |
| Accessibility check | `design:accessibility-review` |
| Verifying the UI in a browser | `frontend-visual-qa:frontend-visual-qa` |
| Any chart or stat tile | `dataviz` |
| Before merging | `engineering:code-review` + `ponytail:ponytail-review` |
| Finishing a branch | `superpowers:finishing-a-development-branch` |
| Session start | `claude-mem:mem-search` |
| Session end | `claude-mem:handoff` |
