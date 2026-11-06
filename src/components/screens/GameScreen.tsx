import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Home } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { dur, ease } from '@/lib/motion';
import { GameState, TradeOffer, AIDifficulty, HouseRules } from '@/game/types';
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
  buildHouse,
  sellHouse,
  mortgageProperty,
  unmortgageProperty,
  checkWinCondition,
  proposeTrade,
  acceptTrade,
  declineTrade,
  attemptPayment,
  declareBankruptcy,
} from '@/game/engine';
import type { CardData } from '@/game/constants';
import { autoStep, whoMustAct } from '@/game/autopilot';
import {
  onGameStateUpdate,
  onGameDeadline,
  onGameRolling,
  onGameAutoplayed,
  onEmote,
  sendEmote,
  onGameEnded,
  type FinalStanding,
  onChatMessage,
  onChatHistory,
  removeListener,
  sendChat,
  ChatMessage,
  rollDice as rollDiceSocket,
  buyProperty as buyPropertySocket,
  declineProperty as declinePropertySocket,
  endTurn as endTurnSocket,
  placeBid as placeBidSocket,
  passAuction as passAuctionSocket,
  rollForJail as rollForJailSocket,
  payJailFine as payJailFineSocket,
  useJailCard as jailCardSocket,
  buildHouse as buildHouseSocket,
  sellHouse as sellHouseSocket,
  mortgageProperty as mortgageSocket,
  unmortgageProperty as unmortgageSocket,
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
import { TradeOfferDialog } from '@/components/game/TradeOfferDialog';
import { BankruptcyModal } from '@/components/game/BankruptcyModal';
import { DeedDialog } from '@/components/game/DeedDialog';
import { GameLog } from '@/components/game/GameLog';
import { ChatPanel } from '@/components/game/ChatPanel';
import { MatchClock } from '@/components/game/MatchClock';
import { TilePeek } from '@/components/game/TilePeek';
import { useIsMobile } from '@/hooks/use-mobile';
import { EMOTES } from '@/game/types';
import { CardDisplay } from '@/components/game/CardDisplay';
import { Pawn } from '@/components/game/kit';
import { ChipFlights } from '@/components/game/ChipFlights';
import { BoardFx, Fx } from '@/components/game/BoardFx';
import { diffEvents } from '@/game/events';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PRODUCT_NAME } from '@/lib/brand';
import { SoundMenu } from '@/components/game/SoundMenu';
import { play, playChange, rollSound, startMusic, stopMusic } from '@/services/sound';

/** How long a card someone else drew stays up, unless dismissed first */
const CARD_READ_MS = 15_000;

