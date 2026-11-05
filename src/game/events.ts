import { GameState, PlayerId } from './types';

/** What changed between two states: lets a client animate instead of jumping. */
export type GameEvent =
  | { type: 'dice'; playerId: PlayerId; dice: [number, number] }
  | { type: 'move'; playerId: PlayerId; from: number; to: number; passedGo: boolean }
  | { type: 'money'; playerId: PlayerId; delta: number; balance: number }
  | { type: 'property'; position: number; ownerId: PlayerId | null; houses: number; isMortgaged: boolean }
  | { type: 'card'; playerId: PlayerId; text: string }
  | { type: 'jail'; playerId: PlayerId; inJail: boolean }
  | { type: 'bankrupt'; playerId: PlayerId }
  | { type: 'turn'; playerId: PlayerId }
  | { type: 'auction'; status: 'started' | 'ended'; position: number | null }
  | { type: 'trade'; status: 'proposed' | 'resolved' };

export function diffEvents(prev: GameState, next: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const mover = prev.players[prev.currentPlayerIndex];

  if (next.lastDiceRoll && next.lastDiceRoll !== prev.lastDiceRoll) {
    events.push({ type: 'dice', playerId: mover.id, dice: next.lastDiceRoll });
  }

  if (next.lastCard && (next.cardSeq ?? 0) !== (prev.cardSeq ?? 0)) {
    events.push({ type: 'card', playerId: mover.id, text: next.lastCard.text });
  }

  for (const p of next.players) {
    const before = prev.players.find(x => x.id === p.id);
    if (!before) continue;
    if (p.position !== before.position) {
      // A lower position means they wrapped past GO, except Go To Jail and the Go Back 3 card (no forward card move is exactly 3 lower)
      const passedGo = p.position < before.position && !before.inJail && !p.inJail && before.position - p.position !== 3;
      events.push({ type: 'move', playerId: p.id, from: before.position, to: p.position, passedGo });
    }
    if (p.money !== before.money) events.push({ type: 'money', playerId: p.id, delta: p.money - before.money, balance: p.money });
    if (p.inJail !== before.inJail) events.push({ type: 'jail', playerId: p.id, inJail: p.inJail });
    if (p.isBankrupt && !before.isBankrupt) events.push({ type: 'bankrupt', playerId: p.id });
  }

  // Ownership / buildings / mortgages, including tiles returned to the bank
  const positions = new Set([...prev.ownedProperties, ...next.ownedProperties].map(o => o.position));
  for (const position of positions) {
    const a = prev.ownedProperties.find(o => o.position === position);
    const b = next.ownedProperties.find(o => o.position === position);
    if (a?.ownerId !== b?.ownerId || a?.houses !== b?.houses || a?.isMortgaged !== b?.isMortgaged) {
      events.push({ type: 'property', position, ownerId: b?.ownerId ?? null, houses: b?.houses ?? 0, isMortgaged: b?.isMortgaged ?? false });
    }
  }

  if (!prev.auction && next.auction) events.push({ type: 'auction', status: 'started', position: next.auction.propertyPosition });
  if (prev.auction && !next.auction) events.push({ type: 'auction', status: 'ended', position: prev.auction.propertyPosition });
  if (!prev.trade && next.trade) events.push({ type: 'trade', status: 'proposed' });
  if (prev.trade && !next.trade) events.push({ type: 'trade', status: 'resolved' });

  if (next.currentPlayerIndex !== prev.currentPlayerIndex && next.phase !== 'gameover') {
    events.push({ type: 'turn', playerId: next.players[next.currentPlayerIndex].id });
  }
  return events;
}
