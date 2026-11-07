import React, { lazy, memo, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  CircleHelp,
  Coins,
  Droplets,
  Gem,
  Landmark,
  Lightbulb,
  Lock,
  ParkingCircle,
  Siren,
  TrainFront,
} from 'lucide-react';
import { GameState, Player } from '@/game/types';
import { BOARD_TILES } from '@/game/constants';
import { Pawn, PROPERTY_HEX } from '@/components/game/kit';
import Noise from '@/components/Noise';
import { Building } from '@/components/game/Building';
import { CardDecks } from '@/components/game/CardDecks';
import { Fallback } from '@/components/game/Fallback';
import { webglAvailable } from '@/lib/webgl';
import { CANVAS_EXTEND } from '@/lib/boardTilt';
import { PRODUCT_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion';

type Tile = (typeof BOARD_TILES)[number];
type Orientation = 'top' | 'bottom' | 'left' | 'right' | 'corner';

/** Grid cell (0..10) of a board position. Bottom row runs right to left, then clockwise. */
function cellOf(position: number): { col: number; row: number } {
  if (position <= 10) return { col: 10 - position, row: 10 };
  if (position <= 19) return { col: 0, row: 20 - position };
  if (position <= 30) return { col: position - 20, row: 0 };
  return { col: 10, row: position - 30 };
}

const ABBREVIATIONS: [RegExp, string][] = [
  [/Pennsylvania/, 'Penn.'],
  [/Mediterranean/, 'Medit.'],
  [/Connecticut/, 'Conn.'],
  [/Tennessee/, 'Tenn.'],
  [/North Carolina/, 'N. Carolina'],
  [/Community/, 'Comm.'],
  [/Railroad/, 'RR'],
  [/Avenue/, 'Ave'],
  [/Place/, 'Pl'],
  [/Company/, 'Co'],
  [/B\. & O\./, 'B&O'],
];
/** Short enough to stay at a readable size on a tile. */
function shortName(name: string): string {
  return ABBREVIATIONS.reduce((n, [re, short]) => n.replace(re, short), name);
}

/**
 * Phone boards give a tile about 29px, so names are hand-shortened to 6 characters or fewer.
 * Tiles without an entry (Chance, Chest, corners) are told apart by their icons.
 */
export const PHONE_NAMES: Record<number, string> = {
  1: 'Medit.', 3: 'Baltic', 5: 'Read.', 6: 'Orient', 8: 'Verm.', 9: 'Conn.', 11: 'St.Ch.', 12: 'Elec.', 13: 'States',
  14: 'Virg.', 15: 'Pa.RR', 16: 'St.Ja.', 18: 'Tenn.', 19: 'N.York', 21: 'Kent.', 23: 'Indi.', 24: 'Illi.', 25: 'B&O',
  26: 'Atl.', 27: 'Vent.', 28: 'Water', 29: 'Marv.', 31: 'Pac.', 32: 'N.Car.', 34: 'Penn.', 35: 'Short', 37: 'Park', 39: 'Board.',
};

function orientationOf(position: number): Orientation {
  if (position % 10 === 0) return 'corner';
  if (position < 10) return 'bottom';
  if (position < 20) return 'left';
  if (position < 30) return 'top';
  return 'right';
}

// Corners are 1.5 units wide, every other tile 1 unit: 12 units across.
const TRACK = '1.5fr repeat(9, 1fr) 1.5fr';
const unit = (i: number) => (i === 0 ? 0.75 : i === 10 ? 11.25 : i + 1);
export const centerOf = (position: number) => {
  const { col, row } = cellOf(position);
  return { x: (unit(col) / 12) * 100, y: (unit(row) / 12) * 100 };
};

/**
 * Where on its tile a pawn rests, in board percent. Names sit in the middle of a tile, so pawns
 * rest on the coloured band side (or toward the board's centre on corners and plain tiles)
 * instead of on top of the text.
 */
export function restingOffset(position: number): { dx: number; dy: number } {
  const u = 100 / 12;
  const orientation = orientationOf(position);
  const { col, row } = cellOf(position);
  switch (orientation) {
    case 'top':
      return { dx: 0, dy: 0.26 * u };
    case 'bottom':
      return { dx: 0, dy: -0.26 * u };
    case 'left':
      return { dx: 0.26 * u, dy: 0 };
    case 'right':
      return { dx: -0.26 * u, dy: 0 };
    default:
      return { dx: (col === 0 ? 1 : -1) * 0.42 * u, dy: (row === 0 ? 1 : -1) * 0.42 * u };
  }
}

const SPECIAL_ICON: Record<string, React.ReactNode> = {
  jail: <Lock />,
  free: <ParkingCircle />,
  gotojail: <Siren />,
  chance: <CircleHelp />,
  community: <Landmark />,
  tax: <Coins />,
  luxury: <Gem />,
  railroad: <TrainFront />,
};

function iconFor(tile: Tile, position: number) {
  if (tile.type === 'utility') return position === 12 ? <Lightbulb /> : <Droplets />;
  return SPECIAL_ICON[tile.type] ?? null;
}

const BAND: Record<Exclude<Orientation, 'corner'>, string> = {
  top: 'bottom-0 inset-x-0 h-[27%] flex-row',
  bottom: 'top-0 inset-x-0 h-[27%] flex-row',
  left: 'right-0 inset-y-0 w-[27%] flex-col',
  right: 'left-0 inset-y-0 w-[27%] flex-col',
};
const BODY_PAD: Record<Exclude<Orientation, 'corner'>, string> = {
  top: 'pb-[27%]',
  bottom: 'pt-[27%]',
  left: 'pr-[27%]',
  right: 'pl-[27%]',
};

interface TileProps {
  tile: Tile;
  position: number;
  owned?: GameState['ownedProperties'][number];
  owner?: Player;
  onClick?: () => void;
}

const BoardTile = memo(function BoardTile({ tile, position, owned, owner, onClick }: TileProps) {
  const orientation = orientationOf(position);
  const isCorner = orientation === 'corner';
  const property = tile.property;
  const group = property?.color;
  const hasBand = !!group && property?.type === 'property';
  const houses = owned?.houses ?? 0;
  const { col, row } = cellOf(position);
  const label = shortName(tile.name);
  // False while the board first draws, so existing buildings appear at once and only new ones animate
  const settled = useRef(false);
  useEffect(() => {
    settled.current = true;
  }, []);
  const reduce = useReducedMotion();

  return (
    <button
      type="button"
      data-tile={position}
      onClick={onClick}
      aria-label={`${tile.name}${property ? `, $${property.price}` : ''}${owner ? `, owned by ${owner.name}` : ''}${houses ? (houses === 5 ? ', hotel' : `, ${houses} house${houses > 1 ? 's' : ''}`) : ''}`}
      className={cn(
        'board-tile group relative min-h-0 min-w-0 overflow-hidden border border-border/80 bg-card text-foreground transition-colors duration-150 hover:bg-raised focus-visible:z-10',
        owned?.isMortgaged && 'opacity-50'
      )}
      style={{
        gridColumn: col + 1,
        gridRow: row + 1,
        boxShadow: owner ? `inset 0 0 0 1.5px ${owner.color}` : undefined,
      }}
    >
      {hasBand && !isCorner && (
        <span
          className={cn('absolute flex items-center justify-center gap-[2px]', BAND[orientation])}
          // Gloss: a highlight at the top, a little shade at the bottom, over the flat property colour
          style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0) 55%, rgba(0,0,0,0.2)), ${PROPERTY_HEX[group!]}` }}
        >
          {houses > 0 && <Building houses={houses} animate={settled.current} />}
        </span>
      )}

      <span
        className={cn(
          'relative flex h-full w-full flex-col items-center justify-center px-[6%] text-center',
          !isCorner && hasBand && BODY_PAD[orientation as Exclude<Orientation, 'corner'>]
        )}
      >
        {!hasBand && (
          <span
            className={cn(
              'mb-[3%] text-slate-300 [&_svg]:h-[clamp(9px,2.3cqw,20px)] [&_svg]:w-[clamp(9px,2.3cqw,20px)]',
              isCorner && '[&_svg]:h-[clamp(12px,3.3cqw,28px)] [&_svg]:w-[clamp(12px,3.3cqw,28px)]'
            )}
            style={{ color: tile.type === 'gotojail' ? 'hsl(var(--ruby-text))' : undefined }}
          >
            {tile.type === 'go' ? <ArrowRight /> : iconFor(tile, position)}
          </span>
        )}
        <span className={cn('tile-name font-medium', isCorner && 'font-semibold')} style={isCorner ? { fontSize: 'clamp(7px,1.6cqw,14px)' } : undefined}>
          {label}
        </span>
        {PHONE_NAMES[position] && (
          // Shown only on small boards (see .tile-short); the rows along the top and bottom read sideways to fit
          <span className={cn('tile-short', (orientation === 'top' || orientation === 'bottom') && 'tile-short-v')} aria-hidden>
            {PHONE_NAMES[position]}
          </span>
        )}
        {property && (
          <span className="tile-price mt-[2%] tabular-nums text-muted-foreground">${property.price}</span>
        )}
      </span>

      {owner && (
        <motion.span
          key={owner.id}
          aria-hidden
          // Stamped down only when ownership changes after the board first drew
          initial={settled.current && !reduce ? { scale: 2.6, rotate: -14, opacity: 0 } : false}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={spring}
          className="absolute bottom-[4%] right-[4%] grid place-items-center rounded-[2px] font-semibold leading-none"
          style={{
            background: owner.color,
            color: '#0E1116',
            width: 'clamp(10px,1.8cqw,16px)',
            height: 'clamp(10px,1.8cqw,16px)',
            fontSize: 'clamp(8px,1.1cqw,10px)',
          }}
        >
          {owner.name.charAt(0)}
        </motion.span>
      )}
      {owned?.isMortgaged && (
        <span className="absolute left-[6%] top-[4%] rounded-[2px] bg-ruby/80 px-[3px] text-[8px] font-semibold leading-tight text-bone">M</span>
      )}
    </button>
  );
});

/** Tiles a pawn passes through. Dice and short card moves walk tile by tile; jail and long jumps slide straight there. */
export function walkTrack(from: number, to: number, inJail: boolean, reduce: boolean): number[] {
  const steps = (to - from + 40) % 40;
  const walk = !reduce && steps > 0 && steps <= 12 && !(to === 10 && inJail);
  return walk ? Array.from({ length: steps }, (_, i) => (from + i + 1) % 40) : [to];
}

/** Where each pawn sits so several on one tile never overlap. */
export function slotOffsets(players: Player[]): Map<string, { dx: number; dy: number }> {
  const byTile = new Map<number, Player[]>();
  players.forEach((p) => byTile.set(p.position, [...(byTile.get(p.position) ?? []), p]));
  const out = new Map<string, { dx: number; dy: number }>();
  byTile.forEach((group) => {
    group.forEach((p, i) => {
      if (group.length === 1) return out.set(p.id, { dx: 0, dy: 0 });
      const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
      const r = (100 / 12) * 0.2;
      out.set(p.id, { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r });
    });
  });
  return out;
}

const PawnSprite: React.FC<{ player: Player; offset: { dx: number; dy: number }; size: number; active: boolean }> = ({
  player,
  offset,
  size,
  active,
}) => {
  const reduce = useReducedMotion();
  const last = useRef(player.position);
  const [track, setTrack] = useState<number[]>([player.position]);

  useEffect(() => {
    const from = last.current;
    const to = player.position;
    if (from === to) return;
    last.current = to;
    setTrack(walkTrack(from, to, player.inJail, !!reduce));
  }, [player.position, player.inJail, reduce]);

  // Walking tile by tile passes through tile centres; only the resting tile uses the offset spot
  const xs = track.map((p, i) => `${centerOf(p).x + (i === track.length - 1 ? restingOffset(p).dx : 0) + offset.dx}%`);
  const ys = track.map((p, i) => `${centerOf(p).y + (i === track.length - 1 ? restingOffset(p).dy : 0) + offset.dy}%`);

  return (
    <motion.div
      className="absolute"
      initial={false}
      animate={{ left: xs, top: ys }}
      transition={{ duration: track.length > 1 ? track.length * 0.11 : 0.4, ease: track.length > 1 ? 'linear' : [0.16, 1, 0.3, 1] }}
      style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, zIndex: active ? 3 : 2 }}
    >
      {active && !reduce && (
        <motion.span
          className="absolute -inset-[3px] rounded-full border-2 border-gold"
          animate={{ opacity: [1, 0.25, 1], scale: [1, 1.12, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <Pawn color={player.color} name={player.name} size={size} />
    </motion.div>
  );
};

// three.js is its own chunk, fetched only when a table opens
const Tokens3D = lazy(() => import('@/components/game/Tokens3D'));

interface GameBoardProps {
  gameState: GameState;
  onTileClick?: (position: number) => void;
  children?: React.ReactNode;
  /** Drawn over the whole board, inside it, so it lines up with the tiles */
  overlay?: React.ReactNode;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, onTileClick, children, overlay }) => {
  const { players, ownedProperties, currentPlayerIndex } = gameState;
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const ownedByPos = useMemo(() => new Map(ownedProperties.map((o) => [o.position, o])), [ownedProperties]);
  const live = players.filter((p) => !p.isBankrupt);
  const offsets = slotOffsets(live);
  const pawnSize = Math.max(16, Math.min(32, width * 0.036));
  const reduce = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const use3d = !reduce && webglAvailable() && !failed;
  const three = use3d && ready; // the 3D layer is up: the flat pawns step aside
  const pawns2d = (
    <>
      {live.map((p) => (
        <PawnSprite
          key={p.id}
          player={p}
          offset={offsets.get(p.id) ?? { dx: 0, dy: 0 }}
          size={pawnSize}
          active={players[currentPlayerIndex]?.id === p.id}
        />
      ))}
    </>
  );

  return (
    <div className="relative w-full">
      <div
        ref={ref}
        className="board relative aspect-square w-full border border-border bg-background brass-rule"
        style={{ display: 'grid', gridTemplateColumns: TRACK, gridTemplateRows: TRACK }}
      >
        {BOARD_TILES.map((tile, position) => (
          <BoardTile
            key={position}
            tile={tile}
            position={position}
            owned={ownedByPos.get(position)}
            owner={ownedByPos.has(position) ? playersById.get(ownedByPos.get(position)!.ownerId) : undefined}
            onClick={() => onTileClick?.(position)}
          />
        ))}

        {/* The felt well: wordmark, supply, dice tray and the latest event live here */}
        <div className="well relative overflow-hidden" style={{ gridColumn: '2 / 11', gridRow: '2 / 11' }}>
          <Noise opacity={0.12} fps={0} blendMode="soft-light" />
          {/* Brass inlay rings around the dice tray: gives the empty middle a centre of gravity */}
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="aspect-square w-[64%] rounded-full border border-gold/[0.16] p-[5%]">
              <div className="h-full w-full rounded-full border border-gold/[0.09]" />
            </div>
          </div>
          <CardDecks seq={gameState.cardSeq ?? 0} last={gameState.lastCard?.type} text={gameState.lastCard?.text} />
          <div className="relative flex h-full w-full flex-col items-center justify-between p-[4%]">
            <div className="text-center">
              <div className="well-wordmark font-display text-[clamp(14px,3.6cqw,34px)] leading-none text-bone/80">{PRODUCT_NAME}</div>
              <div className="mt-1 flex items-center justify-center gap-3 text-[clamp(8px,1.3cqw,12px)] tabular-nums text-bone/60">
                <span>{gameState.availableHouses} houses left</span>
                <span aria-hidden>·</span>
                <span>{gameState.availableHotels} hotels left</span>
              </div>
              {gameState.rules?.freeParkingPot && (
                <div className="relative z-20 mx-auto mt-1.5 w-fit rounded-full border border-gold/60 bg-black/70 px-[1.2cqw] py-[0.3cqw] text-[clamp(10px,2cqw,18px)] font-semibold tabular-nums text-gold">
                  Free Parking pot ${(gameState.freeParkingPot ?? 0).toLocaleString()}
                </div>
              )}
            </div>
            {children}
          </div>
        </div>

        {/* The flat pawns, until the 3D layer is ready or if it is not available */}
        <div className="pointer-events-none absolute inset-0">{three ? null : pawns2d}</div>
        {overlay}
      </div>

      {/* Pieces in 3D: a canvas a little larger than the board, so tall pieces on edge tiles are not cut off */}
      {use3d && (
        <div className="pointer-events-none absolute" style={{ inset: `-${CANVAS_EXTEND * 100}%` }}>
          <Fallback fallback={null} onFail={() => setFailed(true)}>
            <Suspense fallback={null}>
              <Tokens3D players={players} offsets={offsets} activeId={players[currentPlayerIndex]?.id} onReady={() => setReady(true)} onLost={() => setFailed(true)} />
            </Suspense>
          </Fallback>
        </div>
      )}
    </div>
  );
};
