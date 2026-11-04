import {
  BOARD_TILES,
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
  GO_SALARY,
  JAIL_POSITION,
  GO_TO_JAIL_POSITION,
  JAIL_FINE,
  MAX_JAIL_TURNS,
  INCOME_TAX_AMOUNT,
  LUXURY_TAX_AMOUNT,
  TOTAL_HOUSES,
  TOTAL_HOTELS,
  PLAYER_COLORS,
  PLAYER_NAMES,
  Property,
  CardData
} from './constants'

export { BOARD_TILES };
import { GameState, Player, OwnedProperty, AuctionState, TradeOffer, AIDifficulty } from './types';

// Shuffle array using Fisher-Yates
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function initializeGame(aiCount: number, aiDifficulty: AIDifficulty): GameState {
  const players: Player[] = [];

  // Human player
  players.push({
    id: 0,
    name: PLAYER_NAMES[0],
    color: PLAYER_COLORS[0],
    money: 1500,
    position: 0,
    isAI: false,
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    isBankrupt: false,
    doublesCount: 0,
  });

  // AI players
  for (let i = 0; i < aiCount; i++) {
    players.push({
      id: i + 1,
      name: PLAYER_NAMES[i + 1],
      color: PLAYER_COLORS[i + 1],
      money: 1500,
      position: 0,
      isAI: true,
      difficulty: aiDifficulty,
      inJail: false,
      jailTurns: 0,
      getOutOfJailCards: 0,
      isBankrupt: false,
      doublesCount: 0,
    });
  }

  return {
    phase: 'playing',
    players,
    currentPlayerIndex: 0,
    ownedProperties: [],
    availableHouses: TOTAL_HOUSES,
    availableHotels: TOTAL_HOTELS,
    chanceDeck: shuffle([...CHANCE_CARDS]),
    communityChestDeck: shuffle([...COMMUNITY_CHEST_CARDS]),
    lastDiceRoll: null,
    turnPhase: 'roll',
    currentCard: null,
    auction: null,
    trade: null,
    bankruptcyState: null,
    winner: null,
    gameLog: ['Game started! Roll the dice to begin.'],
    diceMultiplierForRent: 0,
    specialRentMultiplier: null,
  };
}

export function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];
}

export function isDoubles(dice: [number, number]): boolean {
  return dice[0] === dice[1];
}

export function movePlayer(state: GameState, playerId: number, spaces: number): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  const oldPosition = player.position;
  let newPosition = (oldPosition + spaces) % 40;

  // Handle negative movement (go back)
  if (newPosition < 0) newPosition += 40;

  // Check if passed GO or landed exactly on GO
  const passedGo = spaces > 0 && newPosition < oldPosition && newPosition !== 0;
  const landedOnGo = newPosition === 0 && oldPosition !== 0;

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = {
    ...player,
    previousPosition: oldPosition, // Track for animation
    position: newPosition,
    money: (passedGo || landedOnGo) ? player.money + GO_SALARY : player.money,
  };

  const newLog = [...state.gameLog];
  if (passedGo) {
    newLog.push(`${player.name} passed GO and collected $${GO_SALARY}!`);
  } else if (landedOnGo) {
    newLog.push(`${player.name} landed on GO and collected $${GO_SALARY}!`);
  }
  newLog.push(`${player.name} moved to ${BOARD_TILES[newPosition].name}`);

  return { ...state, players: updatedPlayers, gameLog: newLog };
}

export function moveToPosition(state: GameState, playerId: number, position: number, collectGo: boolean = true): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];

  // Check if passed GO (position wraps around or goes backwards past GO)
  const passedGo = collectGo && position < player.position && position !== 0;
  const landedOnGo = collectGo && position === 0 && player.position !== 0;

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = {
    ...player,
    previousPosition: player.position, // Track for animation
    position,
    money: (passedGo || landedOnGo) ? player.money + GO_SALARY : player.money,
  };

  const newLog = [...state.gameLog];
  if (passedGo) {
    newLog.push(`${player.name} passed GO and collected $${GO_SALARY}!`);
  } else if (landedOnGo) {
    newLog.push(`${player.name} landed on GO and collected $${GO_SALARY}!`);
  }
  newLog.push(`${player.name} moved to ${BOARD_TILES[position].name}`);

  return { ...state, players: updatedPlayers, gameLog: newLog };
}

export function sendToJail(state: GameState, playerId: number): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = {
    ...player,
    previousPosition: player.position, // Track for animation
    position: JAIL_POSITION,
    inJail: true,
    jailTurns: 0,
    doublesCount: 0,
  };

  return {
    ...state,
    players: updatedPlayers,
    gameLog: [...state.gameLog, `${player.name} was sent to Jail!`],
    turnPhase: 'endturn',
  };
}

export function getPropertyOwner(state: GameState, position: number): OwnedProperty | undefined {
  return state.ownedProperties.find(p => p.position === position);
}

export function getPropertyData(position: number): Property | undefined {
  const tile = BOARD_TILES[position];
  return tile?.property;
}

export function hasMonopoly(state: GameState, playerId: number, position: number): boolean {
  const property = getPropertyData(position);
  if (!property || !property.colorGroup) return false;

  // Player has monopoly if they own all properties in the color group
  // Note: Properties can be mortgaged and still count towards monopoly
  // (you just can't build while they're mortgaged)
  return property.colorGroup.every(pos => {
    const owned = state.ownedProperties.find(p => p.position === pos);
    return owned && owned.ownerId === playerId;
  });
}

