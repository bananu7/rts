import { tick, command } from '../../src/game.js'
import { Game, PlayerState, Unit, GameMap, Position, TilePos, Harvester } from '../../src/types'
import { expect, test, describe } from 'vitest'

import { createBasicGame, createOnePlayerState, spawnUnit, markRectangle } from '../util.js'

const TICK_MS = 50;

test('attack action on building', () => {
    const game = createBasicGame({}, 30);

    // It can't be exact like {x: 4, y: 10} because then it barely caught in range
    spawnUnit(game, 1, "Trooper", {x: 3.5, y: 9});
    spawnUnit(game, 2, "Base", {x: 18, y: 10});

    tick(TICK_MS, game);
    expect(game.units[0].state.state).toBe('idle');
    expect(game.units[0].state.action).toBe('Idle');

    command({
            command: { typ: 'Attack', target: 2 },
            unitIds: [1],
            shift: false,
        },
        game,
        1
    );

    tick(TICK_MS, game);

    expect(game.units[0].state.state).toBe('active');
    expect(game.units[0].state.action).toBe('Moving');

    for (let i = 0; i < 3 * 10; i++) {
        tick(TICK_MS, game);
    }

    expect(game.units[0].state.state).toBe('active');
    expect(game.units[0].state.action).toBe('Attacking');
});

test('attack-move action', () => {
    const game = createBasicGame({}, 30);

    // spawn two troopers, one to the left, one in the middle
    // belonging to the other player
    spawnUnit(game, 1, "Trooper", {x: 4, y: 10});
    spawnUnit(game, 2, "Trooper", {x: 15, y: 8});
    tick(TICK_MS, game);

    console.log("[test] Checking if the units are idle")
    expect(game.units[0].state.state).toBe('idle');
    expect(game.units[0].state.action).toBe('Idle');
    expect(game.units[1].state.state).toBe('idle');
    expect(game.units[1].state.action).toBe('Idle');

    console.log("[test] Giving AttackMove command");
    command({
            command: { typ: 'AttackMove', target: { x: 25, y: 10 }},
            unitIds: [1],
            shift: false,
        },
        game,
        1
    );
    tick(TICK_MS, game);

    expect(game.units[0].state.state).toBe('active');
    expect(game.units[0].state.action).toBe('Moving');

    console.log("[test] Checking if the unit aggroes on opponent");
    for (let i = 0; i < 2 * 10; i++) {
        tick(TICK_MS, game);
    }

    expect(game.units[0].state.state).toBe('active');
    expect(game.units[0].state.action).toBe('Attacking');
});

describe('attack action', () => {
    test("don't allow targetting self", () => {
        const game = createBasicGame({});
        spawnUnit(game, 1, "Trooper", {x: 4, y: 10});

        command({
                command: { typ: 'Attack', target: 1, },
                unitIds: [1],
                shift: false,
            },
            game,
            1
        );
        tick(TICK_MS, game);

        expect(game.units[0].state.state).toBe('idle');
        expect(game.units[0].state.action).toBe('Idle');
    });
})