interface GameScreenProps {
  aiCount: number;
  difficulty: AIDifficulty;
  rules?: HouseRules;
  onGameOver: (state: GameState, standings?: FinalStanding[]) => void;
  onBackToMenu?: () => void;
  isMultiplayer?: boolean;
  onlineGameState?: any;
  currentUserId?: string;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  aiCount,
  difficulty,
  rules,
  onGameOver,
  onBackToMenu,
  isMultiplayer = false,
  onlineGameState = null,
  currentUserId,
}) => {
  const [gameState, setGameState] = useState<GameState>(() => {
    if (onlineGameState) {
      console.log('📦 Initializing with online game state:', onlineGameState);
      // Validate the online game state
      if (!onlineGameState.players || !Array.isArray(onlineGameState.players)) {
        console.error('❌ Invalid online game state - missing or invalid players array');
        return initializeGame(aiCount, difficulty, rules);
      }
      if (onlineGameState.players.length === 0) {
        console.error('❌ Invalid online game state - empty players array');
        return initializeGame(aiCount, difficulty, rules);
      }
      console.log('✅ Online game state is valid, using it');
      return onlineGameState;
    }
    console.log('🎲 Initializing with local game state');
    return initializeGame(aiCount, difficulty, rules);
  });
  const [isRolling, setIsRolling] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [tradeSeed, setTradeSeed] = useState<{ partnerId: string; requestedProperty: number } | null>(null);
  const [inspect, setInspect] = useState<number | null>(null);
  // Phones: a tap peeks at the tile first (names are too small to print); a second tap on the same tile dismisses it
  const isMobile = useIsMobile();
  const [peek, setPeek] = useState<number | null>(null);
  const onTile = (position: number) => (isMobile ? setPeek((p) => (p === position ? null : position)) : setInspect(position));
  const [card, setCard] = useState<CardData | null>(null);
  const [deadline, setDeadline] = useState<{ playerId: string; at: number; total: number } | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const seenCard = useRef(gameState.cardSeq ?? 0);
  const standings = useRef<FinalStanding[] | undefined>(undefined); // the server's final table, with stats

  // Music plays while the table is open
  useEffect(() => {
    startMusic();
    return stopMusic;
  }, []);
  const lastState = useRef(gameState);
  const [fx, setFx] = useState<Fx | null>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Online: the server is the source of truth. Subscribe, and unsubscribe on the way out.
  useEffect(() => {
    if (!isMultiplayer) return;

    const onState = ({ gameState: next }: { gameState: GameState }) => {
      if (next && next.players) {
        setGameState(next);
        setIsRolling(false);
      }
    };
    // Someone's roll is about to land (a bot or an auto-played turn): tumble the dice and rattle now
    const onRolling = () => {
      setIsRolling(true);
      rollSound();
    };
    const onDeadline = ({ playerId, at }: { playerId: string; at: number }) =>
      setDeadline({ playerId, at, total: Math.max(1, Math.round((at - Date.now()) / 1000)) });
    const onAuto = ({ playerId, fine }: { playerId: string; fine?: number }) => {
      const name = gameState.players.find((p) => p.id === playerId)?.name ?? 'A player';
      toast.info(`${name} ran out of time${fine ? ` and paid a $${fine} fine` : ''}, so the table played for them.`);
    };
    const onEnded = (e: { standings: FinalStanding[] }) => (standings.current = e.standings);
    const onEmoji = ({ username, emoji }: { username: string; emoji: string }) =>
      toast(`${emoji}  ${username}`, { duration: 2000 });
    const onMessage = (m: ChatMessage) => setChat((prev) => [...prev, m].slice(-100));
    const onHistory = (m: ChatMessage[]) => setChat(m);

    onGameStateUpdate(onState);
    onGameDeadline(onDeadline);
    onGameRolling(onRolling);
    onGameAutoplayed(onAuto);
    onChatMessage(onMessage);
    onChatHistory(onHistory);
    onEmote(onEmoji);
    onGameEnded(onEnded);

    return () => {
      removeListener('game:stateUpdate', onState);
      removeListener('game:deadline', onDeadline);
      removeListener('game:rolling', onRolling);
      removeListener('game:autoplayed', onAuto);
      removeListener('chat:message', onMessage);
      removeListener('chat:history', onHistory);
      removeListener('emote:show', onEmoji);
      removeListener('game:ended', onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiplayer]);

  // Check for game over
  useEffect(() => {
    if (!gameState || !gameState.players) return;

    // Online quick games can also end on the clock: the server sends gameover with a winner
    const winner = gameState.phase === 'gameover' ? gameState.winner : checkWinCondition(gameState);
    if (winner !== null) {
      const updatedState = { ...gameState, phase: 'gameover' as const, winner };
      setGameState(updatedState);
      setTimeout(() => onGameOver(updatedState, standings.current), 1000);
    }
  }, [gameState?.players, gameState?.phase, onGameOver]);

  // Sound follows what changed between two states, whoever caused it
  useEffect(() => {
    playChange(lastState.current, gameState, (id) => {
      const p = gameState.players.find((x) => x.id === id);
      return !!p && !p.isAI && (!isMultiplayer || p.id === currentUserId);
    });
    // Flourishes wait for the pawn: it walks 0.11s a tile, a jump takes ~0.4s
    const events = diffEvents(lastState.current, gameState);
    for (const e of events) {
      const steps = e.type === 'move' ? (e.to - e.from + 40) % 40 : 0;
      const walked = steps > 0 && steps <= 12;
      if (e.type === 'move' && e.passedGo) setFx({ id: Date.now(), kind: 'go', delay: walked ? (40 - e.from) * 0.11 : 0.2 });
      if (e.type === 'jail' && e.inJail) setFx({ id: Date.now(), kind: 'jail', delay: 0.4 });
      if (e.type === 'trade' && e.status === 'resolved' && events.some((x) => x.type === 'property' || x.type === 'money')) {
        // An accepted trade changes owners or cash in the same step; a declined one changes nothing
        const t = lastState.current.trade;
        const name = (id?: string) => gameState.players.find((p) => p.id === id)?.name ?? '';
        setFx({ id: Date.now(), kind: 'trade', delay: 0, label: t ? `${name(t.fromPlayer)} and ${name(t.toPlayer)} trade` : 'Trade made' });
      }
      if (e.type === 'auction' && e.status === 'ended') {
        const won = events.find((x) => x.type === 'property' && x.position === e.position && x.ownerId);
        const buyerId = won?.type === 'property' ? won.ownerId : null;
        const paid = events.find((x) => x.type === 'money' && x.playerId === buyerId);
        const buyer = gameState.players.find((p) => p.id === buyerId);
        if (buyer && paid?.type === 'money') setFx({ id: Date.now(), kind: 'sold', delay: 0, label: `${buyer.name} · $${-paid.delta}` });
      }
    }
    lastState.current = gameState;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Show each drawn card once. Cards other people draw close themselves.
  useEffect(() => {
    const seq = gameState.cardSeq ?? 0;
    if (seq === seenCard.current || !gameState.lastCard) return;
    seenCard.current = seq;
    const drawn = gameState.lastCard;
    const byMe = !currentPlayer.isAI && (!isMultiplayer || currentPlayer.id === currentUserId);
    const open = setTimeout(() => setCard(drawn), 600);
    const close = byMe ? undefined : setTimeout(() => setCard((c) => (c === drawn ? null : c)), CARD_READ_MS);
    return () => {
      clearTimeout(open);
      if (close) clearTimeout(close);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.cardSeq]);

  // Single player: AI seats act through the shared autopilot (online, the server does this)
  useEffect(() => {
    if (isMultiplayer) return;
    const actor = whoMustAct(gameState);
    if (!actor?.isAI) return;

    if (card) return; // wait while a drawn card is on screen
    const delay = gameState.phase === 'auction' ? 700 : gameState.phase === 'trade' ? 2500 : 1900;
    const act = () => setGameState(prev => autoStep(prev) ?? prev);
    if (gameState.phase === 'playing' && gameState.turnPhase === 'roll') {
      // Tumble the dice (and rattle) first, then move: the sound belongs to the roll, not the walk
      const start = setTimeout(() => {
        setIsRolling(true);
        rollSound();
      }, delay - 700);
      const land = setTimeout(() => {
        act();
        setIsRolling(false);
      }, delay);
      return () => {
        clearTimeout(start);
        clearTimeout(land);
        setIsRolling(false);
      };
    }
    const timer = setTimeout(act, delay);
    return () => clearTimeout(timer);
  }, [gameState, isMultiplayer, card]);

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
    rollSound();
    if (isMultiplayer) return rollDiceSocket();
    rollWithDelay(rollTurn);
  }, [isRolling, isMultiplayer]);

  const handleRollForJail = useCallback(() => {
    rollSound();
    if (isMultiplayer) return rollForJailSocket();
    rollWithDelay(rollForJailTurn);
  }, [isRolling, isMultiplayer]);

  const handlePayJailFine = useCallback(() => {
    if (isMultiplayer) return payJailFineSocket();
    setGameState(prev => leaveJail(prev, prev.players[prev.currentPlayerIndex].id, 'fine'));
  }, [isMultiplayer]);

  const handleUseJailCard = useCallback(() => {
    if (isMultiplayer) return jailCardSocket();
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

    setGameState(placeBid(gameState, currentBidderId, amount));
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

  const handleBuildHouse = useCallback((position: number) => {
    if (isMultiplayer) return buildHouseSocket(position);
    setGameState((prev) => buildHouse(prev, prev.players[prev.currentPlayerIndex].id, position));
  }, [isMultiplayer]);

  const handleSellHouse = useCallback((position: number) => {
    if (isMultiplayer) return sellHouseSocket(position);
    setGameState((prev) => sellHouse(prev, prev.players[prev.currentPlayerIndex].id, position));
  }, [isMultiplayer]);

  const handleMortgage = useCallback((position: number) => {
    if (isMultiplayer) return mortgageSocket(position);
    setGameState((prev) => mortgageProperty(prev, prev.players[prev.currentPlayerIndex].id, position));
  }, [isMultiplayer]);

  const handleUnmortgage = useCallback((position: number) => {
    if (isMultiplayer) return unmortgageSocket(position);
    setGameState((prev) => unmortgageProperty(prev, prev.players[prev.currentPlayerIndex].id, position));
  }, [isMultiplayer]);

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

  // Who controls what on this screen
  const human = (id?: string) => {
    const p = gameState.players.find((x) => x.id === id);
    return !!p && !p.isAI && (!isMultiplayer || p.id === currentUserId);
  };
  const canAct = human(currentPlayer.id);
  const you = isMultiplayer ? gameState.players.find((p) => p.id === currentUserId) : gameState.players.find((p) => !p.isAI);
  const debtorId = gameState.bankruptcyState?.playerId;
  const tradeToId = gameState.trade?.toPlayer;
  const myDeadline = deadline && deadline.playerId === currentPlayer.id ? deadline : null;
  const latest = gameState.gameLog[gameState.gameLog.length - 1];
  const tabs: [string, string][] = [['players', 'Players'], ['log', 'Log'], ...(isMultiplayer ? [['chat', 'Chat'] as [string, string]] : [])];

  return (
    // overflow-x-clip: the 3D piece layer reaches past the board edges and must not widen the page on phones
    <div className="min-h-dvh overflow-x-clip bg-background" onPointerDownCapture={(e) => (e.target as HTMLElement).closest?.('button') && play('tap')}>
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex h-12 max-w-[1500px] items-center gap-2 px-3 md:px-4">
          {onBackToMenu && (
            <Button variant="ghost" size="icon" aria-label="Leave the table" onClick={onBackToMenu} className="-ml-2">
              <Home />
            </Button>
          )}
          <span className="font-display text-lg leading-none text-gold">{PRODUCT_NAME}</span>
          {gameState.endsAt && <MatchClock endsAt={gameState.endsAt} />}
          <SoundMenu className="ml-auto" />
          <div className="flex min-w-0 items-center gap-2.5 text-[13px]" aria-live="polite">
            <Pawn color={currentPlayer.color} name={currentPlayer.name} size={24} />
            <motion.span
              key={`${currentPlayer.id}-${canAct}`}
              className="truncate font-medium"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: dur.base, ease: ease.out }}
            >
              {canAct ? 'Your turn' : `${currentPlayer.name}'s turn`}
            </motion.span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-3 p-3 grid-cols-[minmax(0,1fr)] md:p-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="mx-auto w-full" style={{ maxWidth: 'min(100%, calc(100dvh - 5.5rem))' }}>
          {/* The effects live inside the board so they lean with it */}
          <GameBoard gameState={gameState} onTileClick={onTile} overlay={<BoardFx fx={fx} onDone={() => setFx(null)} />}>
            <Dice values={gameState.lastDiceRoll} isRolling={isRolling} />
            {peek !== null && (
              // Floats above the event line so the dice and the decks do not move
              <div className="absolute inset-x-0 bottom-[11%] z-10 flex justify-center">
                <TilePeek
                  position={peek}
                  gameState={gameState}
                  onOpen={() => {
                    setInspect(peek);
                    setPeek(null);
                  }}
                />
              </div>
            )}
            <p className="max-w-[88%] truncate text-center text-[clamp(10px,1.7cqw,15px)] text-bone/85" aria-live="polite">
              {latest}
            </p>
          </GameBoard>
          <p className="mt-2 text-center text-[12px] text-muted-foreground md:hidden">Tap any tile to see what it is.</p>
        </div>

        <aside className="flex min-h-0 flex-col gap-3 lg:sticky lg:top-[3.75rem] lg:max-h-[calc(100dvh-4.5rem)]">
          <ActionPanel
            gameState={gameState}
            player={currentPlayer}
            canAct={canAct}
            isRolling={isRolling}
            deadlineAt={myDeadline?.at}
            deadlineTotal={myDeadline?.total}
            onRoll={handleRollDice}
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
            onTrade={() => {
              setTradeSeed(null);
              setShowTrade(true);
            }}
          />

          <Tabs defaultValue="players" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="h-10 w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
              {tabs.map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-10 rounded-none border-b-2 border-transparent px-3 text-[13px] font-medium text-muted-foreground shadow-none data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="players" className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {gameState.players.map((player, index) => (
                <PlayerPanel
                  key={player.id}
                  player={player}
                  gameState={gameState}
                  isCurrentPlayer={index === gameState.currentPlayerIndex}
                  isYou={player.id === you?.id}
                  onPropertyClick={setInspect}
                />
              ))}
            </TabsContent>
            <TabsContent value="log" className="mt-3 max-h-72 min-h-0 flex-1 overflow-y-auto pr-1 lg:max-h-none">
              <GameLog logs={gameState.gameLog} />
            </TabsContent>
            {isMultiplayer && (
              <TabsContent value="chat" className="mt-3 flex max-h-80 min-h-0 flex-1 flex-col lg:max-h-none">
                <ChatPanel messages={chat} selfId={currentUserId} onSend={sendChat} className="min-h-0 flex-1" />
              </TabsContent>
            )}
          </Tabs>
          {isMultiplayer && (
            <div className="flex justify-between gap-1" role="group" aria-label="Reactions">
              {EMOTES.map((emoji) => (
                <Button key={emoji} variant="secondary" className="h-11 flex-1 text-lg" aria-label={`React ${emoji}`} onClick={() => sendEmote(emoji)}>
                  {emoji}
                </Button>
              ))}
            </div>
          )}
        </aside>
      </main>

      <ChipFlights players={gameState.players} pot={gameState.freeParkingPot ?? 0} />
      <DeedDialog
        position={inspect}
        gameState={gameState}
        onClose={() => setInspect(null)}
        viewerId={you?.id}
        onOffer={(partnerId, requestedProperty) => {
          setInspect(null);
          setTradeSeed({ partnerId, requestedProperty });
          setShowTrade(true);
        }}
        manage={{
          blocked: !canAct ? 'You can build on your own turn.' : gameState.phase !== 'playing' ? 'Finish the auction or trade in progress first.' : undefined,
          onBuild: handleBuildHouse,
          onSell: handleSellHouse,
          onMortgage: handleMortgage,
          onUnmortgage: handleUnmortgage,
        }}
        offerBlocked={
          !canAct
            ? 'You can make offers on your own turn.'
            : currentPlayer.inJail
              ? 'You cannot trade while in jail.'
              : gameState.phase !== 'playing'
                ? 'Finish the auction or trade in progress first.'
                : undefined
        }
      />
      {card && <CardDisplay card={card} onDismiss={() => setCard(null)} />}

      {gameState.phase === 'auction' && gameState.auction && (
        <AuctionModal gameState={gameState} onBid={handleBid} onPass={handlePass} currentUserId={currentUserId} />
      )}

      <TradeModal open={showTrade} onOpenChange={setShowTrade} gameState={gameState} currentPlayer={currentPlayer} onPropose={handleProposeTrade} initial={tradeSeed} />

      <TradeOfferDialog gameState={gameState} canRespond={human(tradeToId)} onAccept={handleAcceptTrade} onDecline={handleDeclineTrade} />

      {gameState.phase === 'bankruptcy' && gameState.bankruptcyState && (
        <BankruptcyModal
          gameState={gameState}
          bankruptcyState={gameState.bankruptcyState}
          canAct={human(debtorId)}
          onSellHouse={handleSellHouse}
          onMortgage={handleMortgage}
          onAttemptPayment={handleAttemptPayment}
          onDeclareBankruptcy={handleDeclareBankruptcy}
        />
      )}
    </div>
  );
};
