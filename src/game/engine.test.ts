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
    s = buyProperty(s, "0", 6);
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
    expect(leaveJail({ ...g, players: g.players.map(p => ({ ...p, money: 10 })) }, "0", "fine").players[0].inJail).toBe(true);
    const s = leaveJail(g, "0", 'fine');
    expect(s.players[0].inJail).toBe(false);
    expect(s.turnPhase).toBe('roll');
  });

  // Regression: single player calls the engine straight from the buttons, so the engine itself has to
  // refuse jail actions outside a jail turn. Otherwise a player just sent to jail can roll again, and
  // clicking three times uses up all three jail turns inside the same turn.
  describe('only on a jail turn', () => {
    const justSent = () => rollTurn(at(newGame(), 28), [1, 1]); // lands on Go To Jail (30)

    it('being sent to jail ends the turn', () => {
      const s = justSent();
      expect(s.players[0].inJail).toBe(true);
      expect(s.turnPhase).toBe('endturn');
    });

    it('cannot roll for doubles again on the turn you were sent', () => {
      let s = justSent();
      for (let i = 0; i < 3; i++) s = rollForJailTurn(s, [1, 2]);
      expect(s.players[0].inJail).toBe(true);
      expect(s.players[0].jailTurns).toBe(0);
      expect(s.players[0].money).toBe(justSent().players[0].money); // no forced fine either
    });

    it('cannot pay the fine or use a card to get an extra roll on that turn', () => {
      const g = justSent();
      const rich = { ...g, players: g.players.map((p, i) => (i === 0 ? { ...p, getOutOfJailCards: 1 } : p)) };
      expect(leaveJail(rich, '0', 'fine').players[0].inJail).toBe(true);
      expect(leaveJail(rich, '0', 'card').players[0].inJail).toBe(true);
      expect(leaveJail(rich, '0', 'fine').turnPhase).toBe('endturn');
    });

    it('a real jail turn allows exactly one roll', () => {
      const first = rollForJailTurn(jailed(), [1, 2]);
      expect(first.players[0].jailTurns).toBe(1);
      const again = rollForJailTurn(first, [1, 2]); // phase is now endturn
      expect(again.players[0].jailTurns).toBe(1);
    });
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
    expect(s.winner).toBe("0");
  });
});

describe('house rules', () => {
  const rules = { startingMoney: 3000, freeParkingPot: true };

  it('starting money applies to every seat', () => {
    expect(initializeGame(2, 'easy', rules).players.every(p => p.money === 3000)).toBe(true);
  });

  it('taxes feed the Free Parking pot and landing there collects it', () => {
    const g = initializeGame(2, 'easy', rules);
    const taxed = rollTurn(at(g, 0), [1, 3]); // Income Tax (4)
    expect(taxed.freeParkingPot).toBe(200);
    const collected = rollTurn(at({ ...taxed, currentPlayerIndex: 1 }, 14), [3, 3]); // 14 + 6 = Free Parking (20)
    expect(collected.players[1].money).toBe(3200);
    expect(collected.freeParkingPot).toBe(0);
  });

  it('without the rule nothing is pooled', () => {
    const taxed = rollTurn(at(newGame(), 0), [1, 3]);
    expect(taxed.freeParkingPot).toBe(0);
  });
});
