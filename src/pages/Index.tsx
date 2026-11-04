import React, { useState, useEffect } from 'react';
import { resumeSession, Room } from '@/services/socket';
import { AIDifficulty, GameState, Player } from '@/game/types';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { SetupScreen } from '@/components/screens/SetupScreen';
import { GameScreen } from '@/components/screens/GameScreen';
import { GameOverScreen } from '@/components/screens/GameOverScreen';
import { LoginScreen } from '@/components/screens/LoginScreen';
import { LobbyScreen } from '@/components/screens/LobbyScreen';

type Screen = 'home' | 'setup' | 'game' | 'gameover' | 'login' | 'lobby';

const Index = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [currentUser, setCurrentUser] = useState<{ id: string, username: string } | null>(null);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [onlineGameState, setOnlineGameState] = useState<any>(null);
  const [gameConfig, setGameConfig] = useState({
    aiCount: 2,
    difficulty: 'medium' as AIDifficulty,
  });
  const [resumedRoom, setResumedRoom] = useState<Room | null>(null);
  const [finalGameState, setFinalGameState] = useState<GameState | null>(null);

  // After a refresh, go back to the lobby or game we were in
  useEffect(() => {
    resumeSession().then((res) => {
      if (!res?.userId || !res.username) return;
      setCurrentUser({ id: res.userId, username: res.username });
      if (!res.room) return;
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

  const handleStartGame = (aiCount: number, difficulty: AIDifficulty) => {
    setGameConfig({ aiCount, difficulty });
    setScreen('game');
  };

  const handleOnlineGameStarted = (gameState: any) => {
    console.log('🎯 Game started! Received state:', gameState);
    setOnlineGameState(gameState);
    setScreen('game');
  };

  const handleGameOver = (state: GameState) => {
    setFinalGameState(state);
    setScreen('gameover');
  };

  const handlePlayAgain = () => {
    setScreen('game');
  };

  const handleMainMenu = () => {
    setScreen('home');
    setFinalGameState(null);
    setOnlineGameState(null);
  };

  return (
    <>
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
          onGameOver={handleGameOver}
          isMultiplayer={isMultiplayer}
          onlineGameState={onlineGameState}
          currentUserId={currentUser?.id}
        />
      )}

      {screen === 'gameover' && finalGameState && (
        <GameOverScreen
          gameState={finalGameState}
          winner={finalGameState.players.find(p => p.id === finalGameState.winner)!}
          onPlayAgain={handlePlayAgain}
          onMainMenu={handleMainMenu}
        />
      )}
    </>
  );
};

export default Index;
