import { tick, command } from '../../src/game.js'
import { Game, PlayerState, Unit, GameMap, Position, TilePos, Harvester } from '../../src/types'
import { expect, test, describe } from 'vitest'

import { createBasicGame, createOnePlayerState, spawnUnit, markRectangle } from '../util.js'

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