export function calculateRent(state: GameState, position: number, diceRoll?: [number, number]): number {
  const owned = getPropertyOwner(state, position);
  const property = getPropertyData(position);

  if (!owned || !property || owned.isMortgaged) return 0;

  const owner = state.players.find(p => p.id === owned.ownerId);
  if (!owner || owner.isBankrupt) return 0;

  if (property.type === 'railroad') {
    const ownedRailroads = state.ownedProperties.filter(
      p => getPropertyData(p.position)?.type === 'railroad' &&
        p.ownerId === owned.ownerId &&
        !p.isMortgaged
    ).length;
    let rent = property.rent[ownedRailroads - 1] || 0;

    // Apply special multiplier from Chance card "Advance to nearest Railroad"
    if (state.specialRentMultiplier?.type === 'railroad') {
      rent *= state.specialRentMultiplier.multiplier;
    }

    return rent;
  }

  if (property.type === 'utility') {
    const ownedUtilities = state.ownedProperties.filter(
      p => getPropertyData(p.position)?.type === 'utility' &&
        p.ownerId === owned.ownerId &&
        !p.isMortgaged
    ).length;

    // Check for special multiplier from Chance card "Advance to nearest Utility"
    if (state.specialRentMultiplier?.type === 'utility') {
      const diceSum = diceRoll ? diceRoll[0] + diceRoll[1] : state.diceMultiplierForRent;
      return state.specialRentMultiplier.multiplier * diceSum;
    }

    const multiplier = ownedUtilities === 2 ? 10 : 4;
    const diceSum = diceRoll ? diceRoll[0] + diceRoll[1] : state.diceMultiplierForRent;
    return multiplier * diceSum;
  }

  // Regular property
  if (owned.houses === 0) {
    const rent = property.rent[0];
    // Double rent for monopoly with no houses
    return hasMonopoly(state, owned.ownerId, position) ? rent * 2 : rent;
  }

  return property.rent[owned.houses] || 0;
}

export function canBuyProperty(state: GameState, playerId: number, position: number): boolean {
  const player = state.players.find(p => p.id === playerId);
  const property = getPropertyData(position);
  const owned = getPropertyOwner(state, position);

  if (!player || !property || owned) return false;
  return player.money >= property.price;
}

export function buyProperty(state: GameState, playerId: number, position: number): GameState {
  const player = state.players.find(p => p.id === playerId);
  const property = getPropertyData(position);

  if (!player || !property) return state;

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = {
    ...player,
    money: player.money - property.price,
  };

  return {
    ...state,
    players: updatedPlayers,
    ownedProperties: [...state.ownedProperties, {
      position,
      ownerId: playerId,
      houses: 0,
      isMortgaged: false,
    }],
    gameLog: [...state.gameLog, `${player.name} bought ${property.name} for $${property.price}`],
  };
}

export function startAuction(state: GameState, position: number): GameState {
  const activePlayers = state.players.filter(p => !p.isBankrupt).map(p => p.id);

  return {
    ...state,
    phase: 'auction',
    // Store the original player index to return to after auction
    preAuctionPlayerIndex: state.currentPlayerIndex,
    auction: {
      active: true,
      propertyPosition: position,
      currentBid: 0,
      currentBidder: null,
      participants: activePlayers,
      passedPlayers: [],
    },
    gameLog: [...state.gameLog, `Auction started for ${BOARD_TILES[position].name}!`],
  };
}

export function placeBid(state: GameState, playerId: number, amount: number): GameState {
  if (!state.auction) return state;

  const player = state.players.find(p => p.id === playerId);
  if (!player || amount > player.money || amount <= state.auction.currentBid) return state;

  return {
    ...state,
    auction: {
      ...state.auction,
      currentBid: amount,
      currentBidder: playerId,
    },
    gameLog: [...state.gameLog, `${player.name} bid $${amount}`],
  };
}

export function passAuction(state: GameState, playerId: number): GameState {
  if (!state.auction) return state;

  const player = state.players.find(p => p.id === playerId);
  const updatedPassedPlayers = [...state.auction.passedPlayers, playerId];
  const stillActive = state.auction.participants.filter(
    id => !updatedPassedPlayers.includes(id)
  );

  // If no active bidders remain and no one bid
  if (stillActive.length === 0 && state.auction.currentBidder === null) {
    const restoredPlayerIndex = state.preAuctionPlayerIndex ?? state.currentPlayerIndex;

    return {
      ...state,
      phase: 'playing',
      currentPlayerIndex: restoredPlayerIndex,
      turnPhase: 'endturn',
      auction: null,
      preAuctionPlayerIndex: undefined,
      gameLog: [
        ...state.gameLog,
        `${player?.name} passed on the auction`,
        'Auction ended with no bids. Property remains unowned.',
      ],
    };
  }

  // If only one bidder remains and someone has bid, finalize immediately
  if (stillActive.length === 1 && state.auction.currentBidder !== null) {
    const newState = {
      ...state,
      auction: {
        ...state.auction,
        passedPlayers: updatedPassedPlayers,
      },
      gameLog: [...state.gameLog, `${player?.name} passed on the auction`],
    };

    // Finalize the auction immediately
    return finalizeAuction(newState);
  }

  // Continue auction - rotate participants
  const newParticipants = [...stillActive];

  return {
    ...state,
    auction: {
      ...state.auction,
      passedPlayers: updatedPassedPlayers,
      participants: newParticipants,
    },
    gameLog: [...state.gameLog, `${player?.name} passed on the auction`],
  };
}

