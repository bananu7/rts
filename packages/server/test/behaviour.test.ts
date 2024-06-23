import { tick, command } from '../src/game.js'
import { Game, PlayerState, Unit, GameMap, Position, TilePos, Harvester } from '../src/types'
import { expect, test, describe } from 'vitest'

import { createBasicGame, createOnePlayerState, spawnUnit, markRectangle } from './util.js'

const TICK_MS = 50;

describe('win condition', () => {
    test('BuildingElimination', () => {
        const game = createBasicGame({ winCondition: 'BuildingElimination'});

        tick(TICK_MS, game);

        expect(game.state.id).toBe('GameEnded');
    });

    test('OneLeft', () => {
        const game = createBasicGame({
            winCondition: 'OneLeft',
            players: [createOnePlayerState(), createOnePlayerState()],
        });

        tick(TICK_MS, game);

        expect(game.state.id).toBe('Play');
    });
});

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
});

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
