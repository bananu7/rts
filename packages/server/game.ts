import {GameMap, Game, Player, Unit} from './types';

// TODO
const TEMP_STARTING_UNITS : Unit[] = [
    {
        actionQueue: [],
        kind: 'Harvester',
        owner: 0,
        position: {x:10, y:10},
    },
    {
        actionQueue: [],
        kind: 'Harvester',
        owner: 0,
        position: {x:90, y:90},
    }
];

export function newGame(map: GameMap): Game {
    return {
        state: {id: 'Fresh'},
        tickNumber: 0,
        players: [],
        board: {
            map: map,
            units: TEMP_STARTING_UNITS,
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