export function finalizeAuction(state: GameState): GameState {
  if (!state.auction || state.auction.currentBidder === null) {
    return state;
  }

  const { propertyPosition, currentBid, currentBidder } = state.auction;
  const property = getPropertyData(propertyPosition)!;
  const winner = state.players.find(p => p.id === currentBidder)!;

  // Deduct money from winner
  const updatedPlayers = state.players.map(p =>
    p.id === currentBidder ? { ...p, money: p.money - currentBid } : p
  );

  const newOwnedProperty: OwnedProperty = {
    position: propertyPosition,
    ownerId: currentBidder,
    houses: 0,
    isMortgaged: false,
  };

  // Restore the original player's turn
  const restoredPlayerIndex = state.preAuctionPlayerIndex ?? state.currentPlayerIndex;
  const restoredPlayer = updatedPlayers[restoredPlayerIndex];

  // If the player who gets their turn back rolled doubles, let them roll again
  const nextPhase = restoredPlayer.doublesCount > 0 ? 'roll' : 'endturn';

  const finalLog = [...state.gameLog, `${winner.name} won the auction for ${property.name} at $${currentBid}!`];

  // Add message about getting another turn if they rolled doubles
  if (nextPhase === 'roll') {
    finalLog.push(`${restoredPlayer.name} gets another turn for rolling doubles!`);
  }

  return {
    ...state,
    players: updatedPlayers,
    ownedProperties: [...state.ownedProperties, newOwnedProperty],
    phase: 'playing',
    currentPlayerIndex: restoredPlayerIndex, // Restore original player
    turnPhase: nextPhase, // Roll again if doubles, otherwise end turn
    auction: null,
    preAuctionPlayerIndex: undefined, // Clear the stored index
    gameLog: finalLog,
  };
}

export function canBuildHouse(state: GameState, playerId: number, position: number): boolean {
  const owned = getPropertyOwner(state, position);
  const property = getPropertyData(position);

  if (!owned || !property || property.type !== 'property') return false;
  if (owned.ownerId !== playerId || owned.isMortgaged) return false;
  if (!hasMonopoly(state, playerId, position)) return false;
  if (!property.houseCost) return false;

  const player = state.players.find(p => p.id === playerId);
  if (!player || player.money < property.houseCost) return false;

  // Check building limits
  if (owned.houses >= 5) return false; // Already has hotel (can't build more)

  // If has 4 houses, can only build hotel (check hotel availability)
  if (owned.houses === 4) {
    if (state.availableHotels === 0) return false;
  } else {
    // Building houses (1-4), check house availability
    if (state.availableHouses === 0) return false;
  }

  // Can't build if ANY property in the color group is mortgaged
  const colorGroup = property.colorGroup || [];
  const hasAnyMortgaged = colorGroup.some(pos => {
    const groupOwned = state.ownedProperties.find(p => p.position === pos);
    return groupOwned && groupOwned.isMortgaged;
  });
  if (hasAnyMortgaged) return false;

  // Even building rule - can't have more than 1 house difference in color group
  const groupProperties = colorGroup.map(pos => ({
    position: pos,
    owned: state.ownedProperties.find(p => p.position === pos),
  }));

  const minHouses = Math.min(...groupProperties.map(p => p.owned?.houses || 0));
  return owned.houses <= minHouses;
}

export function buildHouse(state: GameState, playerId: number, position: number): GameState {
  if (!canBuildHouse(state, playerId, position)) return state;

  const owned = getPropertyOwner(state, position)!;
  const property = getPropertyData(position)!;
  const player = state.players.find(p => p.id === playerId)!;
  const playerIndex = state.players.findIndex(p => p.id === playerId);

  const isUpgradingToHotel = owned.houses === 4;

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = {
    ...player,
    money: player.money - property.houseCost!,
  };

  const updatedProperties = state.ownedProperties.map(p =>
    p.position === position ? { ...p, houses: p.houses + 1 } : p
  );

  // When upgrading to hotel: remove 4 houses, add 1 hotel
  // When building house: remove 1 house from supply
  const buildingType = isUpgradingToHotel ? 'hotel' : 'house';
  const houseChange = isUpgradingToHotel ? 4 : -1; // +4 houses returned when building hotel
  const hotelChange = isUpgradingToHotel ? -1 : 0;

  return {
    ...state,
    players: updatedPlayers,
    ownedProperties: updatedProperties,
    availableHouses: state.availableHouses + houseChange,
    availableHotels: state.availableHotels + hotelChange,
    gameLog: [...state.gameLog, `${player.name} built a ${buildingType} on ${property.name}`],
  };
}

export function canSellHouse(state: GameState, playerId: number, position: number): boolean {
  const owned = getPropertyOwner(state, position);
  const property = getPropertyData(position);

  if (!owned || !property || property.type !== 'property') return false;
  if (owned.ownerId !== playerId) return false;
  if (owned.houses === 0) return false;

  // Even building rule for selling
  const colorGroup = property.colorGroup || [];
  const groupProperties = colorGroup.map(pos => ({
    position: pos,
    owned: state.ownedProperties.find(p => p.position === pos),
  }));

  const maxHouses = Math.max(...groupProperties.map(p => p.owned?.houses || 0));
  return owned.houses >= maxHouses;
}

