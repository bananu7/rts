import { tick } from '../src/game.js'
import { Game, PlayerState, Unit, GameMap } from '../src/types'
import { describe, test, expect } from '@jest/globals';

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

function createBasicGame(): Game {
    const units: Unit[] = [];

    const board = {
        map: createTestMap(),
    };

    return {
        matchId: "test",
        state: { id: 'Play' },
        tickNumber: 1,
        players: [createOnePlayerState()],
        board,
        units,
        lastUnitId: units.length,
    }
}

test('basic/empty', () => {
    const game = createBasicGame();

    tick(50, game);

    expect(game.units.length).toBe(0);
});
