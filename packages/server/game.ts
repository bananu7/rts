import {GameMap, Game, Player, Unit, UnitKind, CommandPacket, UpdatePacket, Position} from './types';

import { gridPathFind, TilePos } from './pathfinding.js'

type Milliseconds = number;

// TODO
const TEMP_STARTING_UNITS : Unit[] = [
    {
        actionQueue: [],
        id: 1,
        kind: 'Harvester',
        owner: 1,
        position: {x:31, y:25},
    },
    {
        actionQueue: [],
        id: 2,
        kind: 'Harvester',
        owner: 2,
        position: {x:64, y:90},
    },
    {
        actionQueue: [],
        id: 3,
        kind: 'Base',
        owner: 1,
        position: {x:10, y:10},
    },
    {
        actionQueue: [],
        id: 4,
        kind: 'Base',
        owner: 2,
        position: {x:90, y:90},
    },
];

const UNIT_DATA = {
    'Harvester' : {
        speed: 10,
        health: 50,
        damage: 5,
    },
    'Marine' : {
        speed: 10,
        health: 50,
        damage: 10,
    },
    'Tank' : {
        speed: 8,
        health: 150,
        damage: 25,
    },
    'Base' : {
        speed: 0,
    },
    'Barracks' : {
        speed: 0,
    }
}

export function newGame(map: GameMap): Game {
    return {
        state: {id: 'Fresh'},
        tickNumber: 0,
        players: [],
        board: {
            map: map,
            units: TEMP_STARTING_UNITS,
        }
    }
}

export function startGame(g: Game) {
    g.state = {id: 'Precount', count: 0};
}

export function command(c: CommandPacket, g: Game) {
    const u = g.board.units.find(u => c.unitId === u.id);
    if (!u)
        return;

    console.log(`Adding action ${c.action} => ${c.unitId} for unit ${u.id}`)

    // TODO: disabled for pathfinding test
    if (c.action.typ == 'Move') {
        const targetPos = c.action.target as Position; // TODO follow
        const unitTilePos = { x: Math.floor(u.position.x), y: Math.floor(u.position.y) };
        const destTilePos =  { x: Math.floor(targetPos.x), y: Math.floor(targetPos.y) };

        const path = gridPathFind(unitTilePos, destTilePos, g.board.map);

        u.actionQueue = path.map((p: TilePos) => {
            return {typ:'Move', target: {x:p.x, y:p.y}}
        });
    }

    /*
    if (c.shift)
        u.actionQueue.push(c.action);
    else
        u.actionQueue = [c.action];
    */
}

export function tick(dt: Milliseconds, g: Game): UpdatePacket {
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

        updateUnits(dt, g);
    }
    return { tickNumber: g.tickNumber, units: g.board.units};
}

function updateUnits(dt: Milliseconds, g: Game) {
    for (const unit of g.board.units) {
        if (unit.actionQueue.length === 0)
            continue;
        const cmd = unit.actionQueue[0];
        
        const distancePerTick = UNIT_DATA[unit.kind].speed * (dt / 1000);

        switch (cmd.typ) {
        case 'Move': {
            // TODO: moving target
            // TODO: collisions, pathfinding

            const dst = distance(unit.position, cmd.target as Position);
            if (dst < distancePerTick) {
                unit.position = cmd.target as Position;
                unit.actionQueue.shift();
            }
            else {
                const {x:dx, y:dy} = unitVector(unit.position, cmd.target as Position);
                unit.position.x += dx * distancePerTick;
                unit.position.y += dy * distancePerTick;
            }

            break;
        }
        case 'Attack':
            break;
        case 'Harvest':
            break;
        }
    }
}

function distance(a: Position, b: Position) {
    const x = a.x-b.x;
    const y = a.y-b.y;
    return Math.sqrt(x*x+y*y);
}

function unitVector(a: Position, b: Position) {
    const angle = Math.atan2(b.y-a.y, b.x-a.x);
    return {x: Math.cos(angle), y: Math.sin(angle)};
}

function eliminated(g: Game): Player[] {
    const isBuildingKind = (k: UnitKind) => k === 'Base' || k === 'Barracks';
    const buildingsByPlayer = (p: Player) => g.board.units.filter(u => u.owner === p && isBuildingKind(u.kind));

    const buildingCounts = g.players.map(p => [p, buildingsByPlayer(p).length]);

    return buildingCounts.filter(([p,c]) => c === 0).map(([p,c]) => p);
}

