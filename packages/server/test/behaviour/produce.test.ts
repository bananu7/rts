import { tick, command } from '../../src/game.js'
import { Game, PlayerState, Unit, GameMap, Position, TilePos, Harvester } from '../../src/types'
import { expect, test, describe } from 'vitest'

import { createBasicGame, createOnePlayerState, spawnUnit, markRectangle } from '../util.js'

const TICK_MS = 50;

describe('produce action', () => {
    test('ensure resources', () => {
        const game = createBasicGame({});

        spawnUnit(game, 1, "Barracks", {x: 5, y: 5});

        command({
                command: { typ: 'Produce', unitToProduce: "Trooper" },
                unitIds: [1],
                shift: false,
            },
            game,
            1
        );

        tick(TICK_MS, game);

        expect(game.players[0].resources).toBe(0);
        expect(game.units[0].state.state).toBe('idle');
    });

    describe('find appropriate location for the unit', () => {
        test.each([
            { name: "empty map", f: () => {} },
            { name: "no space below", f: (game: Game) => {
                markRectangle(game.board.map, {x: 4, y: 10}, {x: 10, y: 12});
            }},
        ])('$name', ({f}) => {
            const game = createBasicGame({});
            spawnUnit(game, 1, "Barracks", {x: 4, y: 4});

            game.players[0].resources += 1000;

            f(game);

            command({
                    command: { typ: 'Produce', unitToProduce: "Trooper" },
                    unitIds: [1],
                    shift: false,
                },
                game,
                1
            );

            for (let i = 0; i < 15 * 10; i++)
                tick(TICK_MS, game);

            expect(game.units.length).toBe(2);

            // after the unit has been produced, it's hard to tell what a "valid"
            // location is, but at the very least it should be able to move
            command({
                    command: { typ: 'Move', target: { x: 15, y: 15 }},
                    unitIds: [2],
                    shift: false,
                },
                game,
                1
            );

            debugger;

            tick(TICK_MS, game);

            expect(game.units[1].state.state).toBe('active');
            expect(game.units[1].state.action).toBe('Moving');
        });
    });
});
