# Monopoly Multiplayer Game 🎲

A modern, real-time multiplayer Monopoly game built with React and Node.js. Play with friends from anywhere in the world!

## 🎮 Game Modes

- **Single Player** - Play against AI opponents (existing)
- **Online Multiplayer** - Play with friends via shareable room links (in development)

## ✨ Features

### Current Features (Single Player)
- ✅ Full Monopoly game implementation
- ✅ AI opponents with difficulty levels
- ✅ Beautiful modern UI with animations
- ✅ Property trading system
- ✅ Auction system
- ✅ Bankruptcy management
- ✅ Chance and Community Chest cards
- ✅ Jail mechanics
- ✅ Building houses and hotels

### Upcoming Features (Multiplayer)
- 🚧 Guest login system
- 🚧 Private room creation with shareable links
- 🚧 Real-time gameplay synchronization
- 🚧 Host migration on disconnect
- 🚧 Lobby system with ready status
- 🚧 Turn-based multiplayer for 2-6 players

## 🏗️ Architecture

### Frontend
- **Framework:** React + TypeScript + Vite
- **Styling:** TailwindCSS
- **State Management:** React Hooks + Context
- **Real-time:** Socket.IO Client

### Backend (In Development)
- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Real-time:** Socket.IO
- **Deployment:** Railway (free tier)

### Project Structure
```
MonopolyMultiplayerGame/
├── src/                          # Frontend
│   ├── game/                     # Game logic (shared)
│   │   ├── engine.ts            # Core game mechanics
│   │   ├── types.ts             # TypeScript types
│   │   ├── constants.ts         # Game constants
│   │   └── ai.ts                # AI logic
│   ├── components/
│   │   ├── game/                # Reusable game components
│   │   │   ├── GameBoard.tsx
│   │   │   ├── Dice.tsx
│   │   │   ├── PlayerPanel.tsx
│   │   │   ├── ActionPanel.tsx
│   │   │   ├── AuctionModal.tsx
│   │   │   ├── TradeModal.tsx
│   │   │   └── BankruptcyModal.tsx
│   │   └── screens/             # Screen components
│   │       ├── HomeScreen.tsx
│   │       ├── SetupScreen.tsx
│   │       ├── GameScreen.tsx
│   │       └── GameOverScreen.tsx
│   ├── services/                # External services
│   │   └── socket.ts            # Socket.IO client (TODO)
│   └── pages/
│       └── Index.tsx            # Main app entry
└── backend/                      # Backend (TODO)
    ├── src/
    │   ├── server.ts            # Express + Socket.IO server
    │   ├── types/               # Shared types
    │   ├── managers/            # Business logic
    │   │   ├── RoomManager.ts
    │   │   ├── GameManager.ts
    │   │   └── PlayerManager.ts
    │   ├── handlers/            # Socket event handlers
    │   │   ├── authHandler.ts
    │   │   ├── roomHandler.ts
    │   │   └── gameHandler.ts
    │   └── utils/
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Codroon/MonopolyMultiplayerGame.git
cd MonopolyMultiplayerGame
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Run the development server**
```bash
npm run dev
```

4. **Open in browser**
```
http://localhost:5173
```

### Backend Setup (Coming Soon)

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Run development server
npm run dev
```

## 📋 Multiplayer Implementation Roadmap

### Phase 1: Backend Foundation (Week 1)
- [ ] Set up Node.js + Express + Socket.IO server
- [ ] Implement RoomManager (create, join, leave)
- [ ] Implement basic authentication (guest login)
- [ ] Create room code generation system
- [ ] Test WebSocket connections

### Phase 2: Frontend Integration (Week 2)
- [ ] Install Socket.IO client
- [ ] Create SocketContext for React
- [ ] Build LoginScreen component
- [ ] Build MainMenuScreen with mode selection
- [ ] Build JoinRoomScreen
- [ ] Build LobbyScreen with player list
- [ ] Implement room creation and joining
- [ ] Add shareable link copy functionality

