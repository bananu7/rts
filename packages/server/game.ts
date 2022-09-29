import {
    Milliseconds,
    GameMap, Game, PlayerIndex, Unit, UnitId, Component, CommandPacket, UpdatePacket, Position, TilePos, UnitState,
    Hp, Mover, Attacker, Harvester,
    ActionFollow, ActionAttack
} from './types';

import { pathFind } from './pathfinding.js'
import { createStartingUnits } from './units'

type PresenceMap = Map<number, Unit[]>;

export function newGame(map: GameMap): Game {
    return {
        state: {id: 'Lobby'},
        tickNumber: 0,
        players: 0,
        board: {
            map: map,
        },
        units: createStartingUnits(),
    }
}

export function startGame(g: Game) {
    g.state = {id: 'Precount', count: 0};
}

export function command(c: CommandPacket, g: Game) {
    const us = c.unitIds
        .map(id => g.units.find(u => id === u.id))
        .filter(u => u) // non-null
    ;

    if (us.length === 0)
        return;

    if (g.state.id !== 'Play')
        return;

    us.forEach(u => {
        console.log(`[game] Adding action ${c.action.typ} for unit ${u.id}`)

        switch (c.action.typ) {
            case 'AttackMove': // TODO - implement
            case 'Move':
            {
                const targetPos = c.action.target;
                const path = pathFind(u.position, targetPos, g.board.map);

                if (!path) {
                    return;
                }

                u.pathToNext = path;

                break;
            }
            case 'Follow':
            case 'Attack':
            case 'Harvest':
            {
                // TODO duplication above
                const targetId = c.action.target;
                const target = g.units.find(u => u.id === targetId); // TODO Map
                if (!target) {
                    // the target unit doesn't exist, ignore this action;
                    return;
                }

                const path = pathFind(u.position, target.position, g.board.map);
                if (!path) {
                    // target not reachable, ignore this action
                    // TODO maybe move as far as possible?
                    return;
                }

                u.pathToNext = path;
                break;
            }
            case 'Produce':
                break;
        }
        
        if (c.shift)
            u.actionQueue.push(c.action);
        else
            u.actionQueue = [c.action];
    });
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
            console.log('[game] Game ended by elimination');
            g.state = {id: 'GameEnded'};
        }
        g.tickNumber += 1;

        updateUnits(dt, g);
    }

    const unitUpdates: UnitState[] = g.units
        .map(u => {
            // TODO pull actual action that's done right at the moment
            // (including cooldowns etc)
            const actionToStatus = {
                'Attack': 'Attacking',
                'AttackMove': 'Attacking',
                'Follow': 'Moving',
                'Move': 'Moving',
                'Harvest': 'Harvesting',
                'Produce': 'Idle',
            }
            type US = 'Moving'|'Attacking'|'Harvesting'|'Idle';
            const status: (US) = u.actionQueue.length > 0 ? (actionToStatus[u.actionQueue[0].typ] as US) : 'Idle';

            return {
                id: u.id,
                status,
                position: u.position,
                direction: u.direction,
                velocity: u.velocity,
                owner: u.owner,
                kind: u.kind,
            }
        });

    return { tickNumber: g.tickNumber, units: unitUpdates};
}

const getHpComponent = (unit: Unit): Hp => {
    return unit.components.find(c => c.type === 'Hp') as Hp;
}

const getMoveComponent = (unit: Unit): Mover => {
    return unit.components.find(c => c.type === 'Mover') as Mover;
}

const getAttackerComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'Attacker') as Attacker;
}

const getHarvesterComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'Harvester') as Harvester;
}

function updateUnits(dt: Milliseconds, g: Game) {
    // Build a unit presence map
    const presence: PresenceMap = new Map();
    for (const u of g.units) {
        const explodedIndex = Math.floor(u.position.x) + Math.floor(u.position.y) * g.board.map.w;
        const us = presence.get(explodedIndex) ?? [] as Unit[];
        us.push(u);
        presence.set(explodedIndex, us);
    }

    for (const unit of g.units) {
        updateUnit(dt, g, unit, presence);
    }

    g.units = g.units.filter(u => {
        const hp = getHpComponent(u);
        if (!hp)
            return true; // units with no HP live forever
        
        return hp.hp > 0;
    });
}

