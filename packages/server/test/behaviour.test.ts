import { tick } from '../src/game.js'
import { Game, PlayerState, Unit, GameMap } from '../src/types'
import { describe, test, expect } from '@jest/globals';

const TICK_MS = 50;

function createOnePlayerState(): PlayerState {
    return { resources: 0 };
}

function createTestMap(): GameMap {
    const size = 10;

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
        players: [createOnePlayerState()],
        board,
        units,
        lastUnitId: units.length,
        winCondition: 'OneLeft',
    };

    return {...defaultGame, ...override};
}

test('basic/winCondition', () => {
    const game = createBasicGame({});

    tick(TICK_MS, game);

    expect(game.state.id).toBe('GameEnded');
});

test('basic/empty', () => {
    const game = createBasicGame({ winCondition: 'OneLeft'});

    tick(TICK_MS, game);

    expect(game.state.id).toBe('Play');
    expect(game.units.length).toBe(0);
});
