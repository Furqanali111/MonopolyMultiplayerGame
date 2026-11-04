import { 
  GameState, 
  Player, 
  AIDifficulty, PlayerId } from './types';
import {
  getPropertyData,
  getPropertyOwner,
  canBuyProperty,
  canBuildHouse,
  canMortgage,
  canSellHouse,
  hasMonopoly,
  calculatePlayerNetWorth,
  BOARD_TILES,
} from './engine';
import { JAIL_FINE } from './constants';
import { TradeOffer } from './types';

interface AIDecision {
  action: string;
  data?: any;
}

// Utility function to get player's owned properties
function getPlayerProperties(state: GameState, playerId: PlayerId) {
  return state.ownedProperties.filter(p => p.ownerId === playerId);
}

// Determine if AI should buy a property
export function shouldAIBuyProperty(state: GameState, player: Player): boolean {
  const property = getPropertyData(player.position);
  if (!property) return false;

  if (!canBuyProperty(state, player.id, player.position)) return false;

  const difficulty = player.difficulty || 'easy';
  
  if (difficulty === 'easy') {
    // Easy AI buys randomly (60% chance) if they have enough money
    const moneyAfterPurchase = player.money - property.price;
    if (moneyAfterPurchase < 50) return false; // Keep some reserve
    return Math.random() < 0.6;
  }

  // Medium AI strategy
  const moneyAfterPurchase = player.money - property.price;
  
  // Don't buy if it would leave us with less than $100
  if (moneyAfterPurchase < 100) return false;

  // Always buy railroads if we can afford it with good cushion
  if (property.type === 'railroad' && moneyAfterPurchase >= 150) return true;
  
  // Always buy utilities if we can afford it with good cushion
  if (property.type === 'utility' && moneyAfterPurchase >= 150) return true;

  // Check if we'd complete or get closer to a monopoly
  if (property.colorGroup) {
    const ownedInGroup = property.colorGroup.filter(pos => {
      const owned = getPropertyOwner(state, pos);
      return owned && owned.ownerId === player.id;
    }).length;

    // If we'd get 2+ in a color group, definitely buy
    if (ownedInGroup >= 1) return true;

    // If opponent owns one in this group, consider blocking
    const opponentOwns = property.colorGroup.some(pos => {
      const owned = getPropertyOwner(state, pos);
      return owned && owned.ownerId !== player.id;
    });

    if (opponentOwns && moneyAfterPurchase >= 200) return true;
  }

  // Generally buy if we have enough cushion
  return moneyAfterPurchase >= 250;
}

// Get AI's auction bid
export function getAIAuctionBid(state: GameState, player: Player): number | null {
  if (!state.auction) return null;

  const property = getPropertyData(state.auction.propertyPosition);
  if (!property) return null;

  const difficulty = player.difficulty || 'easy';
  const currentBid = state.auction.currentBid;

  // Handle first bid (when currentBid is 0) - start with a reasonable opening bid
  if (currentBid === 0) {
    const openingBid = Math.max(10, Math.floor(property.price * 0.1)); // Start at 10% of property price, minimum $10
    if (openingBid > player.money - 50) return player.money - 100; // Can't afford
    
    const bidChance = difficulty === 'easy' ? 0.7 : 0.85; // Medium AI more likely to bid
    if (Math.random() > bidChance) return null; // Pass chance
    
    return openingBid;
  }

  if (difficulty === 'easy') {
    // Easy AI bids randomly up to 150% of property value (auctions can exceed list price)
    const maxBid = Math.min(Math.floor(property.price * 1.5), player.money - 50);
    if (maxBid <= currentBid) return null;
    
    const bidChance = Math.random();
    if (bidChance < 0.3) return null; // 30% pass
    
    const bid = Math.min(
      currentBid + Math.floor(Math.random() * 20) + 1,
      maxBid
    );
    return bid > currentBid ? bid : null;
  }

  // Medium AI strategic bidding - can bid above property price in auctions
  let maxWillingBid = Math.floor(property.price * 1.5); // Base: 150% of property price

  // Increase willingness for monopoly completion
  if (property.colorGroup) {
    const ownedInGroup = property.colorGroup.filter(pos => {
      const owned = getPropertyOwner(state, pos);
      return owned && owned.ownerId === player.id;
    }).length;

    if (ownedInGroup >= 1) {
      // Willing to pay up to 200% of property price to complete a monopoly
      maxWillingBid = Math.floor(property.price * 2.0);
    }
  }

  // Don't bid more than we can afford minus cushion
  maxWillingBid = Math.min(maxWillingBid, player.money - 100);

  if (maxWillingBid <= currentBid) return null;

  // Bid incrementally
  const increment = Math.max(10, Math.floor((maxWillingBid - currentBid) * 0.2));
  const bid = Math.min(currentBid + increment, maxWillingBid);

  return bid > currentBid ? bid : null;
}

