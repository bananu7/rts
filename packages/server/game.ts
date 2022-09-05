import {
    GameMap, Game, Player, Unit, Component, CommandPacket, UpdatePacket, Position, TilePos, UnitState,
    Mover, Attacker, Harvester
} from './types';

import { gridPathFind } from './pathfinding.js'

type Milliseconds = number;

interface Catalog {
    [kind: string]: { components: Component[] };
}

const UNIT_CATALOG : Catalog = {
    'Harvester': {
        // owner, position, direction only on instance
        components: [
            { type: 'Mover', speed: 10 },
            { type: 'Attacker', damage: 5, cooldown: 1000 },
            { type: 'Harvester', harvestingTime: 1000, harvestingValue: 20 }
        ]
    },
    'Base': {
        components: [
            { type: 'Building' },
            { type: 'ProductionFacility', unitsProduced: ['Harvester'] }
        ]
    },
    'ResourceNode':{
        components: [
            { type: 'Resource', value: 100 }
        ]
    },
    'Barracks':{
        components: [
            { type: 'Building' },
            { type: 'ProductionFacility', unitsProduced: ['Trooper'] }
        ]
    },
    'Trooper':{
        components: [
            { type: 'Mover', speed: 10 },
            { type: 'Attacker', damage: 10, cooldown: 500 }
        ]
    },
};

// TODO
const TEMP_STARTING_UNITS : Unit[] = [
    {
        actionQueue: [],
        id: 1,
        kind: 'Harvester',
        owner: 1,
        position: {x:31, y:25},
        direction: 0,
    },
    {
        actionQueue: [],
        id: 2,
        kind: 'Harvester',
        owner: 2,
        position: {x:64, y:90},
        direction: 0,
    },
    {
        actionQueue: [],
        id: 3,
        kind: 'Base',
        owner: 1,
        position: {x:10, y:10},
        direction: 0,
    },
    {
        actionQueue: [],
        id: 4,
        kind: 'Base',
        owner: 2,
        position: {x:90, y:90},
        direction: 0,
    },
];

export function newGame(map: GameMap): Game {
    return {
        state: {id: 'Fresh'},
        tickNumber: 0,
        players: [],
        board: {
            map: map,
        },
        units: TEMP_STARTING_UNITS,
    }
}

export function startGame(g: Game) {
    g.state = {id: 'Precount', count: 0};
}

export function command(c: CommandPacket, g: Game) {
    const u = g.units.find(u => c.unitId === u.id);
    if (!u)
        return;

    console.log(`Adding action ${c.action} => ${c.unitId} for unit ${u.id}`)

    // TODO: disabled for pathfinding test
    if (c.action.typ == 'Move') {
        const targetPos = c.action.target as Position; // TODO follow
        const unitTilePos = { x: Math.floor(u.position.x), y: Math.floor(u.position.y) };
        const destTilePos =  { x: Math.floor(targetPos.x), y: Math.floor(targetPos.y) };

        u.pathToNext = gridPathFind(unitTilePos, destTilePos, g.board.map);   
    }
    
    if (c.shift)
        u.actionQueue.push(c.action);
    else
        u.actionQueue = [c.action];
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

    const unitUpdates: UnitState[] = g.units
        .map(u => { return {
            id: u.id,
            status: u.actionQueue.length > 0 ? 'Moving' : 'Idle', // TODO pull actual action that's done
            position: u.position,
            direction: u.direction,
            owner: u.owner,
            kind: u.kind,
        }});

    return { tickNumber: g.tickNumber, units: unitUpdates};
}

function updateUnits(dt: Milliseconds, g: Game) {
    for (const unit of g.units) {
        updateUnit(dt, g, unit);
    }
}

function updateUnit(dt: Milliseconds, g: Game, unit: Unit) {
    // if no actions are queued, the unit is considered idle
    if (unit.actionQueue.length === 0)
        return;
    
    const unitInfo = UNIT_CATALOG[unit.kind];

    const getMoveComponent = (): Mover => {
        return unitInfo.components.find(c => c.type === 'Mover') as Mover;
    }

    const getAttackerComponent = () => {
        return unitInfo.components.find(c => c.type === 'Attacker') as Attacker;
    }

    const getHarvesterComponent = () => {
        return unitInfo.components.find(c => c.type === 'Harvester') as Harvester;
    }
    
    // TODO - handle more than one action per tick
    // requires pulling out the distance traveled so that two moves can't happen
    // one after another

    const cmd = unit.actionQueue[0];
    switch (cmd.typ) {
        case 'Move': {
            const mc = getMoveComponent();
            if (!mc) {
                // ignore the move command if can't move
                unit.actionQueue.shift();
                break;
            }

            const distancePerTick = mc.speed * (dt / 1000);
            // TODO: moving target
            // TODO: collisions
            if (!unit.pathToNext) {
                throw "This unit has a move command but no path computed";
            }

            let nextPathStep = unit.pathToNext[0];
            let distanceLeft = distancePerTick;

            while (distanceLeft > 0) {
                const dst = distance(unit.position, nextPathStep);
                // can reach next path setp
                if (dst < distanceLeft) {
                    // set the unit to the reached path step
                    unit.position = nextPathStep;
                    // subtract from distance "budget"
                    distanceLeft -= dst;
                    // pop the current path step off
                    unit.pathToNext.shift();

                    // if there are no more path steps to do, we've reached the destination
                    if (unit.pathToNext.length === 0) {
                        // TODO - that will cause stutter at shift-clicked moves
                        unit.actionQueue.shift();
                        break;
                    } else {
                        nextPathStep = unit.pathToNext[0];
                        continue;
                    }
                }
                // spent all the distance budget
                else {
                    const {x:dx, y:dy} = unitVector(unit.position, nextPathStep);
                    unit.direction = angleFromTo(unit.position, nextPathStep);
                    unit.position.x += dx * distancePerTick;
                    unit.position.y += dy * distancePerTick;
                    break;
                }
            }

            break;
        }
        case 'Attack': {
            const ac = getAttackerComponent();
            if (!ac) {
                unit.actionQueue.shift();
                break;
            }

            break;
        }
        case 'Harvest': {
            const hc = getHarvesterComponent();
            if (!hc) {
                unit.actionQueue.shift();
                break;
            }

            break;
        }
    }
}

function distance(a: Position, b: Position) {
    const x = a.x-b.x;
    const y = a.y-b.y;
    return Math.sqrt(x*x+y*y);
}

function angleFromTo(a: Position, b: Position) {
    return Math.atan2(b.y-a.y, b.x-a.x);
}

function unitVector(a: Position, b: Position) {
    const angle = angleFromTo(a, b);
    return {x: Math.cos(angle), y: Math.sin(angle)};
}

function eliminated(g: Game): Player[] {
    const isBuilding = (u: Unit) => !!UNIT_CATALOG[u.kind].components.find(c => c.type === 'Building');
    const buildingsByPlayer = (p: Player) => g.units.filter(u => u.owner === p && isBuilding(u));

    const buildingCounts = g.players.map(p => [p, buildingsByPlayer(p).length]);

    return buildingCounts.filter(([p,c]) => c === 0).map(([p,c]) => p);
}

