import {
    Milliseconds,
    GameMap, Game, PlayerIndex, Unit, UnitId, Component, CommandPacket, UpdatePacket, Position, TilePos, UnitState,
    Hp, Mover, Attacker, Harvester, ProductionFacility, Builder, Vision,
    Action, ActionFollow, ActionAttack,
    PlayerState,
} from './types';

import { pathFind } from './pathfinding.js'
import { createUnit, createStartingUnits } from './units.js'

type PresenceMap = Map<number, Unit[]>;

export function newGame(map: GameMap): Game {
    const units = createStartingUnits();
    return {
        state: {id: 'Lobby'},
        tickNumber: 0,
        // TODO factor number of players in creation
        players: [{resources: 50}, {resources: 50}],
        board: {
            map: map,
        },
        units,
        lastUnitId: units.length,
    }
}

export function startGame(g: Game) {
    console.log("[game] Game starting precount");
    g.state = {id: 'Precount', count: 0};
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    if (value === null || value === undefined) return false;
    const testDummy: TValue = value;
    return true;
}

export function command(c: CommandPacket, g: Game, playerIndex: number) {
    const us: Unit[] = c.unitIds
        .map(id => g.units.find(u => id === u.id))
        .filter(notEmpty) // non-null
    ;

    if (us.length === 0)
        return;

    if (g.state.id !== 'Play')
        return;

    us.forEach(u => {
        if (u.owner !== playerIndex) {
            console.info(`[game] Player tried to control other player's unit`);
            return;
        }

        // Don't even add/set actions that the unit won't accept
        const accept = willAcceptAction(u, c.action);
        if (!accept) {
            console.info(`[game] Rejecting action ${c.action.typ} for unit ${u.id}`);
            return;
        }

        console.log(`[game] Adding action ${c.action.typ} for unit ${u.id}`);

        if (c.shift)
            u.actionQueue.push(c.action);
        else
            u.actionQueue = [c.action];
    });
}

function willAcceptAction(unit: Unit, action: Action) {
    // TODO maybe this should be better streamlined, like in a dictionary
    // of required components for each action?
    switch(action.typ) {
    case 'Move': 
        if (!getMoveComponent(unit))
            return false;
        break;
    case 'Attack':
        if (!getAttackerComponent(unit))
            return false;
        break;
    case 'Harvest':
        if (!getHarvesterComponent(unit))
            return false;
        break;
    case 'Build':
        if (!getBuilderComponent(unit))
            return false;
        break;
    case 'Produce':
        if (!getProducerComponent(unit))
            return false;
        break;
    }
    return true;
}

// Returns a list of update packets, one for each player
export function tick(dt: Milliseconds, g: Game): UpdatePacket[] {
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
            // maybe this should happen client-side actually?
            const actionToStatus = {
                'Attack': 'Attacking',
                'AttackMove': 'Attacking',
                'Follow': 'Moving',
                'Move': 'Moving',
                'Harvest': 'Harvesting',
                'Produce': 'Producing',
                'Build': 'Idle',
                'Stop': 'Idle',
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
                components: u.components,
            }
        });

    // TODO - fog of war will happen here
    return g.players.map((p, i) => {
        return {
            tickNumber: g.tickNumber,
            units: unitUpdates,
            player: p,
            state: g.state,
        }
    });
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

const getProducerComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'ProductionFacility') as ProductionFacility;
}

const getBuilderComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'Builder') as Builder;
}

const getVisionComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'Vision') as Vision;
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
    const stopMoving = () => {
        unit.pathToNext = undefined;
    }

    const cancelProduction = () => {
        const p = unit.components.find(c => c.type === "ProductionFacility") as ProductionFacility | undefined;
        if (p && p.productionState) {
            // refund
            console.log(`[game] Refunding production cost from unit ${unit.id}`);
            owner.resources += p.productionState.originalCost;
            p.productionState = undefined;
        }
    }

    const clearCurrentAction = () => {
        stopMoving();
        unit.actionQueue.shift();
    }

    // TODO - handle more than one action per tick
    // requires pulling out the distance traveled so that two moves can't happen
    // one after another
    // Returns whether it's reached the target
    const moveApply = (mc: Mover) => {
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
                    unit.pathToNext = undefined;
                    return true;
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
                unit.velocity = checkMovePossibility(unit, unit.position, desiredVelocity, g.board.map, presence);

                unit.position = sum(unit.position, unit.velocity);
                return false;
            }
        }

        return false;
    }

    const findUnitPosition = (targetId: UnitId) => {
        const target = g.units.find(u => u.id === targetId); // TODO Map
        if (target)
            return target.position;
        else
            return;
    }

    const computePathTo = (targetPos: Position): boolean => {
        unit.pathToNext = pathFind(unit.position, targetPos, g.board.map);
        return Boolean(unit.pathToNext);
    }

    // Compute a path to the target and execute immediate move towards it
    type MoveResult = 'ReachedTarget' | 'Moving' | 'Unreachable';

    const moveTowards = (targetPos: Position, range: number): MoveResult => {
        if (distance(targetPos, unit.position) < range) {
            return 'ReachedTarget'; // nothing to do
        }

        const mc = getMoveComponent(unit);
        if (!mc)
            return 'Unreachable';

        // If no path is computed, compute it
        if (!unit.pathToNext) {
            if (!computePathTo(targetPos))
                return 'Unreachable';
        } else {
            // If we have a path, but the target is too far from its destination, also compute it
            const PATH_RECOMPUTE_DISTANCE_THRESHOLD = 3;
            if (distance(targetPos, unit.pathToNext[unit.pathToNext.length-1]) > PATH_RECOMPUTE_DISTANCE_THRESHOLD){
                if (!computePathTo(targetPos))
                    return 'Unreachable';
            }
            // Otherwise we continue on the path that we have
        }

        // At this point we certainly have a path
        if (moveApply(mc))
            return 'ReachedTarget';

        return 'Moving';
    }

    const findClosestUnitBy = (p: (u: Unit) => boolean) => {
        const units = g.units.filter(p);

        if (units.length === 0) {
            return;
        }

        units.sort((ba, bb) => {
            return distance(unit.position, ba.position) - distance(unit.position, bb.position);
        });
        
        return units[0];
    }

    const detectNearbyEnemy = () => {
        const vision = getVisionComponent(unit);
        if (!vision) {
            return;
        }

        // TODO query range for optimizations
        const target = findClosestUnitBy(u => 
            u.owner !== unit.owner &&
            u.owner !== 0
        );
        if (!target)
            return;

        if (distance(unit.position, target.position) > vision.range) {
            return;
        }

        return target;
    }

    // Idle state
    if (unit.actionQueue.length === 0) {
        const ac = getAttackerComponent(unit);

        // TODO run away when attacked
        if (!ac) {
            return;
        }

        const closestTarget = detectNearbyEnemy(); 
        if (closestTarget) {
            moveTowards(closestTarget.position, ac.range);
        }
        
        return;
    }

    const cmd = unit.actionQueue[0];
    const owner = g.players[unit.owner - 1]; // TODO players 0-indexed is a bad idea

    switch (cmd.typ) {
        case 'Move': {
            if (moveTowards(cmd.target, 0.1) !== 'Moving') {
                clearCurrentAction();
            }
            break;
        }

        case 'Stop': {
            stopMoving();
            // TODO dedicated cancel action
            cancelProduction();

            unit.actionQueue = [];
            break;
        }

        case 'Follow': {
            const targetPos = findUnitPosition(cmd.target);
            if (!targetPos) {
                clearCurrentAction();
                break;
            }

            const UNIT_FOLLOW_DISTANCE = 2;

            if (moveTowards(targetPos, UNIT_FOLLOW_DISTANCE) === 'Unreachable') {
                clearCurrentAction();
                break;
            }

            break;
        }

        case 'Attack': {
            const ac = getAttackerComponent(unit);
            if (!ac) {
                clearCurrentAction();
                break;
            }

            const target = g.units.find(u => u.id === cmd.target); // TODO Map
            if (!target) {
                // the target unit doesn't exist, end this action
                clearCurrentAction();
                break;
            }

            // if out of range, just move to target
            if (distance(unit.position, target.position) > ac.range) {
                // Right now the attack command is upheld even if the unit can't move
                // SC in that case just cancels the attack command - TODO decide
                moveTowards(target.position, ac.range);
            } else {
                // TODO - attack cooldown
                const hp = getHpComponent(target);
                if (hp) {
                    hp.hp -= ac.damage;
                }
            }
            break;
        }

        case 'Harvest': {
            const hc = getHarvesterComponent(unit);
            if (!hc) {
                clearCurrentAction();
                break;
            }

            const target = g.units.find(u => u.id === cmd.target);
            if (!target) {
                // TODO find other nearby resource
                clearCurrentAction();
                break;
            }

            if (!hc.resourcesCarried) {
                const HARVESTING_DISTANCE = 2;
                const HARVESTING_RESOURCE_COUNT = 8;

                switch(moveTowards(target.position, HARVESTING_DISTANCE)) {
                case 'Unreachable':
                    clearCurrentAction();
                    break;
                case 'ReachedTarget':
                    if (hc.harvestingProgress >= hc.harvestingTime) {
                        hc.resourcesCarried = HARVESTING_RESOURCE_COUNT;
                        // TODO - reset harvesting at any other action
                        // maybe i could use some "exit state function"?
                        hc.harvestingProgress = 0;
                    } else {
                        hc.harvestingProgress += dt;
                    }
                    break;
                }
            } else {
                const DROPOFF_DISTANCE = 2;
                // TODO cache the dropoff base
                // TODO - resource dropoff component
                const target = findClosestUnitBy(u => 
                    u.owner === unit.owner &&
                    u.kind === 'Base'
                );

                if (!target)
                    break;

                switch(moveTowards(target.position, DROPOFF_DISTANCE)) {
                case 'Unreachable':
                    // TODO if closest base is unreachable maybe try next one?
                    clearCurrentAction();
                    break;
                case 'ReachedTarget':
                    owner.resources += hc.resourcesCarried;
                    hc.resourcesCarried = undefined;
                    break;
                }
            }

            break;
        }

        case 'Produce': {
            // TODO should this happen regardless of the command if i keep the state
            // in the component anyway?
            const p = getProducerComponent(unit);
            if (!p) {
                unit.actionQueue.shift();
                break;
            }

            if (!p.productionState) {
                const utp = p.unitsProduced.find(up => up.unitType == cmd.unitToProduce);
                if (!utp) {
                    console.info("[game] Unit orderded to produce but it can't produce this unit type");
                    clearCurrentAction();
                    break;
                }

                const cost = utp.productionCost;

                if (cost > owner.resources) {
                    console.info("[game] Unit ordered to produce but player doesn't have enough resources");
                    clearCurrentAction();
                    break;
                }

                owner.resources -= cost;

                const time = utp.productionTime;
                p.productionState = {
                    unitType: cmd.unitToProduce,
                    timeLeft: time,
                    originalCost: cost,
                    originalTimeToProduce: time,
                };
            }

            p.productionState.timeLeft -= dt;

            if (p.productionState.timeLeft < 0) {
                // TODO - automatic counter
                g.lastUnitId += 1;
                g.units.push(createUnit(
                    g.lastUnitId,
                    unit.owner,
                    p.productionState.unitType,
                    { x: unit.position.x, y: unit.position.y+4 }, // TODO find a good spot for a new unit
                ));

                // TODO - build queue
                clearCurrentAction();
                p.productionState = undefined;
            }

            break;
        }

        case 'Build': {
            const bc = getBuilderComponent(unit);
            if (!bc) {
                console.info("[game] Unit without a builder component ordered to build");
                clearCurrentAction();
                break;
            }

            const bp = bc.buildingsProduced.find(bp => bp.buildingType === cmd.building);
            if (!bp) {
                console.info("[game] Unit ordered to build something it can't");
                clearCurrentAction();
                break;
            }

            if (bp.buildCost > owner.resources) {
                console.info("[game] Unit ordered to build but player doesn't have enough resources");
                clearCurrentAction();
                break;
            }

            const BUILDING_DISTANCE = 2;
            switch(moveTowards(cmd.position, BUILDING_DISTANCE)) {
            case 'Unreachable':
                clearCurrentAction();
                break;
            case 'ReachedTarget':
                owner.resources -= bp.buildCost;
                // TODO - this should take time
                // already specified in bp.buildTime

                g.lastUnitId += 1;
                g.units.push(createUnit(
                    g.lastUnitId,
                    unit.owner,
                    cmd.building,
                    { x: cmd.position.x, y: cmd.position.y },
                ));
                clearCurrentAction();
                break;
            }
            break;
        }

        default: {
            console.warn(`[game] action of type ${cmd.typ} ignored because of no handler`);
            clearCurrentAction();
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


function checkMovePossibility(unit: Unit, currentPos: Position, desiredVelocity: Position, gm: GameMap, presence: PresenceMap) {
    const explode = (p: TilePos) => p.x+p.y*gm.w; 

    // Disable collisions for harvesting units
    if (unit.actionQueue.length > 0 &&
        unit.actionQueue[0].typ === 'Harvest'
    ) {
        return desiredVelocity;
    }

    const allTilesInfluenced = createTilesInfluenced(currentPos, 1);
    const otherUnitsNearby =
        allTilesInfluenced
        .map(t => presence.get(explode(t)))
        .map(ps => ps ?? [])
        .flat(2);

    let separation = {x:0, y:0};
    for (const u of otherUnitsNearby) {
        if (u.id === unit.id)
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

        // push other unit apart (but only if it can move)
        if (u.components.find(c => c.type === 'Mover')) {
            u.position.x -= localSeparation.x;
            u.position.y -= localSeparation.y;
        }
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


