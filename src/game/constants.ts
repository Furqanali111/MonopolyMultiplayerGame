// Complete Monopoly board data with official values

export const PLAYER_COLORS = ['#F0605D', '#4D9BFF', '#3DD68C', '#F5B544', '#A27BFF', '#3CCFCF'] as const;
export const PLAYER_NAMES = ['You', 'Alex', 'Jordan', 'Sam'] as const;

export const TOTAL_HOUSES = 32;
export const TOTAL_HOTELS = 12;
export const GO_SALARY = 200;
export const JAIL_POSITION = 10;
export const GO_TO_JAIL_POSITION = 30;
export const JAIL_FINE = 50;
export const MAX_JAIL_TURNS = 3;
export const INCOME_TAX_AMOUNT = 200;
export const LUXURY_TAX_AMOUNT = 100;

export type PropertyColor = 'brown' | 'lightblue' | 'pink' | 'orange' | 'red' | 'yellow' | 'green' | 'blue' | 'railroad' | 'utility';

export interface Property {
  position: number;
  name: string;
  type: 'property' | 'railroad' | 'utility';
  color?: PropertyColor;
  price: number;
  mortgageValue: number;
  houseCost?: number;
  rent: number[];
  colorGroup?: number[];
}

export interface TileData {
  position: number;
  name: string;
  type: 'go' | 'property' | 'community' | 'tax' | 'railroad' | 'chance' | 'jail' | 'utility' | 'free' | 'gotojail' | 'luxury';
  property?: Property;
}