### Phase 3: Game Synchronization (Week 3)
- [ ] Move game logic to backend (server-authoritative)
- [ ] Implement game state synchronization
- [ ] Add turn management system
- [ ] Connect GameScreen to Socket.IO
- [ ] Emit game actions to server
- [ ] Listen for state updates from server
- [ ] Disable UI when not player's turn

### Phase 4: Advanced Features (Week 4)
- [ ] Implement host migration system
- [ ] Handle player disconnections
- [ ] Add reconnection logic
- [ ] Implement game pause/resume
- [ ] Add loading states and error handling
- [ ] Polish UI/UX

### Phase 5: Deployment (Week 5)
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Set up environment variables
- [ ] Test with real users
- [ ] Bug fixes and optimizations

## 🎯 Multiplayer Design Decisions

### Guest Login
- No passwords required
- Username only (3-15 characters)
- Session-based authentication
- No persistent accounts (for MVP)

### Room System
- Private rooms only (no public listing)
- Unique room codes (e.g., "GAME-1234")
- Shareable links for easy joining
- Max 6 players per room
- Host controls game start

### Host Migration
When host disconnects:
1. Game pauses
2. Offer host role to remaining players
3. 30-second timeout
4. First to accept becomes new host
5. If all reject or timeout → Game ends

### Game State
- Server is source of truth
- All game logic runs on server
- Clients send actions, server validates
- Prevents cheating
- Real-time sync to all players

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Socket.IO Client** - Real-time communication
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Socket.IO** - WebSocket server
- **TypeScript** - Type safety

### Deployment
- **Frontend:** Vercel (free)
- **Backend:** Railway (free tier)

## 📦 Scripts

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Backend (Coming Soon)
```bash
npm run dev          # Start development server with nodemon
npm run build        # Compile TypeScript
npm start            # Run production server
```

## 🎮 How to Play

### Single Player Mode
1. Click "Start Game" on home screen
2. Select number of AI opponents (1-5)
3. Choose difficulty (Easy/Medium)
4. Play Monopoly!

### Multiplayer Mode (Coming Soon)
1. Enter username
2. Create room or join with code
3. Share room link with friends
4. Wait in lobby for players to join
5. Host starts game when ready
6. Play Monopoly together!

## 🔧 Development

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting (recommended)
- Functional components with hooks

### State Management
- React Context for global state
- Local state with useState
- Server state synced via Socket.IO (multiplayer)

### Component Guidelines
- Keep components small and focused
- Reuse components between game modes
- Use TypeScript interfaces for props
- Add loading and error states

## 🐛 Known Issues

### Current
- None (single player mode is stable)

### Multiplayer (In Development)
- Backend not yet implemented
- Multiplayer screens not yet built
- Socket.IO integration pending

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is for educational purposes.

## 🙏 Acknowledgments

- Classic Monopoly game by Hasbro
- React and TypeScript communities
- Socket.IO for real-time communication

## 📞 Contact

- GitHub: [@Codroon](https://github.com/Codroon)
- Repository: [MonopolyMultiplayerGame](https://github.com/Codroon/MonopolyMultiplayerGame)

## 🗺️ Future Enhancements

### Short Term (Next 3 Months)
- ✅ Complete multiplayer implementation
- 🔄 Add user accounts (optional)
- 🔄 Add game history/statistics
- 🔄 Improve mobile responsiveness

### Long Term (6+ Months)
- 🎯 Add custom game modes (Speed Monopoly, House Rules)
- 🎯 Tournament system
- 🎯 Leaderboards
- 🎯 Spectator mode
- 🎯 Mobile app (React Native)
- 🎯 Voice chat integration
- 🎯 Replay system

---

**Current Version:** 1.0.0 (Single Player)  
**Next Version:** 2.0.0 (Multiplayer MVP)  
**Status:** 🚧 In Active Development

**Last Updated:** January 2026