export function sellHouse(state: GameState, playerId: number, position: number): GameState {
  if (!canSellHouse(state, playerId, position)) return state;

  const owned = getPropertyOwner(state, position)!;
  const property = getPropertyData(position)!;
  const player = state.players.find(p => p.id === playerId)!;
  const playerIndex = state.players.findIndex(p => p.id === playerId);

  const isHotel = owned.houses === 5;
  const sellValue = Math.floor(property.houseCost! / 2);

  // When selling hotel, need 4 houses available
  if (isHotel && state.availableHouses < 4) {
    return state; // Can't sell hotel without houses to replace
  }

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = {
    ...player,
    money: player.money + sellValue,
  };

  const updatedProperties = state.ownedProperties.map(p =>
    p.position === position ? { ...p, houses: p.houses - 1 } : p
  );

  return {
    ...state,
    players: updatedPlayers,
    ownedProperties: updatedProperties,
    availableHouses: isHotel ? state.availableHouses - 4 : state.availableHouses + 1,
    availableHotels: isHotel ? state.availableHotels + 1 : state.availableHotels,
    gameLog: [...state.gameLog, `${player.name} sold a ${isHotel ? 'hotel' : 'house'} on ${property.name} for $${sellValue}`],
  };
}

export function canMortgage(state: GameState, playerId: number, position: number): boolean {
  const owned = getPropertyOwner(state, position);
  const property = getPropertyData(position);

  if (!owned || !property) return false;
  if (owned.ownerId !== playerId || owned.isMortgaged) return false;

  // Can't mortgage if there are buildings on any property in the color group
  if (property.colorGroup) {
    const hasBuildings = property.colorGroup.some(pos => {
      const groupOwned = state.ownedProperties.find(p => p.position === pos);
      return groupOwned && groupOwned.houses > 0;
    });
    if (hasBuildings) return false;
  }

  return true;
}

export function mortgageProperty(state: GameState, playerId: number, position: number): GameState {
  if (!canMortgage(state, playerId, position)) return state;

  const property = getPropertyData(position)!;
  const player = state.players.find(p => p.id === playerId)!;
  const playerIndex = state.players.findIndex(p => p.id === playerId);

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = {
    ...player,
    money: player.money + property.mortgageValue,
  };

  const updatedProperties = state.ownedProperties.map(p =>
    p.position === position ? { ...p, isMortgaged: true } : p
  );

  return {
    ...state,
    players: updatedPlayers,
    ownedProperties: updatedProperties,
    gameLog: [...state.gameLog, `${player.name} mortgaged ${property.name} for $${property.mortgageValue}`],
  };
}

export function canUnmortgage(state: GameState, playerId: number, position: number): boolean {
  const owned = getPropertyOwner(state, position);
  const property = getPropertyData(position);

  if (!owned || !property) return false;
  if (owned.ownerId !== playerId || !owned.isMortgaged) return false;

  const player = state.players.find(p => p.id === playerId);
  const unmortgageCost = Math.floor(property.mortgageValue * 1.1);

  return player ? player.money >= unmortgageCost : false;
}

export function unmortgageProperty(state: GameState, playerId: number, position: number): GameState {
  if (!canUnmortgage(state, playerId, position)) return state;

  const property = getPropertyData(position)!;
  const player = state.players.find(p => p.id === playerId)!;
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  const unmortgageCost = Math.floor(property.mortgageValue * 1.1);

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = {
    ...player,
    money: player.money - unmortgageCost,
  };

  const updatedProperties = state.ownedProperties.map(p =>
    p.position === position ? { ...p, isMortgaged: false } : p
  );

  return {
    ...state,
    players: updatedPlayers,
    ownedProperties: updatedProperties,
    gameLog: [...state.gameLog, `${player.name} unmortgaged ${property.name} for $${unmortgageCost}`],
  };
}

export function payRent(state: GameState, payerId: number, ownerId: number, amount: number): GameState {
  const payerIndex = state.players.findIndex(p => p.id === payerId);
  const ownerIndex = state.players.findIndex(p => p.id === ownerId);

  if (payerIndex === -1 || ownerIndex === -1) return state;

  const payer = state.players[payerIndex];
  const owner = state.players[ownerIndex];

  // Check if player can afford the rent
  if (payer.money < amount) {
    // Player needs to raise cash - enter bankruptcy phase
    return enterBankruptcyPhase(state, payerId, amount, ownerId, `rent to ${owner.name}`);
  }

  const updatedPlayers = [...state.players];
  updatedPlayers[payerIndex] = { ...payer, money: payer.money - amount };
  updatedPlayers[ownerIndex] = { ...owner, money: owner.money + amount };

  return {
    ...state,
    players: updatedPlayers,
    gameLog: [...state.gameLog, `${payer.name} paid $${amount} rent to ${owner.name}`],
  };
}

export function payBank(state: GameState, playerId: number, amount: number, reason: string): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];

  // Check if player can afford the payment
  if (player.money < amount) {
    // Player needs to raise cash - enter bankruptcy phase
    return enterBankruptcyPhase(state, playerId, amount, null, reason);
  }

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = { ...player, money: player.money - amount };

  return {
    ...state,
    players: updatedPlayers,
    gameLog: [...state.gameLog, `${player.name} paid $${amount} (${reason})`],
  };
}

export function collectFromBank(state: GameState, playerId: number, amount: number, reason: string): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = { ...player, money: player.money + amount };

  return {
    ...state,
    players: updatedPlayers,
    gameLog: [...state.gameLog, `${player.name} collected $${amount} (${reason})`],
  };
}

