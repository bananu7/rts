import { Game, PlayerState, Unit, GameMap, Position, TilePos } from '../src/types'
import { createUnit } from '../src/game/units.js'

export function createOnePlayerState(): PlayerState {
    return { resources: 0, stillInGame: true };
}

export function createTestMap(size?: number): GameMap {
    size ??= 20;

    const tiles = new Array(size*size).fill(0);

    return {
        w: size,
        h: size,
        tiles
    }
}

export function createBasicGame(override: Partial<Game>, mapSize?: number): Game {
    const units: Unit[] = [];

    const board = {
        map: createTestMap(mapSize),
        playerStartLocations: [],
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

export function spawnUnit(g: Game, owner: number, kind: string, position: Position) {
    g.lastUnitId += 1;
    g.units.push(createUnit(
        g.lastUnitId,
        owner,
        kind,
        position,
    ));
}

export function markRectangle(m: GameMap, a: TilePos, b: TilePos) {
    for (let x = a.x; x <= b.x; x += 1) {
        for (let y = a.y; y <= b.y; y += 1) {
            m.tiles[y * m.w + x] = 1;
        }
    }

}
