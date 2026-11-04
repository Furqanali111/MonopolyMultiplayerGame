# Monopoly Backend

Backend server for Monopoly Multiplayer Game using Node.js, Express, and Socket.IO.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Run development server:
```bash
npm run dev
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run lint` - Run ESLint

## API Endpoints

### HTTP
- `GET /health` - Health check endpoint

### Socket.IO Events

#### Authentication
- `auth:login` - Login with username

#### Room Management
- `room:create` - Create new room
- `room:join` - Join existing room
- `room:leave` - Leave room
- `room:ready` - Toggle ready status
- `room:start` - Start game (host only)

#### Game Actions
- `game:rollDice` - Roll dice
- `game:buyProperty` - Buy property
- `game:declineProperty` - Decline property
- And more... (to be implemented)

## Project Structure

```
backend/
├── src/
│   ├── server.ts           # Main server file
│   ├── types/              # TypeScript types (TODO)
│   ├── managers/           # Business logic (TODO)
│   ├── handlers/           # Socket handlers (TODO)
│   └── utils/              # Utilities (TODO)
├── dist/                   # Compiled JavaScript
├── package.json
├── tsconfig.json
└── .env
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS
- `NODE_ENV` - Environment (development/production)

## Development

The server uses:
- TypeScript for type safety
- Nodemon for hot reload
- Socket.IO for real-time communication
- Express for HTTP endpoints

## Deployment

Deploy to Railway:
```bash
railway login
railway init
railway up
```