export function drawCard(state: GameState, type: 'chance' | 'community'): GameState {
  const deck = type === 'chance' ? state.chanceDeck : state.communityChestDeck;
  if (deck.length === 0) return state;

  const [drawnCard, ...remainingDeck] = deck;
  const player = state.players[state.currentPlayerIndex];

  // If it's a Get Out of Jail Free card, give it to player
  if (drawnCard.action === 'goojf') {
    const updatedPlayers = [...state.players];
    updatedPlayers[state.currentPlayerIndex] = {
      ...player,
      getOutOfJailCards: player.getOutOfJailCards + 1,
    };

    return {
      ...state,
      players: updatedPlayers,
      [type === 'chance' ? 'chanceDeck' : 'communityChestDeck']: remainingDeck,
      currentCard: drawnCard,
      gameLog: [...state.gameLog, `${player.name} drew: "${drawnCard.text}"`],
    };
  }

  // Return card to bottom of deck for other cards
  return {
    ...state,
    [type === 'chance' ? 'chanceDeck' : 'communityChestDeck']: [...remainingDeck, drawnCard],
    currentCard: drawnCard,
    gameLog: [...state.gameLog, `${player.name} drew: "${drawnCard.text}"`],
  };
}

export function executeCard(state: GameState): GameState {
  const card = state.currentCard;
  if (!card) return state;

  const player = state.players[state.currentPlayerIndex];
  let newState = { ...state, currentCard: null };

  switch (card.action) {
    case 'pay':
      newState = payBank(newState, player.id, card.amount!, 'Card payment');
      break;

    case 'collect':
      newState = collectFromBank(newState, player.id, card.amount!, 'Card bonus');
      break;

    case 'move':
      newState = moveToPosition(newState, player.id, card.position!, true);
      // Resolve the tile the player landed on (for property purchase/rent)
      newState = resolveTile(newState, player.id);
      break;

    case 'jail':
      newState = sendToJail(newState, player.id);
      break;

    case 'goback':
      newState = movePlayer(newState, player.id, -(card.amount || 0));
      // Resolve the tile the player landed on (for property purchase/rent)
      newState = resolveTile(newState, player.id);
      break;

    case 'repairs': {
      const playerProperties = state.ownedProperties.filter(p => p.ownerId === player.id);
      let totalCost = 0;
      playerProperties.forEach(p => {
        if (p.houses === 5) {
          totalCost += card.type === 'chance' ? 100 : 115; // Hotel cost
        } else {
          totalCost += p.houses * (card.amount || 0);
        }
      });
      if (totalCost > 0) {
        newState = payBank(newState, player.id, totalCost, 'Repairs');
      }
      break;
    }

    case 'payall': {
      const otherPlayers = state.players.filter(p => p.id !== player.id && !p.isBankrupt);
      const totalPay = otherPlayers.length * (card.amount || 0);
      newState = payBank(newState, player.id, totalPay, 'Pay all players');
      otherPlayers.forEach(p => {
        newState = collectFromBank(newState, p.id, card.amount || 0, 'From another player');
      });
      break;
    }

    case 'collectall': {
      const otherPlayers = state.players.filter(p => p.id !== player.id && !p.isBankrupt);
      otherPlayers.forEach(p => {
        newState = payBank(newState, p.id, card.amount || 0, 'Pay to another player');
      });
      newState = collectFromBank(newState, player.id, otherPlayers.length * (card.amount || 0), 'Collect from all');
      break;
    }

    case 'movenearest': {
      const currentPos = player.position;
      let targetPos: number;

      if (card.nearestType === 'railroad') {
        const railroads = [5, 15, 25, 35];
        targetPos = railroads.find(r => r > currentPos) || railroads[0];
        // Set special rent multiplier for railroad (2x normal rent)
        newState.specialRentMultiplier = { type: 'railroad', multiplier: 2 };
      } else {
        const utilities = [12, 28];
        targetPos = utilities.find(u => u > currentPos) || utilities[0];
        // Set special rent multiplier for utility (10x dice roll)
        const diceSum = (state.lastDiceRoll?.[0] || 0) + (state.lastDiceRoll?.[1] || 0);
        newState.diceMultiplierForRent = diceSum;
        newState.specialRentMultiplier = { type: 'utility', multiplier: 10 };
      }

      newState = moveToPosition(newState, player.id, targetPos, true);
      // Resolve the tile the player landed on (for property purchase/rent)
      newState = resolveTile(newState, player.id);
      break;
    }

    case 'goojf':
      // Already handled in drawCard
      break;
  }

  return newState;
}