// Determine AI's jail strategy
export function getAIJailDecision(state: GameState, player: Player): 'pay' | 'card' | 'roll' {
  const difficulty = player.difficulty || 'easy';

  // Always use card if available
  if (player.getOutOfJailCards > 0) return 'card';

  if (difficulty === 'easy') {
    // Easy AI just tries to roll
    return 'roll';
  }

  // Medium AI considers game state
  // If we're late in game or have monopolies, pay to get out
  const playerProperties = getPlayerProperties(state, player.id);
  const hasAnyMonopoly = playerProperties.some(p => hasMonopoly(state, player.id, p.position));

  if (hasAnyMonopoly && player.money > JAIL_FINE + 200) {
    return 'pay';
  }

  // If on 3rd turn, will be forced to pay anyway
  if (player.jailTurns >= 2) {
    return 'roll'; // Last chance to roll
  }

  return 'roll';
}

// Get AI building decisions
export function getAIBuildDecisions(state: GameState, player: Player): number[] {
  const propertiesToBuild: number[] = [];
  const difficulty = player.difficulty || 'easy';

  if (difficulty === 'easy') {
    // Easy AI doesn't build strategically
    return [];
  }

  const playerProperties = getPlayerProperties(state, player.id);
  
  // Find monopolies
  const monopolyPositions = playerProperties.filter(p => 
    hasMonopoly(state, player.id, p.position)
  );

  if (monopolyPositions.length === 0) return [];

  // Group by color
  const colorGroups = new Map<string, number[]>();
  monopolyPositions.forEach(owned => {
    const property = getPropertyData(owned.position);
    if (property?.color) {
      const group = colorGroups.get(property.color) || [];
      group.push(owned.position);
      colorGroups.set(property.color, group);
    }
  });

  // Build evenly across monopolies
  colorGroups.forEach((positions) => {
    // Sort by houses (lowest first for even building)
    const sorted = positions.sort((a, b) => {
      const ownedA = state.ownedProperties.find(p => p.position === a);
      const ownedB = state.ownedProperties.find(p => p.position === b);
      return (ownedA?.houses || 0) - (ownedB?.houses || 0);
    });

    // Try to build on the one with fewest houses
    for (const pos of sorted) {
      if (canBuildHouse(state, player.id, pos)) {
        const property = getPropertyData(pos);
        if (property?.houseCost && player.money - property.houseCost > 150) {
          propertiesToBuild.push(pos);
          break; // One at a time for even building
        }
      }
    }
  });

  return propertiesToBuild;
}

// Get AI mortgage decisions when short on cash
export function getAIMortgageDecisions(state: GameState, player: Player, amountNeeded: number): number[] {
  const propertiesToMortgage: number[] = [];
  let raised = 0;

  const playerProperties = getPlayerProperties(state, player.id);
  
  // Sort by least valuable first (non-monopoly properties first)
  const sorted = [...playerProperties].sort((a, b) => {
    const propA = getPropertyData(a.position);
    const propB = getPropertyData(b.position);
    
    const hasMonoA = hasMonopoly(state, player.id, a.position);
    const hasMonoB = hasMonopoly(state, player.id, b.position);

    // Prefer mortgaging non-monopoly properties
    if (hasMonoA && !hasMonoB) return 1;
    if (!hasMonoA && hasMonoB) return -1;

    return (propA?.mortgageValue || 0) - (propB?.mortgageValue || 0);
  });

  for (const owned of sorted) {
    if (raised >= amountNeeded) break;
    
    if (canMortgage(state, player.id, owned.position)) {
      const property = getPropertyData(owned.position);
      if (property) {
        propertiesToMortgage.push(owned.position);
        raised += property.mortgageValue;
      }
    }
  }

  return propertiesToMortgage;
}

// Get AI decisions for selling houses when short on cash
export function getAISellHouseDecisions(state: GameState, player: Player, amountNeeded: number): number[] {
  const propertiesToSell: number[] = [];
  let raised = 0;

  const playerProperties = getPlayerProperties(state, player.id);
  const propertiesWithHouses = playerProperties.filter(p => p.houses > 0);
  
  // Sort by most houses first (sell hotels/high houses first)
  const sorted = [...propertiesWithHouses].sort((a, b) => b.houses - a.houses);

  for (const owned of sorted) {
    if (raised >= amountNeeded) break;
    
    if (canSellHouse(state, player.id, owned.position)) {
      const property = getPropertyData(owned.position);
      if (property?.houseCost) {
        propertiesToSell.push(owned.position);
        raised += Math.floor(property.houseCost / 2);
      }
    }
  }

  return propertiesToSell;
}

// Check if AI should try to raise money before an action
export function shouldAIRaiseMoney(state: GameState, player: Player, minCashNeeded: number): {
  shouldRaise: boolean;
  sellHouses: number[];
  mortgageProperties: number[];
} {
  if (player.money >= minCashNeeded) {
    return { shouldRaise: false, sellHouses: [], mortgageProperties: [] };
  }

  const deficit = minCashNeeded - player.money;
  
  // First try selling houses
  const sellHouses = getAISellHouseDecisions(state, player, deficit);
  let raised = sellHouses.reduce((sum, pos) => {
    const prop = getPropertyData(pos);
    return sum + (prop?.houseCost ? Math.floor(prop.houseCost / 2) : 0);
  }, 0);

  // If still short, mortgage properties
  const mortgageProperties = raised < deficit 
    ? getAIMortgageDecisions(state, player, deficit - raised)
    : [];

  return {
    shouldRaise: true,
    sellHouses,
    mortgageProperties,
  };
}

