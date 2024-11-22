import { tick, command } from '../../src/game.js'
import { Game, PlayerState, Unit, GameMap, Position, TilePos, Harvester } from '../../src/types'
import { expect, test, describe } from 'vitest'

import { createBasicGame, createOnePlayerState, spawnUnit, markRectangle } from '../util.js'

const TICK_MS = 50;

describe('movement', () => {
    test('move to map', () => {
        const game = createBasicGame({});

        spawnUnit(game, 1, "Harvester", {x: 5, y: 5});
        tick(TICK_MS, game);
        command({
                command: { typ: 'Move', target: { x: 15, y: 15 }},
                unitIds: [1],
                shift: false,
            },
            game,
            1
        );

        tick(TICK_MS, game);

        expect(game.units[0].state.state).toBe('active');
        expect(game.units[0].state.action).toBe('Moving');

        for (let i = 0; i < 20 * 10; i++)
            tick(TICK_MS, game);

        expect(game.units[0].state.state).toBe('idle');
        expect(game.units[0].pathToNext).toBeUndefined();
        expect(game.units[0].position.x).toBeCloseTo(15, 0);
        expect(game.units[0].position.y).toBeCloseTo(15, 0);

        expect(game.state.id).toBe('Play');
    });

    test('follow-move to building', () => {
        const game = createBasicGame({}, 30);
        spawnUnit(game, 1, "Harvester", {x: 2, y: 2});
        spawnUnit(game, 1, "Base", {x: 20, y: 5});

        tick(TICK_MS, game);

        command({
                command: { typ: 'Follow', target: 2 },
                unitIds: [1],
                shift: false,
            },
            game,
            1
        );

        for (let i = 0; i < 10 * 10; i++) {
            tick(TICK_MS, game);
        }

        expect(game.units[0].position.x).toBeGreaterThan(15);
        expect(game.units[0].state.state).toBe('idle');
        expect(game.units[0].state.action).toBe('Idle');
    });
});
