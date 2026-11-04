import { Property, CardData } from './constants';

export type PlayerId = string;

export interface HouseRules {
  startingMoney: number;
  freeParkingPot: boolean; // taxes go to a pot that Free Parking pays out
}

export const DEFAULT_RULES: HouseRules = { startingMoney: 1500, freeParkingPot: false };

/** Clamp untrusted rule input from a client. */
export function sanitizeRules(input: Partial<HouseRules> | undefined): HouseRules {
  const money = Math.round(Number(input?.startingMoney));
  return {
    startingMoney: Number.isFinite(money) ? Math.min(10000, Math.max(500, money)) : DEFAULT_RULES.startingMoney,
    freeParkingPot: !!input?.freeParkingPot,
  };
}

export type AIDifficulty = 'easy' | 'medium';

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  money: number;
  position: number;
  previousPosition?: number; // For animation tracking
  isAI: boolean;
  difficulty?: AIDifficulty;
  inJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  isBankrupt: boolean;
  doublesCount: number;
}

export interface OwnedProperty {
  position: number;
  ownerId: PlayerId;
  houses: number; // 0-4 for houses, 5 for hotel
  isMortgaged: boolean;
}

export interface AuctionState {
  active: boolean;
  propertyPosition: number;
  currentBid: number;
  currentBidder: PlayerId | null;
  participants: PlayerId[]; // Player IDs still in auction
  passedPlayers: PlayerId[]; // Player IDs who passed
  currentBidderIndex: number; // Index in participants array for whose turn it is
}

export interface TradeOffer {
  active: boolean;
  fromPlayer: PlayerId;
  toPlayer: PlayerId;
  offeredProperties: number[]; // positions
  requestedProperties: number[]; // positions
  offeredMoney: number;
  requestedMoney: number;
  offeredCards: number; // Get out of jail cards
  requestedCards: number;
}

export interface BankruptcyState {
  playerId: PlayerId; // Who needs to pay
  amountOwed: number; // How much they owe
  creditorId: PlayerId | null; // Who they owe (null for bank)
  reason: string; // Description of why they owe
}

export interface GameState {
  phase: 'setup' | 'playing' | 'auction' | 'trade' | 'bankruptcy' | 'gameover';
  players: Player[];
  currentPlayerIndex: number;
  ownedProperties: OwnedProperty[];
  availableHouses: number;
  availableHotels: number;
  chanceDeck: CardData[];
  communityChestDeck: CardData[];
  lastDiceRoll: [number, number] | null;
  turnPhase: 'roll' | 'action' | 'endturn' | 'injail';
  currentCard: CardData | null;
  lastCard?: CardData; // the most recent draw; currentCard is cleared when the card resolves
  cardSeq?: number; // bumps on every draw so a client can show each card once
  auction: AuctionState | null;
  trade: TradeOffer | null;
  bankruptcyState: BankruptcyState | null;
  winner: PlayerId | null;
  preAuctionPlayerIndex?: number;
  gameLog: string[];
  rules?: HouseRules;
  freeParkingPot?: number; // money waiting on Free Parking (only with the pot rule)
  diceMultiplierForRent: number; // For utility rent calculation
  specialRentMultiplier: { type: 'railroad' | 'utility', multiplier: number } | null; // For card-based movements
}

export type GameAction =
  | { type: 'ROLL_DICE' }
  | { type: 'BUY_PROPERTY' }
  | { type: 'DECLINE_PROPERTY' }
  | { type: 'BUILD_HOUSE'; position: number }
  | { type: 'SELL_HOUSE'; position: number }
  | { type: 'MORTGAGE_PROPERTY'; position: number }
  | { type: 'UNMORTGAGE_PROPERTY'; position: number }
  | { type: 'PAY_JAIL_FINE' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'ATTEMPT_JAIL_ROLL' }
  | { type: 'END_TURN' }
  | { type: 'AUCTION_BID'; amount: number }
  | { type: 'AUCTION_PASS' }
  | { type: 'PROPOSE_TRADE'; offer: Omit<TradeOffer, 'active'> }
  | { type: 'ACCEPT_TRADE' }
  | { type: 'DECLINE_TRADE' }
  | { type: 'DECLARE_BANKRUPTCY'; creditorId: PlayerId | null };