// All 40 board tiles
export const BOARD_TILES: TileData[] = [
  { position: 0, name: 'GO', type: 'go' },
  { 
    position: 1, name: 'Mediterranean Avenue', type: 'property',
    property: { position: 1, name: 'Mediterranean Avenue', type: 'property', color: 'brown', price: 60, mortgageValue: 30, houseCost: 50, rent: [2, 10, 30, 90, 160, 250], colorGroup: [1, 3] }
  },
  { position: 2, name: 'Community Chest', type: 'community' },
  { 
    position: 3, name: 'Baltic Avenue', type: 'property',
    property: { position: 3, name: 'Baltic Avenue', type: 'property', color: 'brown', price: 60, mortgageValue: 30, houseCost: 50, rent: [4, 20, 60, 180, 320, 450], colorGroup: [1, 3] }
  },
  { position: 4, name: 'Income Tax', type: 'tax' },
  { 
    position: 5, name: 'Reading Railroad', type: 'railroad',
    property: { position: 5, name: 'Reading Railroad', type: 'railroad', color: 'railroad', price: 200, mortgageValue: 100, rent: [25, 50, 100, 200], colorGroup: [5, 15, 25, 35] }
  },
  { 
    position: 6, name: 'Oriental Avenue', type: 'property',
    property: { position: 6, name: 'Oriental Avenue', type: 'property', color: 'lightblue', price: 100, mortgageValue: 50, houseCost: 50, rent: [6, 30, 90, 270, 400, 550], colorGroup: [6, 8, 9] }
  },
  { position: 7, name: 'Chance', type: 'chance' },
  { 
    position: 8, name: 'Vermont Avenue', type: 'property',
    property: { position: 8, name: 'Vermont Avenue', type: 'property', color: 'lightblue', price: 100, mortgageValue: 50, houseCost: 50, rent: [6, 30, 90, 270, 400, 550], colorGroup: [6, 8, 9] }
  },
  { 
    position: 9, name: 'Connecticut Avenue', type: 'property',
    property: { position: 9, name: 'Connecticut Avenue', type: 'property', color: 'lightblue', price: 120, mortgageValue: 60, houseCost: 50, rent: [8, 40, 100, 300, 450, 600], colorGroup: [6, 8, 9] }
  },
  { position: 10, name: 'Jail / Just Visiting', type: 'jail' },
  { 
    position: 11, name: 'St. Charles Place', type: 'property',
    property: { position: 11, name: 'St. Charles Place', type: 'property', color: 'pink', price: 140, mortgageValue: 70, houseCost: 100, rent: [10, 50, 150, 450, 625, 750], colorGroup: [11, 13, 14] }
  },
  { 
    position: 12, name: 'Electric Company', type: 'utility',
    property: { position: 12, name: 'Electric Company', type: 'utility', color: 'utility', price: 150, mortgageValue: 75, rent: [4, 10], colorGroup: [12, 28] }
  },
  { 
    position: 13, name: 'States Avenue', type: 'property',
    property: { position: 13, name: 'States Avenue', type: 'property', color: 'pink', price: 140, mortgageValue: 70, houseCost: 100, rent: [10, 50, 150, 450, 625, 750], colorGroup: [11, 13, 14] }
  },
  { 
    position: 14, name: 'Virginia Avenue', type: 'property',
    property: { position: 14, name: 'Virginia Avenue', type: 'property', color: 'pink', price: 160, mortgageValue: 80, houseCost: 100, rent: [12, 60, 180, 500, 700, 900], colorGroup: [11, 13, 14] }
  },
  { 
    position: 15, name: 'Pennsylvania Railroad', type: 'railroad',
    property: { position: 15, name: 'Pennsylvania Railroad', type: 'railroad', color: 'railroad', price: 200, mortgageValue: 100, rent: [25, 50, 100, 200], colorGroup: [5, 15, 25, 35] }
  },
  { 
    position: 16, name: 'St. James Place', type: 'property',
    property: { position: 16, name: 'St. James Place', type: 'property', color: 'orange', price: 180, mortgageValue: 90, houseCost: 100, rent: [14, 70, 200, 550, 750, 950], colorGroup: [16, 18, 19] }
  },
  { position: 17, name: 'Community Chest', type: 'community' },
  { 
    position: 18, name: 'Tennessee Avenue', type: 'property',
    property: { position: 18, name: 'Tennessee Avenue', type: 'property', color: 'orange', price: 180, mortgageValue: 90, houseCost: 100, rent: [14, 70, 200, 550, 750, 950], colorGroup: [16, 18, 19] }
  },
  { 
    position: 19, name: 'New York Avenue', type: 'property',
    property: { position: 19, name: 'New York Avenue', type: 'property', color: 'orange', price: 200, mortgageValue: 100, houseCost: 100, rent: [16, 80, 220, 600, 800, 1000], colorGroup: [16, 18, 19] }
  },
  { position: 20, name: 'Free Parking', type: 'free' },
  { 
    position: 21, name: 'Kentucky Avenue', type: 'property',
    property: { position: 21, name: 'Kentucky Avenue', type: 'property', color: 'red', price: 220, mortgageValue: 110, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050], colorGroup: [21, 23, 24] }
  },
  { position: 22, name: 'Chance', type: 'chance' },
  { 
    position: 23, name: 'Indiana Avenue', type: 'property',
    property: { position: 23, name: 'Indiana Avenue', type: 'property', color: 'red', price: 220, mortgageValue: 110, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050], colorGroup: [21, 23, 24] }
  },
  { 
    position: 24, name: 'Illinois Avenue', type: 'property',
    property: { position: 24, name: 'Illinois Avenue', type: 'property', color: 'red', price: 240, mortgageValue: 120, houseCost: 150, rent: [20, 100, 300, 750, 925, 1100], colorGroup: [21, 23, 24] }
  },
  { 
    position: 25, name: 'B. & O. Railroad', type: 'railroad',
    property: { position: 25, name: 'B. & O. Railroad', type: 'railroad', color: 'railroad', price: 200, mortgageValue: 100, rent: [25, 50, 100, 200], colorGroup: [5, 15, 25, 35] }
  },
  { 
    position: 26, name: 'Atlantic Avenue', type: 'property',
    property: { position: 26, name: 'Atlantic Avenue', type: 'property', color: 'yellow', price: 260, mortgageValue: 130, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150], colorGroup: [26, 27, 29] }
  },
  { 
    position: 27, name: 'Ventnor Avenue', type: 'property',
    property: { position: 27, name: 'Ventnor Avenue', type: 'property', color: 'yellow', price: 260, mortgageValue: 130, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150], colorGroup: [26, 27, 29] }
  },
  { 
    position: 28, name: 'Water Works', type: 'utility',
    property: { position: 28, name: 'Water Works', type: 'utility', color: 'utility', price: 150, mortgageValue: 75, rent: [4, 10], colorGroup: [12, 28] }
  },
  { 
    position: 29, name: 'Marvin Gardens', type: 'property',
    property: { position: 29, name: 'Marvin Gardens', type: 'property', color: 'yellow', price: 280, mortgageValue: 140, houseCost: 150, rent: [24, 120, 360, 850, 1025, 1200], colorGroup: [26, 27, 29] }
  },
  { position: 30, name: 'Go To Jail', type: 'gotojail' },
  { 
    position: 31, name: 'Pacific Avenue', type: 'property',
    property: { position: 31, name: 'Pacific Avenue', type: 'property', color: 'green', price: 300, mortgageValue: 150, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275], colorGroup: [31, 32, 34] }
  },
  { 
    position: 32, name: 'North Carolina Avenue', type: 'property',
    property: { position: 32, name: 'North Carolina Avenue', type: 'property', color: 'green', price: 300, mortgageValue: 150, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275], colorGroup: [31, 32, 34] }
  },
  { position: 33, name: 'Community Chest', type: 'community' },
  { 
    position: 34, name: 'Pennsylvania Avenue', type: 'property',
    property: { position: 34, name: 'Pennsylvania Avenue', type: 'property', color: 'green', price: 320, mortgageValue: 160, houseCost: 200, rent: [28, 150, 450, 1000, 1200, 1400], colorGroup: [31, 32, 34] }
  },
  { 
    position: 35, name: 'Short Line', type: 'railroad',
    property: { position: 35, name: 'Short Line', type: 'railroad', color: 'railroad', price: 200, mortgageValue: 100, rent: [25, 50, 100, 200], colorGroup: [5, 15, 25, 35] }
  },
  { position: 36, name: 'Chance', type: 'chance' },
  { 
    position: 37, name: 'Park Place', type: 'property',
    property: { position: 37, name: 'Park Place', type: 'property', color: 'blue', price: 350, mortgageValue: 175, houseCost: 200, rent: [35, 175, 500, 1100, 1300, 1500], colorGroup: [37, 39] }
  },
  { position: 38, name: 'Luxury Tax', type: 'luxury' },
  { 
    position: 39, name: 'Boardwalk', type: 'property',
    property: { position: 39, name: 'Boardwalk', type: 'property', color: 'blue', price: 400, mortgageValue: 200, houseCost: 200, rent: [50, 200, 600, 1400, 1700, 2000], colorGroup: [37, 39] }
  },
];

