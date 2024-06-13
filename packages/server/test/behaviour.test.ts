import { tick, command } from '../src/game.js'
import { createUnit } from '../src/units.js'
import { Game, PlayerState, Unit, GameMap, Position, TilePos } from '../src/types'
import { expect, test, describe } from 'vitest'

const TICK_MS = 50;

function createOnePlayerState(): PlayerState {
    return { resources: 0, stillInGame: true };
}

function createTestMap(): GameMap {
    const size = 20;

    const tiles = new Array(size*size).fill(0);

    return {
        w: size,
        h: size,
        tiles
    }
}

function createBasicGame(override: Partial<Game>): Game {
    const units: Unit[] = [];

    const board = {
        map: createTestMap(),
    };

    const defaultGame: Game = {
        matchId: "test",
        state: { id: 'Play' },
        tickNumber: 1,
        players: [createOnePlayerState(), createOnePlayerState()],
        board,
        units,
        lastUnitId: units.length,
        winCondition: 'OneLeft',
    };

    return {...defaultGame, ...override};
}

function spawnUnit(g: Game, owner: number, kind: string, position: Position) {
    g.lastUnitId += 1;
    g.units.push(createUnit(
        g.lastUnitId,
        owner,
        kind,
        position,
    ));
}

function markRectangle(m: GameMap, a: TilePos, b: TilePos) {
    for (let x = a.x; x <= b.x; x += 1) {
        for (let y = a.y; y <= b.y; y += 1) {
            m.tiles[y * m.w + x] = 1;
        }
    }

}

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
        expect(game.units[0].position.x).toBeCloseTo(15, 0);
        expect(game.units[0].position.y).toBeCloseTo(15, 0);

        expect(game.state.id).toBe('Play');
    });
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

    test.each([
        { name: "empty map", f: () => {} },
        { name: "no space below", f: (game: Game) => {
            markRectangle(game.board.map, {x: 4, y: 10}, {x: 10, y: 12});
        }},
    ])('find appropriate location for the unit - $name', ({f}) => {
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

        console.log(game.units);

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

        console.log(game.units);

        expect(game.units[1].state.state).toBe('active');
        expect(game.units[1].state.action).toBe('Moving');
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

    // TODO - currently the game allows placing the building on top of the harvester
    // once this is fixed, the test will succeed!
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

        console.log(game.units)

        expect(game.units.length).toBe(1);
    });
});
