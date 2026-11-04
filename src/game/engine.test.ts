import { describe, it, expect } from 'vitest';
import { initializeGame, rollTurn, rollForJailTurn, leaveJail, endTurn, buyProperty, applyWinCondition } from './engine';

const newGame = () => initializeGame(2, 'easy');
const at = (s: ReturnType<typeof newGame>, position: number) => ({
  ...s,
  players: s.players.map((p, i) => (i === s.currentPlayerIndex ? { ...p, position } : p)),
});

describe('rollTurn', () => {
  it('non-doubles ends on endturn with doublesCount 0', () => {
    const s = rollTurn(at(newGame(), 0), [1, 3]); // Income Tax (4)
    expect(s.players[0].position).toBe(4);
    expect(s.turnPhase).toBe('endturn');
    expect(s.players[0].doublesCount).toBe(0);
  });

  it('doubles grants another roll', () => {
    const s = rollTurn(at(newGame(), 0), [2, 2]); // Income Tax (4)
    expect(s.turnPhase).toBe('roll');
    expect(s.players[0].doublesCount).toBe(1);
  });

  it('third double goes to jail without moving', () => {
    const g = newGame();
    g.players[0].doublesCount = 2;
    const s = rollTurn(g, [2, 2]);
    expect(s.players[0].inJail).toBe(true);
    expect(s.players[0].position).toBe(10);
    expect(s.players[0].doublesCount).toBe(0);
    expect(s.turnPhase).toBe('endturn');
  });

  it('doubles onto an unowned property waits for buy, then rolls again', () => {
    let s = rollTurn(at(newGame(), 0), [3, 3]); // Oriental Ave (6)
    expect(s.turnPhase).toBe('action');
    s = buyProperty(s, 0, 6);
    expect(s.turnPhase).toBe('roll');
  });
});

describe('jail and turn flow', () => {
  const jailed = () => {
    const g = newGame();
    g.players[0] = { ...g.players[0], inJail: true, position: 10, turnPhase: undefined } as any;
    g.turnPhase = 'injail';
    return g;
  };

  it('non-doubles stays in jail and ends turn', () => {
    const s = rollForJailTurn(jailed(), [1, 2]);
    expect(s.players[0].inJail).toBe(true);
    expect(s.players[0].jailTurns).toBe(1);
    expect(s.turnPhase).toBe('endturn');
  });

  it('doubles frees and moves', () => {
    const s = rollForJailTurn(jailed(), [2, 2]);
    expect(s.players[0].inJail).toBe(false);
    expect(s.players[0].position).toBe(14);
  });

  it('paying the fine needs the money and sets roll', () => {
    const g = jailed();
    expect(leaveJail({ ...g, players: g.players.map(p => ({ ...p, money: 10 })) }, 0, 'fine').players[0].inJail).toBe(true);
    const s = leaveJail(g, 0, 'fine');
    expect(s.players[0].inJail).toBe(false);
    expect(s.turnPhase).toBe('roll');
  });

  it('endTurn skips bankrupt players, resets doubles, flags jailed next player', () => {
    const g = newGame();
    g.players[0].doublesCount = 2;
    g.players[1].isBankrupt = true;
    g.players[2].inJail = true;
    const s = endTurn(g);
    expect(s.currentPlayerIndex).toBe(2);
    expect(s.turnPhase).toBe('injail');
    expect(s.players[0].doublesCount).toBe(0);
  });

  it('last player standing wins', () => {
    const g = newGame();
    g.players[1].isBankrupt = g.players[2].isBankrupt = true;
    const s = applyWinCondition(g);
    expect(s.phase).toBe('gameover');
    expect(s.winner).toBe(0);
  });
});
