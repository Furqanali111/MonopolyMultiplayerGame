import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Player, TradeOffer, AIDifficulty } from '@/game/types';
import {
  initializeGame,
  rollDice,
  rollTurn,
  rollForJailTurn,
  leaveJail,
  endTurn,
  buyProperty,
  startAuction,
  placeBid,
  passAuction,
  finalizeAuction,
  buildHouse,
  sellHouse,
  mortgageProperty,
  unmortgageProperty,
  checkWinCondition,
  getPropertyOwner,
  getPropertyData,
  proposeTrade,
  acceptTrade,
  declineTrade,
  attemptPayment,
  declareBankruptcy,
  BOARD_TILES,
} from '@/game/engine';
import { JAIL_FINE } from '@/game/constants';
import {
  shouldAIBuyProperty,
  getAIAuctionBid,
  getAIJailDecision,
  getAIBuildDecisions,
  shouldAIAcceptTrade,
} from '@/game/ai';
import {
  onGameStateUpdate,
  rollDice as rollDiceSocket,
  buyProperty as buyPropertySocket,
  declineProperty as declinePropertySocket,
  endTurn as endTurnSocket,
  placeBid as placeBidSocket,
  passAuction as passAuctionSocket,
  rollForJail as rollForJailSocket,
  payJailFine as payJailFineSocket,
  useJailCard as useJailCardSocket,
  proposeTrade as proposeTradeSocket,
  acceptTrade as acceptTradeSocket,
  declineTrade as declineTradeSocket,
  attemptPayment as attemptPaymentSocket,
  declareBankruptcy as declareBankruptcySocket,
} from '@/services/socket';