// Determine if AI should accept a trade offer
export function shouldAIAcceptTrade(state: GameState, player: Player): boolean {
  const trade = state.trade;
  if (!trade || trade.toPlayer !== player.id) return false;

  const difficulty = player.difficulty || 'easy';

  // Easy AI only compares sticker prices; medium and hard also weigh monopolies
  const smart = difficulty !== 'easy';
  const fromPlayer = state.players.find(p => p.id === trade.fromPlayer);
  if (!fromPlayer) return false;

  let myValue = 0;
  let theirValue = 0;

  // Calculate value of what I'm giving up
  trade.requestedProperties.forEach(pos => {
    const prop = getPropertyData(pos);
    if (prop) {
      myValue += prop.price;
      // Extra value if I have monopoly
      if (smart && hasMonopoly(state, player.id, pos)) {
        myValue += prop.price * 0.5; // 50% premium for breaking monopoly
      }
    }
  });
  myValue += trade.requestedMoney;
  myValue += trade.requestedCards * 50; // Value jail cards at $50

  // Calculate value of what I'm getting
  trade.offeredProperties.forEach(pos => {
    const prop = getPropertyData(pos);
    if (prop) {
      theirValue += prop.price;
      
      // Check if this would complete a monopoly for me
      if (smart && prop.colorGroup) {
        const wouldComplete = prop.colorGroup.every(groupPos => {
          if (groupPos === pos) return true;
          const owned = state.ownedProperties.find(p => p.position === groupPos);
          return owned && owned.ownerId === player.id;
        });
        
        if (wouldComplete) {
          theirValue += prop.price; // 100% premium for completing monopoly
        }
      }
    }
  });
  theirValue += trade.offeredMoney;
  theirValue += trade.offeredCards * 50;

  // Accept if we're getting at least 90% fair value or completing a monopoly
  return theirValue >= myValue * (smart ? 0.9 : 1);
}

// Process full AI turn decision
export function processAITurn(state: GameState, player: Player): AIDecision {
  // This function determines the next action the AI should take
  // It's called repeatedly until the turn is over

  if (player.inJail) {
    return { action: 'jail_decision', data: getAIJailDecision(state, player) };
  }

  switch (state.turnPhase) {
    case 'roll':
      return { action: 'roll_dice' };

    case 'action':
      // Check if we're on an unowned property
      const property = getPropertyData(player.position);
      const owned = getPropertyOwner(state, player.position);
      
      if (property && !owned) {
        if (shouldAIBuyProperty(state, player)) {
          return { action: 'buy_property' };
        } else {
          return { action: 'decline_property' };
        }
      }
      return { action: 'end_turn' };

    case 'endturn':
      // Check if we should build
      const buildPositions = getAIBuildDecisions(state, player);
      if (buildPositions.length > 0) {
        return { action: 'build_house', data: buildPositions[0] };
      }
      return { action: 'end_turn' };

    default:
      return { action: 'end_turn' };
  }
}

// Offer cash to the single player who owns the tiles missing from a colour set we mostly hold.
// Without AI-started trades, bot-only games stall with every set split between players.
export function getAITradeOffer(state: GameState, player: Player): Omit<TradeOffer, 'active'> | null {
  const mine = new Set(getPlayerProperties(state, player.id).map(p => p.position));
  let best: { missing: number[]; ownerId: string; price: number } | null = null;

  for (const tile of BOARD_TILES) {
    const group = tile.property?.colorGroup;
    if (!group || !mine.has(tile.position) || group.length < 2) continue;

    const missing = group.filter(pos => !mine.has(pos));
    if (missing.length === 0 || missing.length * 2 > group.length) continue; // need to hold at least half

    const owned = missing.map(pos => getPropertyOwner(state, pos));
    const ownerId = owned[0]?.ownerId;
    const tradable = owned.every(o => o && o.ownerId === ownerId && !o.isMortgaged && o.houses === 0);
    if (!tradable || ownerId === player.id) continue;

    const price = Math.round(missing.reduce((sum, pos) => sum + (getPropertyData(pos)?.price ?? 0), 0) * 1.6);
    if (price > player.money - 100) continue;
    if (!best || missing.length < best.missing.length) best = { missing, ownerId: ownerId!, price };
  }

  return best && {
    fromPlayer: player.id,
    toPlayer: best.ownerId,
    offeredProperties: [],
    offeredMoney: best.price,
    offeredCards: 0,
    requestedProperties: best.missing,
    requestedMoney: 0,
    requestedCards: 0,
  };
}