function updateUnit(dt: Milliseconds, g: Game, unit: Unit, presence: PresenceMap) {
    // if no actions are queued, the unit is considered idle
    if (unit.actionQueue.length === 0)
        return;

    // TODO - handle more than one action per tick
    // requires pulling out the distance traveled so that two moves can't happen
    // one after another

    const move = (mc: Mover) => {
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
                    unit.velocity.x = 0;
                    unit.velocity.y = 0;
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

                const desiredVelocity = {x: dx * distancePerTick, y: dy * distancePerTick };

                // TODO - slow starts and braking
                unit.velocity = checkMovePossibility(unit.id, unit.position, desiredVelocity, g.board.map, presence);

                unit.position = sum(unit.position, unit.velocity);
                break;
            }
        }
    }

    // returns whether the unit is still supposed to move
    const recomputePathToTarget = (targetId: UnitId): boolean => {
        // TODO: duplication with command
        const target = g.units.find(u => u.id === targetId); // TODO Map
        if (!target) {
            // the target unit doesn't exist, end this action
            unit.pathToNext = null;
            unit.actionQueue.shift();
            return false;
        }
        const targetPos = target.position;

        // don't move if we're sufficiently close to the target
        const UNIT_FOLLOW_DISTANCE = 2;
        if (distance(targetPos, unit.position) < UNIT_FOLLOW_DISTANCE) {
            return false;
        }

        // recompute path if target is more than 3 units away from the original destination
        if (distance(targetPos, unit.pathToNext[unit.pathToNext.length-1]) > 3){
            const newPath = pathFind(unit.position, targetPos, g.board.map);

            // if target is unobtainable, forfeit navigation
            if (!newPath) {
                unit.pathToNext = null;
                unit.actionQueue.shift();
                return false;
            } else {
                unit.pathToNext = newPath
            }
        }

        // in other case, simply continue moving
        return true;
    };

    const attack = (ac: Attacker, action: ActionAttack) => {
        const target = g.units.find(u => u.id === action.target); // TODO Map
        if (!target) {
            // the target unit doesn't exist, end this action
            unit.pathToNext = null;
            unit.actionQueue.shift();
            return;
        }

        // if out of range, just move to target
        // TODO - duplication with follow
        if (distance(unit.position, target.position) > ac.range) {
            const mc = getMoveComponent(unit);
            if (!mc) {
                // if cannot move to the target, then just sit in place
                return;
            }

            // TODO - similar to follow only recompute on change
            // but I'm finding it challenging to build proper abstractions for this
            const newPath = pathFind(unit.position, target.position, g.board.map);

            // if target is unobtainable, forfeit navigation
            if (!newPath) {
                unit.pathToNext = null;
                unit.actionQueue.shift();
            } else {
                unit.pathToNext = newPath
                move(mc);
            }
        } else {
            const hp = getHpComponent(unit);
            if (hp) {
                hp.hp -= ac.damage;
            }
        }
    }
    
    const cmd = unit.actionQueue[0];
    switch (cmd.typ) {
        case 'Move': {
            const mc = getMoveComponent(unit);
            if (!mc) {
                // ignore the move command if can't move
                unit.actionQueue.shift();
                break;
            }
            move(mc);
            break;
        }

        case 'Follow': {
            const mc = getMoveComponent(unit);
            if (!mc) {
                // ignore the move command if can't move
                unit.actionQueue.shift();
                break;
            }

            const shouldMove = recomputePathToTarget(cmd.target);
            if (shouldMove) {
                move(mc);
            }
            break;
        }

        case 'Attack': {
            const ac = getAttackerComponent(unit);
            if (!ac) {
                unit.actionQueue.shift();
                return;
            }

            attack(ac, cmd);
            break;
        }
        case 'Harvest': {
            const hc = getHarvesterComponent(unit);
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

function magnitude(a: Position) {
    return Math.sqrt(a.x*a.x+a.y*a.y);
}

function difference(a: Position, b: Position) {
    return {x: a.x-b.x, y:a.y-b.y};
}

function clampVector(a: Position, max: number) {
    const m = magnitude(a);
    if (m <= max)
        return { x: a.x, y: a.y };
    else {
        const f = max / m;
        return { x: a.x * f, y: a.y * f };
    }
}

function sum(a: Position, b: Position) {
    return {x: a.x + b.x, y: a.y + b.y };
}

function angleFromTo(a: Position, b: Position) {
    return Math.atan2(b.y-a.y, b.x-a.x);
}

function unitVector(a: Position, b: Position) {
    const angle = angleFromTo(a, b);
    return {x: Math.cos(angle), y: Math.sin(angle)};
}

function eliminated(g: Game): PlayerIndex[] {
    const isBuilding = (u: Unit) => !!u.components.find(c => c.type === 'Building');
    const buildingsByPlayer = (p: PlayerIndex) => g.units.filter(u => u.owner === p && isBuilding(u));

    // TODO support more than 2 players
    const buildingCounts = [1,2].map(p => [p, buildingsByPlayer(p).length]);

    return buildingCounts.filter(([p,c]) => c === 0).map(([p,c]) => p);
}


function checkMovePossibility(unitId: UnitId, currentPos: Position, desiredVelocity: Position, gm: GameMap, presence: PresenceMap) {
    const explode = (p: TilePos) => p.x+p.y*gm.w; 

    const allTilesInfluenced = createTilesInfluenced(currentPos, 1);
    const otherUnitsNearby =
        allTilesInfluenced
        .map(t => presence.get(explode(t)))
        .map(ps => ps ?? [])
        .flat(2);

    let separation = {x:0, y:0};
    for (const u of otherUnitsNearby) {
        if (u.id === unitId)
            continue;

        let localSeparation = difference(currentPos, u.position);

        // the force gets stronger the closer it is
        const distance = magnitude(localSeparation);
        const distanceFactor = distance > 0.00001 ? 1 / distance : 10; // avoid zero distance issues
        localSeparation.x *= distanceFactor;
        localSeparation.y *= distanceFactor;

        // clamp the local force to avoid very high impulses at close passes
        const MAX_LOCAL_SEPARATION_FORCE = 2;
        localSeparation = clampVector(localSeparation, MAX_LOCAL_SEPARATION_FORCE);

        separation = sum(separation, localSeparation);

        // push other unit apart
        u.position.x -= localSeparation.x;
        u.position.y -= localSeparation.y;
    }

    // limit maximum    
    const MAX_SEPARATION_FORCE = 3;
    separation = clampVector(separation, MAX_SEPARATION_FORCE);

    // push off of terrain
    //terrainAvoidance = 

    const velocity = sum(desiredVelocity, separation);

    // this should still acceleration not velocity directly...
    return velocity;
}

// TODO duplication with pathfinding
function getSurroundingPos(p: TilePos): TilePos[] {
    return [
        {x: p.x, y: p.y},

        {x: p.x+1, y: p.y},
        {x: p.x+1, y: p.y+1},
        {x: p.x, y: p.y+1},
        {x: p.x-1, y: p.y+1},
        {x: p.x-1, y: p.y},
        {x: p.x-1, y: p.y-1},
        {x: p.x, y: p.y-1},
        {x: p.x+1, y: p.y-1}
    ]
}

function createTilesInfluenced(pos: Position, size: number) {
    const result = [];
    const tile = { x: Math.floor(pos.x), y: Math.floor(pos.y) };

    // TODO - incorrect, should actually find all affected tiles
    // depending on the size
    const surrounding = getSurroundingPos(tile);
    surrounding.push(tile);
    return surrounding;
}


