import { tick, command } from '../src/game.js'
import { createUnit } from '../src/units.js'
import { Game, PlayerState, Unit, GameMap } from '../src/types'
//import { describe, test, expect } from '@jest/globals';
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

test('basic/winCondition/BuildingElimination', () => {
    const game = createBasicGame({ winCondition: 'BuildingElimination'});

    tick(TICK_MS, game);

    expect(game.state.id).toBe('GameEnded');
});

test('basic/winCondition/OneLeft', () => {
    const game = createBasicGame({ 
        winCondition: 'OneLeft',
        players: [createOnePlayerState(), createOnePlayerState()],
    });

    tick(TICK_MS, game);

    expect(game.state.id).toBe('Play');
});

describe('movement', () => {
    test('move to map', () => {
        const game = createBasicGame({});

        spawnUnit(game, 0, "Harvester", {x: 5, y: 5});
        tick(TICK_MS, game);
        command({
                command: { typ: 'Move', target: { x: 15, y: 15 }},
                unitIds: [1]
            },
            game,
            0
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