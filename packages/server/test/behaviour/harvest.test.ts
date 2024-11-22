import { tick, command } from '../../src/game.js'
import { Game, PlayerState, Unit, GameMap, Position, TilePos, Harvester } from '../../src/types'
import { expect, test, describe } from 'vitest'

import { createBasicGame, createOnePlayerState, spawnUnit, markRectangle } from '../util.js'

const TICK_MS = 50;

describe('harvest action', () => {
    test('all harvest phases', () => {
        const game = createBasicGame({}, 50);

        spawnUnit(game, 0, "ResourceNode", {x: 6, y: 6});
        spawnUnit(game, 1, "Harvester", {x: 10, y: 8 });
        spawnUnit(game, 1, "Base", {x: 30, y: 10 });

        command({
                command: { typ: 'Harvest', target: 1 },
                unitIds: [2],
                shift: false,
            },
            game,
            1
        );

        console.log("[test] phase 1 - move to resource");
        tick(TICK_MS, game);
        expect(game.units[1].state.state).toBe('active');
        expect(game.units[1].state.action).toBe('Moving');

        console.log("[test] phase 2 - harvesting");
        for (let i = 0; i < 10; i++)
            tick(TICK_MS, game);
        expect(game.units[1].state.action).toBe('Harvesting');

        console.log("[test] phase 3 - pickup and move");
        for (let i = 0; i < 5 * 10; i++)
            tick(TICK_MS, game);
        const hc = game.units[1].components.filter(c => c.type == "Harvester")[0] as Harvester;
        expect(hc.resourcesCarried).toBeTruthy();
        expect(game.units[1].state.action).toBe('Moving');

        console.log("[test] phase 4 - dropoff");
        for (let i = 0; i < 4.5 * 10; i++)
            tick(TICK_MS, game);

        expect(hc.resourcesCarried).toBeUndefined();
        expect(game.units[1].state.action).toBe('Moving');
        expect(game.players[0].resources).toBe(8);
    });

    test('compete for one resource', () => {
        const game = createBasicGame({}, 40);

        spawnUnit(game, 0, "ResourceNode", {x: 15, y: 15});
        // the first one is closer
        spawnUnit(game, 1, "Harvester", {x: 10, y: 14 }); // id 2
        spawnUnit(game, 1, "Harvester", {x: 25, y: 16 }); // id 3

        command({
                command: { typ: 'Harvest', target: 1 },
                unitIds: [2, 3],
                shift: false,
            },
            game,
            1
        );

        for (let i = 0; i < 2 * 10; i++) {
            tick(TICK_MS, game);
        }

        expect(game.units[1].state.action).toBe('Harvesting');
        expect(game.units[2].state.action).toBe('Idle');

        for (let i = 0; i < 4 * 10; i++) {
            tick(TICK_MS, game);
        }

        expect(game.units[2].state.action).toBe('Harvesting');
        expect(game.units[1].state.action).toBe('Idle');
    });
});
