import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bot, Check, Copy, Crown, Link2, Loader2, LogOut, Play, Plus, Send, WifiOff, X } from 'lucide-react';
import { QUICK_GAME } from '@/game/types';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pawn } from '@/components/game/kit';
import { Shell } from '@/components/screens/Shell';
import {
  addBot,
  createRoom,
  joinRoom,
  leaveRoom,
  onGameStarted,
  onHostMigrated,
  onPlayerJoined,
  onPlayerLeft,
  onRoomError,
  onRoomUpdated,
  removeBot,
  removeListener,
  Room,
  setRules,
  startGame,
  toggleReady,
} from '@/services/socket';
import { cn } from '@/lib/utils';
import { play } from '@/services/sound';
import { dur, ease } from '@/lib/motion';

interface LobbyScreenProps {
  currentUser: { id: string; username: string };
  onBack: () => void;
  onGameStarted: (gameState: any) => void;
  initialRoom?: Room | null;
  /** Room code from an invite link (?room=CODE) */
  joinCode?: string | null;
}

const MAX_SEATS = 6;
const inviteUrl = (code: string) => `${window.location.origin}/?room=${code}`;

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ currentUser, onBack, onGameStarted: handleGameStartedProp, initialRoom = null, joinCode = null }) => {
  const [room, setRoom] = useState<Room | null>(initialRoom);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const reduce = useReducedMotion();

  // A little sound when someone sits down or readies up, not for what was already here when we arrived
  const seen = useRef<Map<string, boolean> | null>(null);
  useEffect(() => {
    if (!room) return;
    const now = new Map(room.players.map((p) => [p.id, !!p.isReady]));
    const before = seen.current;
    seen.current = now;
    if (!before) return;
    now.forEach((ready, id) => {
      if (!before.has(id)) play('bid');
      else if (ready && !before.get(id)) play('tradeYes');
    });
  }, [room]);

  useEffect(() => {
    const updated = (r: Room) => setRoom(r);
    const joined = ({ player, room: r }: { player: { username: string }; room: Room }) => {
      setRoom(r);
      toast.success(`${player.username} joined the room`);
    };
    const left = ({ room: r }: { room: Room }) => {
      setRoom(r);
      toast.info('A player left the room');
    };
    const failed = ({ message }: { message: string }) => {
      toast.error(message);
      setIsLoading(false);
    };
    const started = ({ gameState }: { gameState: any }) => handleGameStartedProp(gameState);
    const hosted = ({ newHostName }: { newHostName: string }) => toast.info(`${newHostName} is now the host`);

    onRoomUpdated(updated);
    onPlayerJoined(joined);
    onPlayerLeft(left);
    onRoomError(failed);
    onGameStarted(started);
    onHostMigrated(hosted);

    return () => {
      removeListener('room:updated', updated);
      removeListener('room:playerJoined', joined);
      removeListener('room:playerLeft', left);
      removeListener('room:error', failed);
      removeListener('game:started', started);
      removeListener('host:migrated', hosted);
    };
  }, [handleGameStartedProp]);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const response = await createRoom();
      setRoom(response.room);
    } catch {
      toast.error('Could not create a room. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return toast.error('Enter a room code first.');
    setIsLoading(true);
    try {
      const response = await joinRoom(roomCodeInput.trim().toUpperCase());
      if (response.success && response.room) setRoom(response.room);
      else toast.error(response.error || 'Could not join that room.');
    } catch {
      toast.error("Couldn't reach the server. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Opened from an invite link: take the seat without typing the code. Runs once.
  const autoJoined = useRef(false);
  useEffect(() => {
    if (autoJoined.current || room || !joinCode) return;
    autoJoined.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    joinRoom(joinCode.toUpperCase())
      .then((res) => (res.success && res.room ? setRoom(res.room) : toast.error(res.error || 'That invite is no longer valid.')))
      .catch(() => toast.error("Couldn't reach the server. Try again."));
  }, [joinCode, room]);

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
      setRoom(null);
    } catch {
      toast.error('Could not leave the room.');
    }
  };

  const copyInvite = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(inviteUrl(room.code));
    toast.success('Invite link copied');
  };

  const copyRoomCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setIsCopied(true);
    toast.success('Room code copied');
    setTimeout(() => setIsCopied(false), 1800);
  };

  /* ---------- No room yet: host or join ---------- */
  if (!room) {
    return (
      <Shell onBack={onBack} backLabel="Home">
        <h1 className="font-display text-4xl leading-tight">Take a seat</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Signed in as <span className="font-semibold text-foreground">{currentUser.username}</span>.
        </p>

        <div className="mt-8 grid gap-0 border-y border-border md:grid-cols-2 md:divide-x md:divide-border">
          <section className="space-y-4 py-8 md:pr-10">
            <h2 className="text-xl font-semibold">Host a room</h2>
            <p className="max-w-sm text-[15px] text-muted-foreground">Create a private room, share the code, and add bots to fill empty seats.</p>
            <Button size="lg" onClick={handleCreateRoom} disabled={isLoading} className="w-full sm:w-auto sm:min-w-52">
              {isLoading ? <Loader2 className="animate-spin" /> : 'Create room'}
            </Button>
          </section>

          <section className="space-y-4 border-t border-border py-8 md:border-t-0 md:pl-10">
            <h2 className="text-xl font-semibold">Join a room</h2>
            <p className="max-w-sm text-[15px] text-muted-foreground">Enter the code your host shared.</p>
            <form onSubmit={handleJoinRoom} className="flex max-w-sm gap-2">
              <Input
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="ABCD-1234"
                aria-label="Room code"
                autoCapitalize="characters"
                className="h-12 font-mono text-lg tracking-widest"
              />
              <Button type="submit" size="lg" variant="secondary" disabled={isLoading || !roomCodeInput}>
                Join
              </Button>
            </form>
          </section>
        </div>
      </Shell>
    );
  }

  /* ---------- In a room ---------- */
  const isHost = room.hostId === currentUser.id;
  const me = room.players.find((p) => p.id === currentUser.id);
  const everyoneReady = room.players.every((p) => p.isReady || p.isHost || p.isBot);
  const canStart = isHost && room.players.length >= 2 && everyoneReady;
  const empty = MAX_SEATS - room.players.length;

  return (
    <Shell onBack={handleLeaveRoom} backLabel="Leave room">
      <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
        <section className="space-y-7">
          <div>
            <p className="text-[13px] text-muted-foreground">Room code</p>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-4xl font-semibold tracking-wide">{room.code}</span>
              <Button variant="secondary" size="icon" onClick={copyRoomCode} aria-label="Copy room code">
                {isCopied ? <Check /> : <Copy />}
              </Button>
            </div>
            <p className="mt-1.5 text-[13px] text-muted-foreground">Share the code, or send the invite link: it joins them straight to this room.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={copyInvite}>
                <Link2 /> Copy invite link
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <a href={`https://wa.me/?text=${encodeURIComponent(`Join my Monopoly game: ${inviteUrl(room.code)}`)}`} target="_blank" rel="noreferrer">
                  <Send /> WhatsApp
                </a>
              </Button>
            </div>
            {/* White on purpose: scanners need contrast whatever the theme */}
            <div className="mt-3 inline-block rounded-md bg-white p-2" role="img" aria-label="QR code for the invite link">
              <QRCodeSVG value={inviteUrl(room.code)} size={112} />
            </div>
          </div>

          <fieldset disabled={!isHost} className="space-y-3 disabled:opacity-100">
            <legend className="text-[14px] font-semibold">House rules {!isHost && <span className="font-normal text-muted-foreground">· set by the host</span>}</legend>
            <label className="flex items-center justify-between gap-3 text-[14px]">
              Starting cash
              <Input
                type="number"
                inputMode="numeric"
                step={100}
                min={500}
                max={10000}
                value={room.rules?.startingMoney ?? 1500}
                onChange={(e) => setRules({ ...room.rules, startingMoney: parseInt(e.target.value, 10) || 1500, freeParkingPot: !!room.rules?.freeParkingPot })}
                className="h-10 w-28 text-right disabled:opacity-100"
              />
            </label>
            <label className={cn('flex items-start gap-3 text-[14px]', isHost && 'cursor-pointer')}>
              <input
                type="checkbox"
                checked={!!room.rules?.freeParkingPot}
                onChange={(e) => setRules({ ...room.rules, startingMoney: room.rules?.startingMoney ?? 1500, freeParkingPot: e.target.checked })}
                className="mt-1 h-4 w-4 accent-[hsl(var(--gold))]"
              />
              <span>
                Free Parking pot
                <span className="block text-[12px] text-muted-foreground">Taxes go to the middle. Landing on Free Parking collects them.</span>
              </span>
            </label>
            <label className={cn('flex items-start gap-3 text-[14px]', isHost && 'cursor-pointer')}>
              <input
                type="checkbox"
                checked={!!room.rules?.quickGame}
                onChange={(e) => setRules({ startingMoney: room.rules?.startingMoney ?? 1500, freeParkingPot: !!room.rules?.freeParkingPot, quickGame: e.target.checked })}
                className="mt-1 h-4 w-4 accent-[hsl(var(--gold))]"
              />
              <span>
                Quick game
                <span className="block text-[12px] text-muted-foreground">
                  {QUICK_GAME.minutes} minutes, the richest player wins. {QUICK_GAME.turnSeconds} seconds per move, ${QUICK_GAME.fine} fine if you are late.
                </span>
              </span>
            </label>
          </fieldset>

          <div className="space-y-2">
            {isHost ? (
              <>
                <Button size="lg" className="w-full" disabled={!canStart} onClick={startGame}>
                  <Play /> Start game
                </Button>
                {!canStart && (
                  <p className="text-[13px] text-muted-foreground">
                    {room.players.length < 2 ? 'Need at least 2 players. Add a bot or wait for a friend.' : 'Waiting for everyone to be ready.'}
                  </p>
                )}
              </>
            ) : (
              <Button size="lg" className="w-full" variant={me?.isReady ? 'secondary' : 'default'} onClick={() => toggleReady(!me?.isReady)}>
                {me?.isReady ? (
                  <>
                    <Check /> Ready, tap to undo
                  </>
                ) : (
                  'Ready up'
                )}
              </Button>
            )}
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleLeaveRoom}>
              <LogOut /> Leave room
            </Button>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Seats</h2>
            <span className="text-[13px] tabular-nums text-muted-foreground">
              {room.players.length} of {MAX_SEATS}
            </span>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            <AnimatePresence initial={false}>
            {room.players.map((p) => (
              <motion.li
                key={p.id}
                layout="position"
                initial={reduce ? false : { opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: 16 }}
                transition={{ duration: dur.base, ease: ease.out }}
                className="flex min-h-16 items-center gap-3 py-2"
              >
                <Pawn color={p.color} name={p.username} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-[16px] font-semibold">
                    {p.username}
                    {p.id === currentUser.id && <span className="text-[12px] font-medium text-muted-foreground">you</span>}
                    {p.isHost && <Crown className="h-4 w-4 text-foreground" aria-label="Host" />}
                    {p.isBot && <Bot className="h-4 w-4 text-muted-foreground" aria-label="Bot" />}
                    {!p.isConnected && <WifiOff className="h-4 w-4 text-ruby-text" aria-label="Disconnected" />}
                  </p>
                  <p className="text-[13px] text-muted-foreground">{p.isBot ? 'Plays automatically' : p.isHost ? 'Host' : p.isReady ? 'Ready' : 'Not ready yet'}</p>
                </div>
                {isHost && p.isBot && (
                  <Button variant="ghost" size="icon" aria-label={`Remove ${p.username}`} onClick={() => removeBot(p.id)}>
                    <X />
                  </Button>
                )}
              </motion.li>
            ))}
            </AnimatePresence>
            {Array.from({ length: Math.max(0, empty) }).map((_, i) => (
              <li key={`empty-${i}`} className="flex min-h-16 items-center gap-3 py-2">
                <span className="grid h-[38px] w-[38px] place-items-center rounded-full border border-dashed border-border text-muted-foreground" aria-hidden>
                  <Plus className="h-4 w-4" />
                </span>
                <p className="flex-1 text-[14px] text-muted-foreground">Open seat</p>
                {isHost && (
                  <Button variant="secondary" size="sm" onClick={addBot}>
                    <Bot /> Add bot
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
};
