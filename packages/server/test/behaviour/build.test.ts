import { tick, command } from '../../src/game.js'
import { Game, PlayerState, Unit, GameMap, Position, TilePos, Harvester } from '../../src/types'
import { expect, test, describe } from 'vitest'

import { createBasicGame, createOnePlayerState, spawnUnit, markRectangle } from '../util.js'

const TICK_MS = 50;

describe('build action', () => {
    test('ensure resources', () => {
        const game = createBasicGame({});
        spawnUnit(game, 1, "Harvester", {x: 5, y: 5});

        command({
                command: { typ: 'Build', building: "Barracks", position: { x: 4, y: 4 }},
                unitIds: [1],
                shift: true,
            },
            game,
            1
        );

        tick(TICK_MS, game);

        expect(game.players[0].resources).toBe(0);
        expect(game.units[0].state.state).toBe('idle');
    });

    // Checks if the unit can move after placing a building on top of itself
    test('build on top', () => {
        const game = createBasicGame({});

        game.players[0].resources += 1000;

        spawnUnit(game, 1, "Harvester", {x: 5, y: 5});

        tick(TICK_MS, game);

        command({
                command: { typ: 'Build', building: "Barracks", position: { x: 4, y: 4 }},
                unitIds: [1],
                shift: true,
            },
            game,
            1
        );

        for (let i = 0; i < 20 * 10; i++)
            tick(TICK_MS, game);

        expect(game.units.length).toBe(2);

        console.log("[test] telling the unit to move")
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
    });
});