export function releaseFromJail(state: GameState, playerId: number, method: 'fine' | 'card' | 'doubles'): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  const updatedPlayers = [...state.players];

  let logMessage = '';
  let newState = { ...state, players: updatedPlayers };

  if (method === 'fine') {
    updatedPlayers[playerIndex] = {
      ...player,
      money: player.money - JAIL_FINE,
      inJail: false,
      jailTurns: 0,
    };
    logMessage = `${player.name} paid $${JAIL_FINE} to get out of jail`;
  } else if (method === 'card') {
    updatedPlayers[playerIndex] = {
      ...player,
      getOutOfJailCards: player.getOutOfJailCards - 1,
      inJail: false,
      jailTurns: 0,
    };

    // Return Get Out of Jail Free card to bottom of appropriate deck
    // Try Chance deck first, then Community Chest
    const chanceGoojf = CHANCE_CARDS.find(c => c.action === 'goojf');
    if (chanceGoojf && !state.chanceDeck.find(c => c.action === 'goojf')) {
      newState.chanceDeck = [...state.chanceDeck, chanceGoojf];
    } else {
      const communityGoojf = COMMUNITY_CHEST_CARDS.find(c => c.action === 'goojf');
      if (communityGoojf && !state.communityChestDeck.find(c => c.action === 'goojf')) {
        newState.communityChestDeck = [...state.communityChestDeck, communityGoojf];
      }
    }

    logMessage = `${player.name} used a Get Out of Jail Free card`;
  } else {
    updatedPlayers[playerIndex] = {
      ...player,
      inJail: false,
      jailTurns: 0,
    };
    logMessage = `${player.name} rolled doubles and is out of jail!`;
  }

  return {
    ...newState,
    gameLog: [...state.gameLog, logMessage],
  };
}

export function incrementJailTurn(state: GameState, playerId: number): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  const newJailTurns = player.jailTurns + 1;

  // If max turns reached, must pay fine
  if (newJailTurns >= MAX_JAIL_TURNS) {
    const updatedPlayers = [...state.players];
    updatedPlayers[playerIndex] = {
      ...player,
      money: player.money - JAIL_FINE,
      inJail: false,
      jailTurns: 0,
    };
    return {
      ...state,
      players: updatedPlayers,
      gameLog: [...state.gameLog, `${player.name} must pay $${JAIL_FINE} after 3 turns in jail`],
    };
  }

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = {
    ...player,
    jailTurns: newJailTurns,
  };

  return { ...state, players: updatedPlayers };
}

export function calculatePlayerNetWorth(state: GameState, playerId: number): number {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return 0;

  let netWorth = player.money;

  const playerProperties = state.ownedProperties.filter(p => p.ownerId === playerId);
  playerProperties.forEach(owned => {
    const property = getPropertyData(owned.position);
    if (!property) return;

    if (owned.isMortgaged) {
      netWorth += property.mortgageValue;
    } else {
      netWorth += property.price;
    }

    if (owned.houses > 0 && property.houseCost) {
      const houseValue = owned.houses === 5 ? property.houseCost * 4 + property.houseCost : owned.houses * property.houseCost;
      netWorth += Math.floor(houseValue / 2);
    }
  });

  return netWorth;
}

// Calculate how much liquid cash a player could raise by selling all assets
export function calculateLiquidAssets(state: GameState, playerId: number): number {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return 0;

  let liquidCash = player.money;

  const playerProperties = state.ownedProperties.filter(p => p.ownerId === playerId);
  playerProperties.forEach(owned => {
    const property = getPropertyData(owned.position);
    if (!property) return;

    // Can mortgage unmortgaged properties
    if (!owned.isMortgaged) {
      liquidCash += property.mortgageValue;
    }

    // Can sell houses/hotels for half price
    if (owned.houses > 0 && property.houseCost) {
      const houseValue = owned.houses === 5 ? property.houseCost * 4 + property.houseCost : owned.houses * property.houseCost;
      liquidCash += Math.floor(houseValue / 2);
    }
  });

  return liquidCash;
}

export function declareBankruptcy(state: GameState, playerId: number, creditorId: number | null): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];
  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = { ...player, isBankrupt: true, money: 0 };

  let newState = { ...state, players: updatedPlayers };

  // Transfer assets
  const playerProperties = state.ownedProperties.filter(p => p.ownerId === playerId);

  if (creditorId !== null) {
    // Transfer to creditor (another player)
    const creditor = state.players.find(p => p.id === creditorId);
    if (creditor) {
      const creditorIndex = state.players.findIndex(p => p.id === creditorId);

      // Transfer remaining money
      newState.players[creditorIndex] = {
        ...newState.players[creditorIndex],
        money: newState.players[creditorIndex].money + Math.max(0, player.money),
        getOutOfJailCards: newState.players[creditorIndex].getOutOfJailCards + player.getOutOfJailCards,
      };

      // Transfer properties (including mortgaged ones)
      // Note: Creditor must immediately pay 10% interest on mortgaged properties or unmortgage them
      newState.ownedProperties = state.ownedProperties.map(p => {
        if (p.ownerId === playerId) {
          return { ...p, ownerId: creditorId };
        }
        return p;
      });

      newState.gameLog = [...newState.gameLog, `${player.name}'s assets transferred to ${creditor.name}`];
    }
  } else {
    // Properties return to bank (unowned) - bankruptcy to bank
    newState.ownedProperties = state.ownedProperties.filter(p => p.ownerId !== playerId);

    // Return houses/hotels to bank
    playerProperties.forEach(p => {
      if (p.houses === 5) {
        newState.availableHotels += 1;
        newState.availableHouses += 4;
      } else {
        newState.availableHouses += p.houses;
      }
    });

    newState.gameLog = [...newState.gameLog, `${player.name}'s assets returned to the bank`];
  }

  newState.gameLog = [...newState.gameLog, `${player.name} has declared bankruptcy!`];

  return newState;
}

