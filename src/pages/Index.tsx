import React, { useState, useEffect } from 'react';
import { resumeSession, leaveRoom, Room, type FinalStanding } from '@/services/socket';
import { AIDifficulty, DEFAULT_RULES, GameState, HouseRules } from '@/game/types';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { SetupScreen } from '@/components/screens/SetupScreen';
import { GameScreen } from '@/components/screens/GameScreen';
import { GameOverScreen } from '@/components/screens/GameOverScreen';
import { LoginScreen } from '@/components/screens/LoginScreen';
import { LobbyScreen } from '@/components/screens/LobbyScreen';
import { motion, useReducedMotion } from 'motion/react';
import { screenIn } from '@/lib/motion';

type Screen = 'home' | 'setup' | 'game' | 'gameover' | 'login' | 'lobby';

// Invite link: /?room=CODE. The lobby reads it once and clears it from the address bar.
const inviteCode = () => new URLSearchParams(window.location.search).get('room');

const Index = () => {
  const [screen, setScreen] = useState<Screen>(() => (inviteCode() ? 'login' : 'home'));
  const [currentUser, setCurrentUser] = useState<{ id: string, username: string } | null>(null);
  const [isMultiplayer, setIsMultiplayer] = useState(() => !!inviteCode());
  const [standings, setStandings] = useState<FinalStanding[] | undefined>(undefined);
  const [onlineGameState, setOnlineGameState] = useState<any>(null);
  const [gameConfig, setGameConfig] = useState({
    aiCount: 2,
    difficulty: 'medium' as AIDifficulty,
    rules: DEFAULT_RULES as HouseRules,
  });
  const [resumedRoom, setResumedRoom] = useState<Room | null>(null);
  const [finalGameState, setFinalGameState] = useState<GameState | null>(null);

  // After a refresh, go back to the lobby or game we were in
  useEffect(() => {
    resumeSession().then((res) => {
      if (!res?.userId || !res.username) return;
      setCurrentUser({ id: res.userId, username: res.username });
      if (!res.room) {
        if (inviteCode()) setScreen('lobby'); // already signed in: go straight to joining
        return;
      }
      setIsMultiplayer(true);
      if (res.room.state === 'playing' && res.room.gameState) {
        setOnlineGameState(res.room.gameState);
        setScreen('game');
      } else {
        setResumedRoom(res.room);
        setScreen('lobby');
      }
    });
  }, []);

  const handleStartSetup = () => {
    setIsMultiplayer(false);
    setScreen('setup');
  };

  const handleCreateRoom = () => {
    setIsMultiplayer(true);
    if (currentUser) {
      setScreen('lobby');
    } else {
      setScreen('login');
    }
  };

  const handleLoginSuccess = (id: string, username: string) => {
    setCurrentUser({ id, username });
    setScreen('lobby');
  };

  const handleStartGame = (aiCount: number, difficulty: AIDifficulty, rules: HouseRules) => {
    setGameConfig({ aiCount, difficulty, rules });
    setScreen('game');
  };

  const handleOnlineGameStarted = (gameState: any) => {
    console.log('🎯 Game started! Received state:', gameState);
    setOnlineGameState(gameState);
    setScreen('game');
  };

  const handleGameOver = (state: GameState, final?: FinalStanding[]) => {
    setFinalGameState(state);
    setStandings(final);
    setScreen('gameover');
  };

  const handlePlayAgain = () => {
    setScreen('game');
  };

  // The host reset the room: everyone goes back to the lobby together
  const handleRematch = (room: Room) => {
    setFinalGameState(null);
    setOnlineGameState(null);
    setResumedRoom(room);
    setScreen('lobby');
  };

  const handleMainMenu = () => {
    if (isMultiplayer) leaveRoom().catch(() => undefined);
    setScreen('home');
    setFinalGameState(null);
    setOnlineGameState(null);
  };

  const reduce = useReducedMotion();

  return (
    // Keyed by screen so each one fades in on entry; reduced motion skips it
    <motion.div key={screen} {...(reduce ? {} : screenIn)}>
      {screen === 'home' && (
        <HomeScreen
          onStartGame={handleStartSetup}
          onCreateRoom={handleCreateRoom}
        />
      )}

      {screen === 'login' && (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'lobby' && currentUser && (
        <LobbyScreen
          currentUser={currentUser}
          initialRoom={resumedRoom}
          joinCode={inviteCode()}
          onBack={() => setScreen('home')}
          onGameStarted={handleOnlineGameStarted}
        />
      )}

      {screen === 'setup' && (
        <SetupScreen
          onStartGame={handleStartGame}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          aiCount={gameConfig.aiCount}
          difficulty={gameConfig.difficulty}
          rules={gameConfig.rules}
          onGameOver={handleGameOver}
          onBackToMenu={handleMainMenu}
          isMultiplayer={isMultiplayer}
          onlineGameState={onlineGameState}
          currentUserId={currentUser?.id}
        />
      )}

      {screen === 'gameover' && finalGameState && (
        <GameOverScreen
          gameState={finalGameState}
          standings={standings}
          winner={finalGameState.players.find(p => p.id === finalGameState.winner)!}
          onPlayAgain={handlePlayAgain}
          onMainMenu={handleMainMenu}
          online={isMultiplayer ? { onRematch: handleRematch } : undefined}
        />
      )}
    </motion.div>
  );
};

export default Index;
