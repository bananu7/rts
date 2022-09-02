
export type Action = 'Move' | 'Attack' | 'Harvest'

export type Player = number

export type UnitKind = 'Harvester' | 'Marine' | 'Tank'
export type Unit = {
    actionQueue: Action[]
    kind: UnitKind,
    owner: Player,
}

export type BuildingKind = 'Base' | 'Barracks'
export type Building = {
    kind: BuildingKind,
    owner: Player,
}

export type Game = {
    state: GameState
    tickNumber: number,
    players: Player[],
    board: Board,
}

export type GameMap = {
    tiles: number[],
    w: number,
    h: number,
};

export type Board = {
    map: GameMap,
    units: Unit[],
    buildings: Building[],
}

export type GameState = {
    id: 'Fresh',
} | {
    id: 'Precount', // once everyone joins
    count: number,
} | {
    id: 'Play',
} | {
    id: 'Paused',
} | {
    id: 'GameEnded',
}

export function newGame(map: GameMap): Game {
    return {
        state: {id: 'Fresh'},
        tickNumber: 0,
        players: [],
        board: {
            map: map,
            units: [],
            buildings: [],
        }
    }
}

export function startGame(g: Game) {
    g.state = {id: 'Precount', count: 0};
}

export function tick(dt: number, g: Game) {
    switch (g.state.id) {
    case 'Precount':
        g.state.count -= dt;
        if (g.state.count <= 1000) {
            g.state = {id: 'Play'};
        }
        break;
    case 'Play':
        const e = eliminated(g);
        // TODO alliances, actual game type etc.
        if (e.length > 0) {
            g.state = {id: 'GameEnded'};
        }
        g.tickNumber += 1;
    }
}

function eliminated(g: Game): Player[] {
    const buildingsByPlayer = (p: Player) => g.board.buildings.filter(b => b.owner === p);

    const buildingCounts = g.players.map(p => [p, buildingsByPlayer(p).length]);

    return buildingCounts.filter(([p,c]) => c === 0).map(([p,c]) => p);
}