// Enter bankruptcy phase - gives player a chance to raise cash before declaring bankruptcy
export function enterBankruptcyPhase(
  state: GameState,
  playerId: number,
  amountOwed: number,
  creditorId: number | null,
  reason: string
): GameState {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return state;

  // Check if player has any liquid assets (properties/houses they could sell)
  const liquidAssets = calculateLiquidAssets(state, playerId);

  // If player has no way to raise cash, declare bankruptcy immediately
  if (liquidAssets < amountOwed) {
    const newState = declareBankruptcy(state, playerId, creditorId);
    return {
      ...newState,
      gameLog: [...newState.gameLog, `${player.name} has no assets to raise cash`],
    };
  }

  // For AI players, automatically sell/mortgage to try to pay
  if (player.isAI) {
    let newState = { ...state };
    let currentMoney = player.money;

    // Try to raise cash by selling houses and mortgaging properties
    const playerProperties = state.ownedProperties.filter(p => p.ownerId === playerId);

    // First, sell all houses/hotels
    for (const owned of playerProperties) {
      if (currentMoney >= amountOwed) break;

      while (owned.houses > 0 && canSellHouse(newState, playerId, owned.position)) {
        newState = sellHouse(newState, playerId, owned.position);
        const updatedPlayer = newState.players.find(p => p.id === playerId)!;
        currentMoney = updatedPlayer.money;
        if (currentMoney >= amountOwed) break;
      }
    }

    // Then, mortgage properties if still needed
    for (const owned of playerProperties) {
      if (currentMoney >= amountOwed) break;

      if (canMortgage(newState, playerId, owned.position)) {
        newState = mortgageProperty(newState, playerId, owned.position);
        const updatedPlayer = newState.players.find(p => p.id === playerId)!;
        currentMoney = updatedPlayer.money;
      }
    }

    // After auto-management, attempt payment
    return attemptPayment(newState, playerId, amountOwed, creditorId, reason);
  }

  // For human players, enter bankruptcy phase to let them manage assets
  return {
    ...state,
    phase: 'bankruptcy',
    bankruptcyState: {
      playerId,
      amountOwed,
      creditorId,
      reason,
    },
    gameLog: [...state.gameLog, `${player.name} needs to raise $${amountOwed}`],
  };
}

// Attempt to pay after managing assets in bankruptcy phase
export function attemptPayment(
  state: GameState,
  playerId: number,
  amountOwed: number,
  creditorId: number | null,
  reason: string
): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];

  // Check if player can now afford the payment
  if (player.money >= amountOwed) {
    const updatedPlayers = [...state.players];
    updatedPlayers[playerIndex] = { ...player, money: player.money - amountOwed };

    let newState: GameState = {
      ...state,
      players: updatedPlayers,
      phase: 'playing',
      bankruptcyState: null,
    };

    // Transfer money to creditor if applicable
    if (creditorId !== null) {
      const creditorIndex = newState.players.findIndex(p => p.id === creditorId);
      if (creditorIndex !== -1) {
        const creditor = newState.players[creditorIndex];
        newState.players[creditorIndex] = { ...creditor, money: creditor.money + amountOwed };
      }
    }

    return {
      ...newState,
      gameLog: [...newState.gameLog, `${player.name} paid $${amountOwed} (${reason})`],
    };
  }

  // Still can't afford - declare bankruptcy
  const newState = declareBankruptcy(state, playerId, creditorId);
  return {
    ...newState,
    phase: 'playing',
    bankruptcyState: null,
    gameLog: [...newState.gameLog, `${player.name} still cannot afford $${amountOwed}`],
  };
}

export function checkWinCondition(state: GameState): number | null {
  const activePlayers = state.players.filter(p => !p.isBankrupt);
  if (activePlayers.length === 1) {
    return activePlayers[0].id;
  }
  return null;
}

export function getNextPlayer(state: GameState): number {
  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;

  // Skip bankrupt players
  while (state.players[nextIndex].isBankrupt) {
    nextIndex = (nextIndex + 1) % state.players.length;
  }

  return nextIndex;
}

export function proposeTrade(state: GameState, offer: Omit<import('./types').TradeOffer, 'active'>): GameState {
  // Validate trade
  const fromPlayer = state.players.find(p => p.id === offer.fromPlayer);
  const toPlayer = state.players.find(p => p.id === offer.toPlayer);

  if (!fromPlayer || !toPlayer || fromPlayer.isBankrupt || toPlayer.isBankrupt) {
    return state;
  }

  // Validate offered properties belong to fromPlayer
  for (const pos of offer.offeredProperties) {
    const owned = state.ownedProperties.find(p => p.position === pos);
    if (!owned) {
      return {
        ...state,
        gameLog: [...state.gameLog, `Invalid trade: Property at position ${pos} is not owned by anyone`],
      };
    }
    if (owned.ownerId !== offer.fromPlayer) {
      return {
        ...state,
        gameLog: [...state.gameLog, `Invalid trade: You don't own the property you're trying to trade`],
      };
    }
    if (owned.isMortgaged) {
      return {
        ...state,
        gameLog: [...state.gameLog, `Invalid trade: Cannot trade mortgaged properties`],
      };
    }
    if (owned.houses > 0) {
      return {
        ...state,
        gameLog: [...state.gameLog, `Invalid trade: Cannot trade properties with buildings`],
      };
    }
  }

  // Validate requested properties belong to toPlayer
  for (const pos of offer.requestedProperties) {
    const owned = state.ownedProperties.find(p => p.position === pos);
    if (!owned) {
      return {
        ...state,
        gameLog: [...state.gameLog, `Invalid trade: Property at position ${pos} is not owned by anyone`],
      };
    }
    if (owned.ownerId !== offer.toPlayer) {
      return {
        ...state,
        gameLog: [...state.gameLog, `Invalid trade: The other player doesn't own the property you're requesting`],
      };
    }
    if (owned.isMortgaged) {
      return {
        ...state,
        gameLog: [...state.gameLog, `Invalid trade: Cannot trade mortgaged properties`],
      };
    }
    if (owned.houses > 0) {
      return {
        ...state,
        gameLog: [...state.gameLog, `Invalid trade: Cannot trade properties with buildings`],
      };
    }
  }

  // Validate money amounts
  if (offer.offeredMoney > fromPlayer.money || offer.requestedMoney > toPlayer.money) {
    return {
      ...state,
      gameLog: [...state.gameLog, 'Invalid trade: Insufficient funds'],
    };
  }

  // Validate jail cards
  if (offer.offeredCards > fromPlayer.getOutOfJailCards || offer.requestedCards > toPlayer.getOutOfJailCards) {
    return {
      ...state,
      gameLog: [...state.gameLog, 'Invalid trade: Insufficient Get Out of Jail Free cards'],
    };
  }

  return {
    ...state,
    phase: 'trade',
    trade: { ...offer, active: true },
    gameLog: [...state.gameLog, `${fromPlayer.name} proposed a trade with ${toPlayer.name}`],
  };
}

