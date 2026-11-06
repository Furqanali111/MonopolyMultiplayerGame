import { GameState, Player } from './types';
import {
  rollDice,
  rollTurn,
  rollForJailTurn,
  leaveJail,
  endTurn,
  buyProperty,
  canBuyProperty,
  startAuction,
  placeBid,
  passAuction,
  buildHouse,
  unmortgageProperty,
  canBuildHouse,
  acceptTrade,
  declineTrade,
  attemptPayment,
  proposeTrade,
  getPropertyData,
  getPropertyOwner,
} from './engine';
import {
  shouldAIBuyProperty,
  getAIAuctionBid,
  getAIJailDecision,
  getAIBuildDecisions,
  getAIUnmortgage,
  shouldAIAcceptTrade,
  getAITradeOffer,
} from './ai';
import { JAIL_FINE } from './constants';

/**
 * Quick game: should this human be fined for being late? On a timeout, and again at the start of
 * each later turn the table plays for them (`stoodIn`). Never while they are settling a debt.
 */
export function owesLateFine(state: GameState, actor: Player, stoodIn: boolean): boolean {
  if (!state.rules?.quickGame || actor.isAI || state.phase === 'bankruptcy') return false;
  const turnStart = state.phase === 'playing' && (state.turnPhase === 'roll' || state.turnPhase === 'injail') && actor.doublesCount === 0;
  return !stoodIn || turnStart;
}

/** The one player who has to act right now (null if the game is over). */
export function whoMustAct(state: GameState): Player | null {
  let id: string | undefined;
  switch (state.phase) {
    case 'bankruptcy':
      id = state.bankruptcyState?.playerId;
      break;
    case 'trade':
      id = state.trade?.toPlayer;
      break;
    case 'auction': {
      const a = state.auction;
      const active = a ? a.participants.filter(p => !a.passedPlayers.includes(p)) : [];
      id = a && active.length ? active[a.currentBidderIndex % active.length] : undefined;
      break;
    }
    case 'playing':
      id = state.players[state.currentPlayerIndex]?.id;
      break;
  }
  return state.players.find(p => p.id === id) ?? null;
}

/**
 * Make ONE decision for whoever must act, using the AI logic.
 * Used for AI seats and as a stand-in for humans who time out or disconnect.
 * Returns null when there is nothing to do or the decision changed nothing.
 */
export function autoStep(state: GameState): GameState | null {
  const actor = whoMustAct(state);
  if (!actor) return null;
  const next = decide(state, actor);
  return next === state ? null : next;
}

function decide(s: GameState, p: Player): GameState {
  switch (s.phase) {
    case 'bankruptcy': {
      // Pay if they raised enough, otherwise this declares bankruptcy
      const b = s.bankruptcyState!;
      return attemptPayment(s, b.playerId, b.amountOwed, b.creditorId, b.reason);
    }

    case 'trade':
      return shouldAIAcceptTrade(s, p) ? acceptTrade(s) : declineTrade(s);

    case 'auction': {
      const bid = getAIAuctionBid(s, p);
      const bidded = bid !== null ? placeBid(s, p.id, bid) : s;
      return bidded !== s ? bidded : passAuction(s, p.id);
    }

    case 'playing':
      break;

    default:
      return s;
  }

  switch (s.turnPhase) {
    case 'injail': {
      const choice = getAIJailDecision(s, p);
      if (choice === 'card' && p.getOutOfJailCards > 0) return leaveJail(s, p.id, 'card');
      if (choice === 'pay' && p.money >= JAIL_FINE) return leaveJail(s, p.id, 'fine');
      return rollForJailTurn(s, rollDice());
    }

    case 'roll':
      return rollTurn(s, rollDice());

    case 'action': {
      const unowned = getPropertyData(p.position) && !getPropertyOwner(s, p.position);
      if (!unowned) return endTurn(s);
      return shouldAIBuyProperty(s, p) && canBuyProperty(s, p.id, p.position)
        ? buyProperty(s, p.id, p.position)
        : startAuction(s, p.position);
    }

    case 'endturn': {
      // Now and then try to buy the last tile(s) of a colour set (random so a refusal can't loop)
      if (Math.random() < 0.15) {
        const offer = getAITradeOffer(s, p);
        const proposed = offer && proposeTrade(s, offer);
        if (proposed && proposed.phase === 'trade') return proposed;
      }
      const lift = getAIUnmortgage(s, p);
      if (lift !== null) return unmortgageProperty(s, p.id, lift);
      const pos = getAIBuildDecisions(s, p).find(x => canBuildHouse(s, p.id, x));
      return pos !== undefined ? buildHouse(s, p.id, pos) : endTurn(s);
    }
  }
  return s;
}