export interface CardData {
  id: number;
  type: 'chance' | 'community';
  text: string;
  action: 'pay' | 'collect' | 'move' | 'jail' | 'goojf' | 'repairs' | 'payall' | 'collectall' | 'movenearest' | 'goback';
  amount?: number;
  position?: number;
  nearestType?: 'railroad' | 'utility';
}

export const CHANCE_CARDS: CardData[] = [
  { id: 1, type: 'chance', text: 'Advance to GO. Collect $200.', action: 'move', position: 0 },
  { id: 2, type: 'chance', text: 'Advance to Illinois Avenue. If you pass GO, collect $200.', action: 'move', position: 24 },
  { id: 3, type: 'chance', text: 'Advance to St. Charles Place. If you pass GO, collect $200.', action: 'move', position: 11 },
  { id: 4, type: 'chance', text: 'Advance to nearest Utility. If unowned, you may buy it. If owned, pay 10 times dice roll.', action: 'movenearest', nearestType: 'utility' },
  { id: 5, type: 'chance', text: 'Advance to nearest Railroad. If unowned, you may buy it. If owned, pay twice the rental.', action: 'movenearest', nearestType: 'railroad' },
  { id: 6, type: 'chance', text: 'Bank pays you dividend of $50.', action: 'collect', amount: 50 },
  { id: 7, type: 'chance', text: 'Get Out of Jail Free.', action: 'goojf' },
  { id: 8, type: 'chance', text: 'Go Back 3 Spaces.', action: 'goback', amount: 3 },
  { id: 9, type: 'chance', text: 'Go to Jail. Do not pass GO, do not collect $200.', action: 'jail' },
  { id: 10, type: 'chance', text: 'Make general repairs: Pay $25 per house, $100 per hotel.', action: 'repairs', amount: 25 },
  { id: 11, type: 'chance', text: 'Speeding fine $15.', action: 'pay', amount: 15 },
  { id: 12, type: 'chance', text: 'Take a trip to Reading Railroad. If you pass GO, collect $200.', action: 'move', position: 5 },
  { id: 13, type: 'chance', text: 'Advance to Boardwalk.', action: 'move', position: 39 },
  { id: 14, type: 'chance', text: 'You have been elected Chairman of the Board. Pay each player $50.', action: 'payall', amount: 50 },
  { id: 15, type: 'chance', text: 'Your building loan matures. Collect $150.', action: 'collect', amount: 150 },
  { id: 16, type: 'chance', text: 'Advance to nearest Railroad. If unowned, you may buy it. If owned, pay twice the rental.', action: 'movenearest', nearestType: 'railroad' },
];

export const COMMUNITY_CHEST_CARDS: CardData[] = [
  { id: 1, type: 'community', text: 'Advance to GO. Collect $200.', action: 'move', position: 0 },
  { id: 2, type: 'community', text: 'Bank error in your favor. Collect $200.', action: 'collect', amount: 200 },
  { id: 3, type: 'community', text: 'Doctor\'s fees. Pay $50.', action: 'pay', amount: 50 },
  { id: 4, type: 'community', text: 'From sale of stock you get $50.', action: 'collect', amount: 50 },
  { id: 5, type: 'community', text: 'Get Out of Jail Free.', action: 'goojf' },
  { id: 6, type: 'community', text: 'Go to Jail. Do not pass GO, do not collect $200.', action: 'jail' },
  { id: 7, type: 'community', text: 'Holiday fund matures. Collect $100.', action: 'collect', amount: 100 },
  { id: 8, type: 'community', text: 'Income tax refund. Collect $20.', action: 'collect', amount: 20 },
  { id: 9, type: 'community', text: 'It\'s your birthday. Collect $10 from every player.', action: 'collectall', amount: 10 },
  { id: 10, type: 'community', text: 'Life insurance matures. Collect $100.', action: 'collect', amount: 100 },
  { id: 11, type: 'community', text: 'Hospital fees. Pay $100.', action: 'pay', amount: 100 },
  { id: 12, type: 'community', text: 'School fees. Pay $50.', action: 'pay', amount: 50 },
  { id: 13, type: 'community', text: 'Receive $25 consultancy fee.', action: 'collect', amount: 25 },
  { id: 14, type: 'community', text: 'You are assessed for street repairs: Pay $40 per house, $115 per hotel.', action: 'repairs', amount: 40 },
  { id: 15, type: 'community', text: 'You have won second prize in a beauty contest. Collect $10.', action: 'collect', amount: 10 },
  { id: 16, type: 'community', text: 'You inherit $100.', action: 'collect', amount: 100 },
];