export function acceptTrade(state: GameState): GameState {
  const trade = state.trade;
  if (!trade) return state;

  const fromPlayer = state.players.find(p => p.id === trade.fromPlayer);
  const toPlayer = state.players.find(p => p.id === trade.toPlayer);

  if (!fromPlayer || !toPlayer) return state;

  // Transfer properties
  const updatedProperties = state.ownedProperties.map(p => {
    if (trade.offeredProperties.includes(p.position)) {
      return { ...p, ownerId: trade.toPlayer };
    }
    if (trade.requestedProperties.includes(p.position)) {
      return { ...p, ownerId: trade.fromPlayer };
    }
    return p;
  });

  // Update players
  const updatedPlayers = state.players.map(p => {
    if (p.id === trade.fromPlayer) {
      return {
        ...p,
        money: p.money - trade.offeredMoney + trade.requestedMoney,
        getOutOfJailCards: p.getOutOfJailCards - trade.offeredCards + trade.requestedCards,
      };
    }
    if (p.id === trade.toPlayer) {
      return {
        ...p,
        money: p.money + trade.offeredMoney - trade.requestedMoney,
        getOutOfJailCards: p.getOutOfJailCards + trade.offeredCards - trade.requestedCards,
      };
    }
    return p;
  });

  return {
    ...state,
    phase: 'playing',
    players: updatedPlayers,
    ownedProperties: updatedProperties,
    trade: null,
    gameLog: [...state.gameLog, `Trade completed between ${fromPlayer.name} and ${toPlayer.name}!`],
  };
}

export function declineTrade(state: GameState): GameState {
  if (!state.trade) return state;

  const fromPlayer = state.players.find(p => p.id === state.trade!.fromPlayer);
  const toPlayer = state.players.find(p => p.id === state.trade!.toPlayer);

  return {
    ...state,
    phase: 'playing',
    trade: null,
    gameLog: [...state.gameLog, `${toPlayer?.name} declined the trade offer from ${fromPlayer?.name}`],
  };
}

export function resolveTile(state: GameState, playerId: number): GameState {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return state;

  const tile = BOARD_TILES[player.position];
  let newState = { ...state };

  switch (tile.type) {
    case 'go':
      // Already handled by movement
      break;

    case 'property':
    case 'railroad':
    case 'utility':
      const owned = getPropertyOwner(state, player.position);
      if (owned) {
        if (owned.ownerId !== playerId && !owned.isMortgaged) {
          const rent = calculateRent(state, player.position, state.lastDiceRoll || undefined);
          if (rent > 0) {
            newState = payRent(newState, playerId, owned.ownerId, rent);
          }
        }
        // Clear special rent multiplier after use
        newState.specialRentMultiplier = null;
        newState.turnPhase = 'endturn';
      } else {
        // Unowned - player can buy or auction
        newState.turnPhase = 'action';
      }
      break;

    case 'tax':
      newState = payBank(newState, playerId, INCOME_TAX_AMOUNT, 'Income Tax');
      newState.turnPhase = 'endturn';
      break;

    case 'luxury':
      newState = payBank(newState, playerId, LUXURY_TAX_AMOUNT, 'Luxury Tax');
      newState.turnPhase = 'endturn';
      break;

    case 'chance':
      newState = drawCard(newState, 'chance');
      newState = executeCard(newState);
      // Don't override turnPhase if it was set to 'action' by resolveTile (for property purchase)
      if (newState.turnPhase !== 'action' && newState.turnPhase !== 'endturn') {
        newState.turnPhase = 'endturn';
      }
      break;

    case 'community':
      newState = drawCard(newState, 'community');
      newState = executeCard(newState);
      // Don't override turnPhase if it was set to 'action' by resolveTile (for property purchase)
      if (newState.turnPhase !== 'action' && newState.turnPhase !== 'endturn') {
        newState.turnPhase = 'endturn';
      }
      break;

    case 'jail':
      // Just visiting
      newState.turnPhase = 'endturn';
      break;

    case 'free':
      // Free parking - nothing happens (official rules)
      newState.turnPhase = 'endturn';
      break;

    case 'gotojail':
      newState = sendToJail(newState, playerId);
      break;
  }

  return newState;
}
