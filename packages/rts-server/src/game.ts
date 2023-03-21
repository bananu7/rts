import {
    Milliseconds, Position,
    Board,
    GameMap, Game, PlayerIndex, Unit, UnitId, Component, CommandPacket, UpdatePacket, PresenceMap, TilePos, UnitState, 
    Hp, Mover, Attacker, Harvester, ProductionFacility, Builder, Vision, Building,
    Action, ActionFollow, ActionAttack, ActionMove,
    PlayerState,
} from './types';

import * as V from './vector.js'
import { pathFind } from './pathfinding.js'
import { checkMovePossibility } from './movement.js'
import { createUnit, createStartingUnits, getUnitDataByName, UnitData } from './units.js'
import { notEmpty } from './tsutil.js'
import { mapEmptyForBuilding } from './map.js'

// general accuracy when the unit assumes it has reached
// its destination
const MOVEMENT_EPSILON = 0.2;
// how far the unit will run away from the idle position
// to chase an enemy that it spotted.
const MAXIMUM_IDLE_AGGRO_RANGE = 3.5;
// maximum number of units per player
const MAX_PLAYER_UNITS = 50;

export function newGame(matchId: string, map: GameMap): Game {
    const units = createStartingUnits();
    return {
        matchId,
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
    console.log(`[game] Game #${g.matchId} starting precount`);
    g.state = {id: 'Precount', count: 0};
}

function commandOne(shift: boolean, action: Action, unit: Unit, playerIndex: number) {
    if (unit.owner !== playerIndex) {
        console.info(`[game] Player tried to control other player's unit`);
        return;
    }

    // Don't even add/set actions that the unit won't accept
    const accept = willAcceptAction(unit, action);
    if (!accept) {
        console.info(`[game] Rejecting action ${action.typ} for unit ${unit.id}`);
        return;
    }

    console.log(`[game] Adding action ${action.typ} for unit ${unit.id}`);

    if (unit.actionState.state === 'idle') {
        unit.actionState = {
            state: 'active',
            current: action,
            rest: []
        }
    } else {
        if (shift) {
            unit.actionState.rest.push(action);
        }
        else {
            unit.actionState.current = action;
            unit.actionState.rest = [];
        }
    }
}

// This code generates an offset position for a given spiral index
function spiral(p: Position, i: number, scale: number) {
    const offsets = [
        // target
        [0,0],
        // layer 1
        [1,0],
        [1,1],
        [0,1],
        [-1,1],
        [-1,0],
        [-1,-1],
        [0, -1],
        [1, -1],
        // layer 2
        [2,0],
        [2,1],
        [2,2],
        [1,2],
        [0,2],
        [-1,2],
        [-2,2],
        [-2,1],
        [-2,0],
        [-2,-1],
        [-2,-2],
        [-1,-2],
        [0,-2],
        [1,-2],
        [2,-2],
        [2,-1],
    ];

    // if more units are trying to reach the same location, it's likely that the spiral
    // would need to be adjusted anyway
    if (i < offsets.length) {
        return { x: offsets[i][0] * scale + p.x, y: offsets[i][1] * scale + p.y };
    } else {
        return { x: p.x, y: p.y };
    }
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

    // if multiple units get a move action, spread their targets out
    if (c.action.typ === 'Move' || c.action.typ === 'AttackMove') {
        const target = c.action.target;
        const explode = (p: Position) => Math.floor(p.x)+Math.floor(p.y)*g.board.map.w;
        const isAcceptable = (p: Position) => g.board.map.tiles[explode(p)] === 0; // TODO - out of bounds etc

        // Don't even bother if the original target isn't passable
        // TODO - flying units
        if (!isAcceptable(target))
            return;
        
        // find all units that will participate in spiral formation forming
        const simps = us
            .filter(u => willAcceptAction(u, c.action))
            .map(u => ({ unit: u, position: u.position }))
        ;

        // TODO - rough ordering of them by distance. This could be done better,
        // including their relative positions to the target, or even the time
        // it will take them to reach the target
        simps.sort((a,b) => 
            V.distance(a.position, target) - V.distance(b.position, target)
        )

        // assign a position on the spiral for each unit
        const ssimps = simps.map((s, i) => {
            const potentialNewTarget = spiral(target, i, 1.5);
            return {
                unit: s.unit,
                position: isAcceptable(potentialNewTarget) ? potentialNewTarget : target
            }
        });

        // send the action to eah unit individually
        ssimps.forEach(s => {
            const action = {
                typ: 'Move',
                target: { x: s.position.x, y: s.position.y }
            } as ActionMove;
            commandOne(c.shift, action, s.unit, playerIndex);
        });
    }

    else {
        us.forEach(u => {
            commandOne(c.shift, c.action, u, playerIndex);
        });
    }
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
            const status: (US) = u.actionState.state === 'active' ?
                (actionToStatus[u.actionState.current.typ] as US) :
                'Idle';

            return {
                id: u.id,
                status,
                position: u.position,
                direction: u.direction,
                velocity: u.velocity,
                owner: u.owner,
                kind: u.kind,
                components: u.components,
                debug: u.debug,
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

function buildPresenceMap(units: Unit[], board: Board): PresenceMap {
    const presence: PresenceMap = new Map();
    for (const u of units) {
        const explodedIndex = Math.floor(u.position.x) + Math.floor(u.position.y) * board.map.w;
        const us = presence.get(explodedIndex) ?? [] as Unit[];
        us.push(u);
        presence.set(explodedIndex, us);
    }
    return presence;
}

function updateUnits(dt: Milliseconds, g: Game) {
    // Build a unit presence map
    const presence = buildPresenceMap(g.units, g.board);

    // calculate updates and velocities
    for (const unit of g.units) {
        updateUnit(dt, g, unit, presence);
    }
    // move everything at once
    for (const unit of g.units) {
        V.vecAdd(unit.position, unit.velocity);
        unit.velocity.x = 0;
        unit.velocity.y = 0;
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
        unit.velocity.x = 0;
        unit.velocity.y = 0;
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

    const becomeIdleAtCurrentPosition = () => {
        unit.actionState = {
            state: 'idle',
            idlePosition: { x: unit.position.x, y: unit.position.y },
        }
    }

    const clearCurrentAction = () => {
        stopMoving();
        if (unit.actionState.state === 'active') {
            const next = unit.actionState.rest.shift();
            if (next) {
                unit.actionState.current = next;
            }
            else {
                becomeIdleAtCurrentPosition();
            }
        }
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

        let distanceLeft = distancePerTick;

        unit.debug ??= {};
        unit.debug.pathToNext = unit.pathToNext;

        const target = unit.pathToNext[0];
        const targetDist = V.distance(target, unit.position);

        const diff = targetDist < distancePerTick ? targetDist : distancePerTick;
        unit.direction = V.angleFromTo(unit.position, target);

        // TODO - slow starts and braking
        const velocity = checkMovePossibility(unit, g.board.map, presence);

        V.vecSet(unit.velocity, velocity);
        
        if (targetDist < distancePerTick)
            unit.pathToNext.shift();

        // if there are no more path steps to do, we've reached the destination
        if (unit.pathToNext.length === 0) {
            // TODO - that will cause stutter at shift-clicked moves
            stopMoving();
            return true;
        }

        return false;
    }

    const findUnitPosition = (targetId: UnitId) => {
        const target = g.units.find(u => u.id === targetId); // TODO Map
        if (target)
            return { x: target.position.x, y: target.position.y };
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
        if (V.distance(targetPos, unit.position) < range) {
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
            if (V.distance(targetPos, unit.pathToNext[unit.pathToNext.length-1]) > PATH_RECOMPUTE_DISTANCE_THRESHOLD){
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
            return V.distance(unit.position, ba.position) - V.distance(unit.position, bb.position);
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

        if (V.distance(unit.position, target.position) > vision.range) {
            return;
        }

        return target;
    }

    const attemptDamage = (ac: Attacker, target: Unit) => {
        if (ac.cooldown === 0) {
            // TODO - attack cooldown
            const hp = getHpComponent(target);
            if (hp) {
                hp.hp -= ac.damage;
            }
            ac.cooldown = ac.attackRate;
        }
    }

    const aggro = (ac: Attacker, target: Unit) => {
        // if out of range, just move to target
        if (V.distance(unit.position, target.position) > ac.range) {
            // Right now the attack command is upheld even if the unit can't move
            // SC in that case just cancels the attack command - TODO decide
            moveTowards(target.position, ac.range);
        } else {
            unit.direction = V.angleFromTo(unit.position, target.position);
            attemptDamage(ac, target);
        }
    }

    // Update passive cooldowns
    {
        const ac = getAttackerComponent(unit);
        if (ac) {
            ac.cooldown -= dt;
            if (ac.cooldown < 0)
                ac.cooldown = 0;
        }
    }

    // Idle state
    if (unit.actionState.state === 'idle') {
        const ac = getAttackerComponent(unit);

        // TODO run away when attacked
        if (!ac) {
            return;
        }

        const target = detectNearbyEnemy(); 
        if (!target) {
            // try to return to the idle position;
            // if it's close enough, it shouldn't start moving at all
            moveTowards(unit.actionState.idlePosition, MOVEMENT_EPSILON);
            return;   
        }

        // TODO: hysteresis
        const distanceFromIdle = V.distance(unit.position, unit.actionState.idlePosition);
        if (distanceFromIdle < MAXIMUM_IDLE_AGGRO_RANGE){
            aggro(ac, target);
        } else {
            moveTowards(unit.actionState.idlePosition, MOVEMENT_EPSILON);
        }
        
        return;
    }

    const cmd = unit.actionState.current;
    const owner = g.players[unit.owner - 1]; // TODO players 0-indexed is a bad idea

    switch (cmd.typ) {
        case 'Move': {
            if (moveTowards(cmd.target, MOVEMENT_EPSILON) !== 'Moving') {
                clearCurrentAction();
            }
            break;
        }

        case 'AttackMove': {
            const ac = getAttackerComponent(unit);
            // TODO just execute move to go together with formation
            if (!ac) {
                return;
            }

            const closestTarget = detectNearbyEnemy();
            if (closestTarget) {
                const MAX_PATH_DEVIATION = 5;

                // TODO compute
                const pathDeviation = 0; //computePathDeviation(unit);
                if (pathDeviation > MAX_PATH_DEVIATION) {
                    // lose aggro
                    // TODO: aggro hysteresis?
                    // just move
                    if (moveTowards(cmd.target, MOVEMENT_EPSILON) !== 'Moving') {
                        clearCurrentAction();
                    }
                } else {
                    aggro(ac, closestTarget);
                }
            } else {
                // just move
                if (moveTowards(cmd.target, MOVEMENT_EPSILON) !== 'Moving') {
                    clearCurrentAction();
                }
            }

            break;
        }

        case 'Stop': {
            stopMoving();
            // TODO dedicated cancel action
            cancelProduction();
            becomeIdleAtCurrentPosition();
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

            aggro(ac, target);
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
                clearCurrentAction();
                break;
            }

            if (!p.productionState) {
                const numberOfPlayerUnits = g.units.filter(u => u.owner === unit.owner).length;
                if (numberOfPlayerUnits >= MAX_PLAYER_UNITS) {
                    console.info("[game] Unit orderded to produce but maximum unit count reached");
                    clearCurrentAction();
                    break;
                }

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
            try {
                const bc = getBuilderComponent(unit);
                if (!bc)
                    throw "[game] Unit without a builder component ordered to build";

                const buildCapability = bc.buildingsProduced.find(bp => bp.buildingType === cmd.building);
                if (!buildCapability)
                    throw "[game] Unit ordered to build something it can't";

                if (buildCapability.buildCost > owner.resources)
                    throw "[game] Unit ordered to build but player doesn't have enough resources";

                const buildingData = getUnitDataByName(cmd.building);
                if (!buildingData)
                    throw "[game] Unit ordered to build unknown unit" +  cmd.building;

                const getBuildingComponent = (ud: UnitData) => {
                    return ud.find(c => c.type === 'Building') as Building;
                };

                const buildingComponent = getBuildingComponent(buildingData);
                if (!buildingComponent)
                    throw "[game] Unit ordered to build something that's not a building: " + cmd.building;

                if (!mapEmptyForBuilding(g.board.map, buildingComponent.size, cmd.position))
                    throw "[game] Unit ordered to build but some tiles are obscured";

                const BUILDING_DISTANCE = 2;
                switch(moveTowards(cmd.position, BUILDING_DISTANCE)) {
                case 'Unreachable':
                    clearCurrentAction();
                    break;
                case 'ReachedTarget':
                    owner.resources -= buildCapability.buildCost;
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
            catch(e) {
                console.info(e);
                clearCurrentAction();
                break;
            }

        }
    }
}



function eliminated(g: Game): PlayerIndex[] {
    const isBuilding = (u: Unit) => !!u.components.find(c => c.type === 'Building');
    const buildingsByPlayer = (p: PlayerIndex) => g.units.filter(u => u.owner === p && isBuilding(u));

    // TODO support more than 2 players
    const buildingCounts = [1,2].map(p => [p, buildingsByPlayer(p).length]);

    return buildingCounts.filter(([p,c]) => c === 0).map(([p,c]) => p);
}