import { GameBoard } from '@/components/game/GameBoard';
import { Dice } from '@/components/game/Dice';
import { PlayerPanel } from '@/components/game/PlayerPanel';
import { ActionPanel } from '@/components/game/ActionPanel';
import { AuctionModal } from '@/components/game/AuctionModal';
import { TradeModal } from '@/components/game/TradeModal';
import { BankruptcyModal } from '@/components/game/BankruptcyModal';
import { GameLog } from '@/components/game/GameLog';
import { CardDisplay } from '@/components/game/CardDisplay';
import { Home, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameScreenProps {
  aiCount: number;
  difficulty: AIDifficulty;
  onGameOver: (state: GameState) => void;
  onBackToMenu?: () => void;
  isMultiplayer?: boolean;
  onlineGameState?: any;
  currentUserId?: string;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  aiCount,
  difficulty,
  onGameOver,
  onBackToMenu,
  isMultiplayer = false,
  onlineGameState = null,
  currentUserId,
}) => {
  console.log('🎮 GameScreen rendering with:', { isMultiplayer, hasOnlineState: !!onlineGameState });

  const [gameState, setGameState] = useState<GameState>(() => {
    if (onlineGameState) {
      console.log('📦 Initializing with online game state:', onlineGameState);
      // Validate the online game state
      if (!onlineGameState.players || !Array.isArray(onlineGameState.players)) {
        console.error('❌ Invalid online game state - missing or invalid players array');
        return initializeGame(aiCount, difficulty);
      }
      if (onlineGameState.players.length === 0) {
        console.error('❌ Invalid online game state - empty players array');
        return initializeGame(aiCount, difficulty);
      }
      console.log('✅ Online game state is valid, using it');
      return onlineGameState;
    }
    console.log('🎲 Initializing with local game state');
    return initializeGame(aiCount, difficulty);
  });
  const [isRolling, setIsRolling] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [tradeResponseTimer, setTradeResponseTimer] = useState<NodeJS.Timeout | null>(null);

  // Safety check for gameState before accessing players
  if (!gameState || !gameState.players || gameState.players.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Listen for multiplayer game state updates
  useEffect(() => {
    if (!isMultiplayer) return;

    console.log('🎮 Multiplayer mode active, listening for state updates');

    const handleStateUpdate = ({ gameState: newState }: { gameState: GameState }) => {
      console.log('📥 Received game state update', newState);
      if (newState && newState.players) {
        setGameState(newState);
      } else {
        console.error('Invalid game state received:', newState);
      }
    };

    // Use the imported socket function
    onGameStateUpdate(handleStateUpdate);

    return () => {
      // Cleanup if needed
    };
  }, [isMultiplayer]);

  // Check for game over
  useEffect(() => {
    if (!gameState || !gameState.players) return;

    const winner = checkWinCondition(gameState);
    if (winner !== null) {
      const updatedState = { ...gameState, phase: 'gameover' as const, winner };
      setGameState(updatedState);
      setTimeout(() => onGameOver(updatedState), 1000);
    }
  }, [gameState?.players, onGameOver]);

  // Show card when drawn (with delay for better UX)
  useEffect(() => {
    if (gameState.currentCard) {
      // Add delay so player can see where they landed before card appears
      const timer = setTimeout(() => {
        setShowCard(true);
      }, 800); // 800ms delay

      return () => clearTimeout(timer);
    }
  }, [gameState.currentCard]);

  // Handle AI trade responses
  useEffect(() => {
    if (gameState.phase !== 'trade' || !gameState.trade) return;

    const toPlayer = gameState.players.find(p => p.id === gameState.trade!.toPlayer);
    if (!toPlayer?.isAI) return;

    // Clear any existing timer
    if (tradeResponseTimer) {
      clearTimeout(tradeResponseTimer);
    }

    // AI responds after a delay
    const timer = setTimeout(() => {
      if (shouldAIAcceptTrade(gameState, toPlayer)) {
        handleAcceptTrade();
      } else {
        handleDeclineTrade();
      }
    }, 1500);

    setTradeResponseTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [gameState.trade, gameState.phase]);

  // Handle AI turns (ONLY during normal gameplay - never during auction/trade/gameover)
  useEffect(() => {
    if (gameState.phase !== 'playing') return;
    if (!currentPlayer.isAI || currentPlayer.isBankrupt) return;

    const aiDelay = 800;

    const timer = setTimeout(() => {
      processAIAction();
    }, aiDelay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState, // Include full gameState to catch all changes including turnPhase
    currentPlayer.isAI,
    currentPlayer.isBankrupt,
    // Note: processAIAction is intentionally not in deps to avoid circular dependency
  ]);

  const processAIAction = useCallback(() => {
    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player.isAI) return;


    switch (gameState.turnPhase) {
      case 'injail':
        // Handle jail - only when it's specifically the jail phase
        const jailDecision = getAIJailDecision(gameState, player);
        if (jailDecision === 'card') {
          handleUseJailCard();
        } else if (jailDecision === 'pay' && player.money >= JAIL_FINE) {
          handlePayJailFine();
        } else {
          handleRollForJail();
        }
        break;

      case 'roll':
        handleRollDice();
        break;

      case 'action':
        const property = getPropertyData(player.position);
        const owned = getPropertyOwner(gameState, player.position);

        if (property && !owned) {
          if (shouldAIBuyProperty(gameState, player)) {
            handleBuyProperty();
          } else {
            handleDeclineProperty();
          }
        } else {
          handleEndTurn();
        }
        break;

      case 'endturn':
        const buildPositions = getAIBuildDecisions(gameState, player);
        if (buildPositions.length > 0) {
          handleBuildHouse(buildPositions[0]);
        } else {
          handleEndTurn();
        }
        break;
    }
  }, [
    gameState,
  ]);

  // Single player runs the shared engine locally; online the server runs it.
  const rollWithDelay = (turn: (state: GameState, dice: [number, number]) => GameState) => {
    if (isRolling) return;
    setIsRolling(true);
    setTimeout(() => {
      setGameState(prev => turn(prev, rollDice()));
      setIsRolling(false);
    }, 600);
  };

  const handleRollDice = useCallback(() => {
    if (isMultiplayer) return rollDiceSocket();
    rollWithDelay(rollTurn);
  }, [isRolling, isMultiplayer]);

  const handleRollForJail = useCallback(() => {
    if (isMultiplayer) return rollForJailSocket();
    rollWithDelay(rollForJailTurn);
  }, [isRolling, isMultiplayer]);

  const handlePayJailFine = useCallback(() => {
    if (isMultiplayer) return payJailFineSocket();
    setGameState(prev => leaveJail(prev, prev.players[prev.currentPlayerIndex].id, 'fine'));
  }, [isMultiplayer]);

  const handleUseJailCard = useCallback(() => {
    if (isMultiplayer) return useJailCardSocket();
    setGameState(prev => leaveJail(prev, prev.players[prev.currentPlayerIndex].id, 'card'));
  }, [isMultiplayer]);

  const handleBuyProperty = useCallback(() => {
    if (isMultiplayer) return buyPropertySocket();
    setGameState(prev => buyProperty(prev, currentPlayer.id, currentPlayer.position));
  }, [currentPlayer, isMultiplayer]);

  const handleDeclineProperty = useCallback(() => {
    // In multiplayer mode, send action to server
    if (isMultiplayer) {
      declinePropertySocket();
      return;
    }

    // Single-player mode: execute locally
    // Guard against double-starts (setState can be queued more than once)
    setGameState(prev => {
      if (prev.phase === 'auction' || prev.auction) return prev;
      return startAuction(prev, currentPlayer.position);
    });
  }, [currentPlayer.position, isMultiplayer]);

  const handleBid = useCallback((amount: number) => {
    // In multiplayer mode, send bid to server
    if (isMultiplayer) {
      placeBidSocket(amount);
      return;
    }

    // Single-player mode - handle locally  
    const activeBidders = gameState.auction?.participants.filter(
      id => !gameState.auction?.passedPlayers.includes(id)
    ) || [];

    const currentBidderId = activeBidders.length > 0
      ? activeBidders[gameState.auction!.currentBidderIndex % activeBidders.length]
      : null;

    if (currentBidderId === null) return;

    let newState = placeBid(gameState, currentBidderId, amount);

    // Check if auction should finalize (only one bidder left)
    const remainingBidders = newState.auction?.participants.filter(
      id => !newState.auction?.passedPlayers.includes(id)
    ) || [];

    if (remainingBidders.length === 1) {
      newState = finalizeAuction(newState);
    }

    setGameState(newState);
  }, [gameState, isMultiplayer]);

  const handlePass = useCallback(() => {
    // In multiplayer mode, send pass to server
    if (isMultiplayer) {
      passAuctionSocket();
      return;
    }

    // Single-player mode - handle locally
    const activeBidders = gameState.auction?.participants.filter(
      id => !gameState.auction?.passedPlayers.includes(id)
    ) || [];

    const currentBidderId = activeBidders.length > 0
      ? activeBidders[gameState.auction!.currentBidderIndex % activeBidders.length]
      : null;

    if (currentBidderId === null) return;

    const newState = passAuction(gameState, currentBidderId);

    // passAuction now handles all finalization logic internally
    setGameState(newState);
  }, [gameState, isMultiplayer]);
  // ...existing code...

  // Handle auction AI turns - must be after handleBid and handlePass are defined
  useEffect(() => {
    if (gameState.phase !== 'auction' || !gameState.auction) return;

    const activeBidders = gameState.auction.participants.filter(
      id => !gameState.auction!.passedPlayers.includes(id)
    );
    if (activeBidders.length === 0) return;

    // Use currentBidderIndex to determine whose turn it is
    const bidderId = activeBidders[gameState.auction.currentBidderIndex % activeBidders.length];
    const bidder = gameState.players.find(p => p.id === bidderId);
    if (!bidder?.isAI) return;

    const isFirstBidder =
      gameState.auction.currentBid === 0 && gameState.auction.currentBidder === null;
    const delay = isFirstBidder ? 100 : 150;

    const timer = setTimeout(() => {
      setGameState(currentState => {
        if (currentState.phase !== 'auction' || !currentState.auction) return currentState;

        const currentActiveBidders = currentState.auction.participants.filter(
          id => !currentState.auction!.passedPlayers.includes(id)
        );
        if (currentActiveBidders.length === 0) return currentState;

        const currentBidderId = currentActiveBidders[currentState.auction.currentBidderIndex % currentActiveBidders.length];
        const currentBidder = currentState.players.find(p => p.id === currentBidderId);
        if (!currentBidder?.isAI) return currentState;

        const bid = getAIAuctionBid(currentState, currentBidder);

        if (bid !== null) {
          let newState = placeBid(currentState, currentBidderId, bid);

          // Check if auction should finalize (only one bidder left)
          const remainingBidders = newState.auction?.participants.filter(
            id => !newState.auction?.passedPlayers.includes(id)
          ) || [];

          if (remainingBidders.length === 1) {
            newState = finalizeAuction(newState);
          }

          return newState;
        }

        // Pass (do not finalize here; engine should handle it consistently)
        return passAuction(currentState, currentBidderId);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [
    gameState.phase,
    gameState.auction,
    gameState.players,
  ]);

  // ...existing code...

  const handleBuildHouse = useCallback((position: number) => {
    const newState = buildHouse(gameState, currentPlayer.id, position);
    setGameState(newState);
  }, [gameState, currentPlayer]);

  const handleSellHouse = useCallback((position: number) => {
    const newState = sellHouse(gameState, currentPlayer.id, position);
    setGameState(newState);
  }, [gameState, currentPlayer]);

  const handleMortgage = useCallback((position: number) => {
    const newState = mortgageProperty(gameState, currentPlayer.id, position);
    setGameState(newState);
  }, [gameState, currentPlayer]);

  const handleUnmortgage = useCallback((position: number) => {
    const newState = unmortgageProperty(gameState, currentPlayer.id, position);
    setGameState(newState);
  }, [gameState, currentPlayer]);

  const handleEndTurn = useCallback(() => {
    if (isMultiplayer) return endTurnSocket();
    setGameState(prev => endTurn(prev));
  }, [isMultiplayer]);

  const handleProposeTrade = useCallback((offer: Omit<TradeOffer, 'active'>) => {
    if (isMultiplayer) proposeTradeSocket(offer);
    else setGameState(prev => proposeTrade(prev, offer));
    setShowTrade(false);
  }, [isMultiplayer]);

  const handleAcceptTrade = useCallback(() => {
    if (isMultiplayer) return acceptTradeSocket();
    setGameState(prev => acceptTrade(prev));
  }, [isMultiplayer]);

  const handleDeclineTrade = useCallback(() => {
    if (isMultiplayer) return declineTradeSocket();
    setGameState(prev => declineTrade(prev));
  }, [isMultiplayer]);

  const handleAttemptPayment = useCallback(() => {
    if (isMultiplayer) return attemptPaymentSocket();
    if (!gameState.bankruptcyState) return;
    const { playerId, amountOwed, creditorId, reason } = gameState.bankruptcyState;
    setGameState(attemptPayment(gameState, playerId, amountOwed, creditorId, reason));
  }, [gameState, isMultiplayer]);

  const handleDeclareBankruptcy = useCallback(() => {
    if (isMultiplayer) return declareBankruptcySocket();
    if (!gameState.bankruptcyState) return;
    const { playerId, creditorId } = gameState.bankruptcyState;
    setGameState({ ...declareBankruptcy(gameState, playerId, creditorId), phase: 'playing', bankruptcyState: null });
  }, [gameState, isMultiplayer]);

  const canRoll = gameState.turnPhase === 'roll' && !isRolling && !currentPlayer.isAI;
  const isHumanTurn = !currentPlayer.isAI;

  // In multiplayer, check if it's this player's turn
  // Convert both IDs to strings for comparison since multiplayer uses string IDs
  const isMyTurn = !isMultiplayer || (currentUserId && currentPlayer.id === currentUserId);

  console.log('🎯 Turn control:', {
    isMultiplayer,
    currentUserId,
    currentPlayerId: currentPlayer.id,
    isMyTurn,
    turnPhase: gameState.turnPhase
  });

  return (
    <div className="h-screen flex flex-col p-2 md:p-3 bg-gradient-to-br from-background via-background to-secondary/20 overflow-hidden">
      <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="flex justify-between items-center mb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {onBackToMenu && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackToMenu}
                className="h-8 px-2"
              >
                <Home className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 md:gap-3 flex-1 overflow-hidden">
          {/* Left sidebar - Player panels (compact) */}
          <div className="xl:col-span-2 space-y-1.5 md:space-y-2 order-2 xl:order-1 overflow-y-auto scrollbar-thin">
            {gameState.players.map((player, index) => (
              <PlayerPanel
                key={player.id}
                player={player}
                gameState={gameState}
                isCurrentPlayer={index === gameState.currentPlayerIndex}
              />
            ))}
          </div>

          {/* Center - Game board with integrated dice and log */}
          <div className="xl:col-span-8 order-1 xl:order-2 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full flex items-center justify-center">
              <GameBoard
                gameState={gameState}
                centerContent={
                  <>
                    {/* Dice in center - compact */}
                    <div className="glass-panel rounded-lg backdrop-blur-md p-2">
                      <Dice
                        values={gameState.lastDiceRoll}
                        isRolling={isRolling}
                        disabled={!canRoll || !isMyTurn}
                        onRoll={handleRollDice}
                      />
                    </div>

                    {/* Game log in center - scrollable */}
                    <div className="glass-panel rounded-lg backdrop-blur-md p-2 max-h-24 md:max-h-32 overflow-y-auto scrollbar-thin">
                      <GameLog logs={gameState.gameLog.slice(-8)} />
                    </div>
                  </>
                }
              />
            </div>
          </div>

          {/* Right sidebar - Actions only */}
          <div className="xl:col-span-2 order-3 overflow-y-auto scrollbar-thin">

            {/* Action panel */}
            {isHumanTurn && (
              <ActionPanel
                gameState={gameState}
                player={currentPlayer}
                onBuyProperty={handleBuyProperty}
                onDeclineProperty={handleDeclineProperty}
                onBuildHouse={handleBuildHouse}
                onSellHouse={handleSellHouse}
                onMortgage={handleMortgage}
                onUnmortgage={handleUnmortgage}
                onPayJailFine={handlePayJailFine}
                onUseJailCard={handleUseJailCard}
                onRollForJail={handleRollForJail}
                onEndTurn={handleEndTurn}
                onTrade={() => setShowTrade(true)}
              />
            )}

            {/* AI thinking indicator */}
            {!isHumanTurn && (
              <div className="glass-card p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="font-medium">{currentPlayer.name}...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card display */}
      {showCard && gameState.currentCard && (
        <CardDisplay
          card={gameState.currentCard}
          onDismiss={() => setShowCard(false)}
        />
      )}

      {/* Auction modal */}
      {gameState.phase === 'auction' && gameState.auction && (
        <AuctionModal
          gameState={gameState}
          onBid={handleBid}
          onPass={handlePass}
          currentUserId={currentUserId}
        />
      )}

      {/* Trade modal */}
      <TradeModal
        open={showTrade}
        onOpenChange={setShowTrade}
        gameState={gameState}
        currentPlayer={currentPlayer}
        onPropose={handleProposeTrade}
      />

      {/* Incoming trade request */}
      {gameState.trade && gameState.trade.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl p-6 space-y-4 animate-bounce-in">
            <h3 className="font-display text-2xl text-foreground text-center">Trade Offer</h3>

            <div className="text-center text-muted-foreground">
              <span style={{ color: gameState.players.find(p => p.id === gameState.trade?.fromPlayer)?.color }}>
                {gameState.players.find(p => p.id === gameState.trade?.fromPlayer)?.name}
              </span>
              {' '}wants to trade with{' '}
              <span style={{ color: gameState.players.find(p => p.id === gameState.trade?.toPlayer)?.color }}>
                {gameState.players.find(p => p.id === gameState.trade?.toPlayer)?.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/20 rounded-lg">
              {/* They offer */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">They Offer:</h4>
                {gameState.trade.offeredProperties.length > 0 && (
                  <div className="space-y-1">
                    {gameState.trade.offeredProperties.map(pos => {
                      const prop = getPropertyData(pos);
                      return (
                        <div key={pos} className="text-sm text-foreground">
                          • {prop?.name}
                        </div>
                      );
                    })}
                  </div>
                )}
                {gameState.trade.offeredMoney > 0 && (
                  <div className="text-sm text-primary font-bold">
                    + ${gameState.trade.offeredMoney}
                  </div>
                )}
                {gameState.trade.offeredCards > 0 && (
                  <div className="text-sm text-foreground">
                    + {gameState.trade.offeredCards} Jail Card{gameState.trade.offeredCards > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* They request */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">They Request:</h4>
                {gameState.trade.requestedProperties.length > 0 && (
                  <div className="space-y-1">
                    {gameState.trade.requestedProperties.map(pos => {
                      const prop = getPropertyData(pos);
                      return (
                        <div key={pos} className="text-sm text-foreground">
                          • {prop?.name}
                        </div>
                      );
                    })}
                  </div>
                )}
                {gameState.trade.requestedMoney > 0 && (
                  <div className="text-sm text-primary font-bold">
                    + ${gameState.trade.requestedMoney}
                  </div>
                )}
                {gameState.trade.requestedCards > 0 && (
                  <div className="text-sm text-foreground">
                    + {gameState.trade.requestedCards} Jail Card{gameState.trade.requestedCards > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Only show buttons if it's the human player's turn to respond */}
            {!gameState.players.find(p => p.id === gameState.trade!.toPlayer)?.isAI && (
              <div className="flex gap-3">
                <Button onClick={handleAcceptTrade} className="btn-primary flex-1">
                  Accept Trade
                </Button>
                <Button onClick={handleDeclineTrade} variant="secondary" className="flex-1">
                  Decline Trade
                </Button>
              </div>
            )}

            {/* AI thinking indicator */}
            {gameState.players.find(p => p.id === gameState.trade!.toPlayer)?.isAI && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">
                  {gameState.players.find(p => p.id === gameState.trade!.toPlayer)?.name} is considering...
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bankruptcy modal */}
      {gameState.phase === 'bankruptcy' && gameState.bankruptcyState && (
        <BankruptcyModal
          gameState={gameState}
          bankruptcyState={gameState.bankruptcyState}
          onSellHouse={handleSellHouse}
          onMortgage={handleMortgage}
          onAttemptPayment={handleAttemptPayment}
          onDeclareBankruptcy={handleDeclareBankruptcy}
        />
      )}
    </div>
  );
};
