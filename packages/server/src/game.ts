import {
    Milliseconds, Position,
    Board,
    GameMap, Game, PlayerIndex, Unit, UnitId, Component, CommandPacket, UpdatePacket, PresenceMap, BuildingMap, TilePos, 
    Hp, Mover, Attacker, Harvester, ProductionFacility, Builder, Vision, Building,
    Command, CommandFollow, CommandAttack, CommandMove,
    PlayerState,
} from './types';

import * as V from './vector.js'
import { pathFind, destinationDistance, Destination } from './pathfinding.js'
import { checkMovePossibility } from './movement.js'
import { createUnit, createStartingUnits, getUnitDataByName, UnitData } from './units.js'
import { notEmpty } from './tsutil.js'
import { isBuildPlacementOk, mapEmptyForBuilding, tilesTakenByBuilding } from './shared.js'
import { getHpComponent, getMoveComponent, getAttackerComponent, getHarvesterComponent, getProducerComponent, getBuilderComponent, getVisionComponent, getBuildingComponent } from './components.js'


// TODO include building&unit size in this distance
const UNIT_FOLLOW_DISTANCE = 0.5;
// general accuracy when the unit assumes it has reached
// its destination
const MAP_MOVEMENT_TOLERANCE = 1.0;
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
        winCondition: 'BuildingElimination',
    }
}

export function startGame(g: Game) {
    console.log(`[game] Game #${g.matchId} starting precount`);
    g.state = {id: 'Precount', count: 0};
}

function commandOne(shift: boolean, command: Command, unit: Unit, playerIndex: number) {
    if (unit.owner !== playerIndex) {
        console.info(`[game] Player tried to control other player's unit`);
        return;
    }

    // Don't even add/set actions that the unit won't accept
    const accept = willAcceptCommand(unit, command);
    if (!accept) {
        console.info(`[game] Rejecting command ${command.typ} for unit ${unit.id}`);
        return;
    }

    switch (command.typ) {
    case 'Move':
        console.log(`[game] Command: Move unit ${unit.id} towards [${command.target.x}, ${command.target.y}]`);
        break;
    case 'AttackMove':
        console.log(`[game] Command: AttackMove unit ${unit.id} towards [${command.target.x}, ${command.target.y}]`);
        break;
    case 'Follow':
        console.log(`[game] Command: Follow, unit ${unit.id} follows ${command.target}`);
        break;
    case 'Attack':
        console.log(`[game] Command: Attack, unit ${unit.id} attacks ${command.target}`);
        break;
    default:
        console.log(`[game] Command: ${command.typ} for unit ${unit.id}`);
        break;
    }
    
    if (unit.state.state === 'idle') {
        unit.state = {
            state: 'active',
            action: 'Idle',
            actionTime: 0,
            current: command,
            rest: []
        }
    } else {
        if (shift) {
            unit.state.rest.push(command);
        }
        else {
            unit.state.current = command;
            unit.state.rest = [];
            delete unit.pathToNext;
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

    // if multiple units get a move command, spread their targets out
    if (c.command.typ === 'Move' || c.command.typ === 'AttackMove') {
        const target = c.command.target;
        const explode = (p: Position) => Math.floor(p.x)+Math.floor(p.y)*g.board.map.w;
        const isAcceptable = (p: Position) => g.board.map.tiles[explode(p)] === 0; // TODO - out of bounds etc

        // Don't even bother if the original target isn't passable
        // TODO - flying units
        if (!isAcceptable(target))
            return;
        
        // find all units that will participate in spiral formation forming
        const simps = us
            .filter(u => willAcceptCommand(u, c.command))
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

        // send the command to each unit individually
        ssimps.forEach(s => {
            const command = {
                typ: 'Move',
                target: { x: s.position.x, y: s.position.y }
            } as CommandMove;
            commandOne(c.shift, command, s.unit, playerIndex);
        });
    }

    else {
        us.forEach(u => {
            commandOne(c.shift, c.command, u, playerIndex);
        });
    }
}

function willAcceptCommand(unit: Unit, command: Command) {
    // TODO maybe this should be better streamlined, like in a dictionary
    // of required components for each command?
    switch(command.typ) {
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

    const unitUpdates: Unit[] = g.units
        .map(u => {            
            return {
                id: u.id,
                state: u.state,
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

// The purpose of presence map is easy finding of nearby enemies
// The purpose of building map is to pass it to pathfinding to prevent pathing
// on tiles taken by buildings
function buildPresenceAndBuildingMaps(units: Unit[], board: Board): [PresenceMap, BuildingMap] {
    const presence: PresenceMap = new Map();
    const buildings: BuildingMap = new Map();

    const explode = (p: Position | TilePos) => Math.floor(p.x) + Math.floor(p.y) * board.map.w;

    const markBuildingTile = (u: Unit, t: TilePos) => {
        const explodedIndex = explode(t);
        buildings.set(explodedIndex, u.id);
    };

    const mark = (u: Unit, p: Position | TilePos) => {
        const explodedIndex = explode(p);
        const us = presence.get(explodedIndex) ?? [] as Unit[];
        us.push(u);
        presence.set(explodedIndex, us);
    };

    for (const u of units) {
        const bc = getBuildingComponent(u);
        if (bc) {
            const tilesToMark = tilesTakenByBuilding(bc, u.position);

            tilesToMark.forEach(t => {
                mark(u, t);
                markBuildingTile(u, t);
            });
        } else {
            mark(u, u.position);
        }
    }

    return [presence, buildings];
}

function updateUnits(dt: Milliseconds, g: Game) {
    // Build a unit presence map
    const [presence, buildings] = buildPresenceAndBuildingMaps(g.units, g.board);

    // calculate updates and velocities
    for (const unit of g.units) {
        updateUnit(dt, g, unit, presence, buildings);
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

function updateUnit(dt: Milliseconds, g: Game, unit: Unit, presence: PresenceMap, buildings: BuildingMap) {
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
        unit.state = {
            state: 'idle',
            action: 'Idle',
            actionTime: 0,
            idlePosition: { x: unit.position.x, y: unit.position.y },
        }
    }

    const clearCurrentCommand = () => {
        stopMoving();
        if (unit.state.state === 'active') {
            const next = unit.state.rest.shift();
            if (next) {
                unit.state.current = next;
            }
            else {
                becomeIdleAtCurrentPosition();
            }
        }
    }

    // TODO - handle more than one command per tick
    // requires pulling out the distance traveled so that two moves can't happen
    // one after another
    // Returns whether it's reached the target
    const moveApply = (mc: Mover) => {
        const distancePerTick = mc.speed * (dt / 1000); // speed * time in seconds = s
        if (!unit.pathToNext) {
            throw "This unit has a move command but no path computed";
        }

        // if there are no more path steps to do, we've reached the destination
        if (unit.pathToNext.length === 0) {
            // TODO - that will cause stutter at shift-clicked moves
            stopMoving();
            return true;
        }

        let target = unit.pathToNext[0];
        let targetDist = V.distance(target, unit.position);

        // Skip ONE path node if it's in reach of this ticks' movement
        if (targetDist < distancePerTick) {
            // if that node is the last, move to it ending navigation
            if (unit.pathToNext.length === 1) {
                V.vecSet(unit.velocity, V.difference(target, unit.position));
                return true;
            }

            // otherwise just remove it for the next iteration
            unit.pathToNext.shift();
        }

        unit.debug ??= {};
        unit.debug.pathToNext = unit.pathToNext;

        // this is the direction the unit is facing regardless of actual movement
        // TODO probably should turn when bypassing obstacles maybe?
        unit.direction = V.angleFromTo(unit.position, target);

        // The desired direction is then altered by the collisions with terrain
        // and other units
        const computedDirection = checkMovePossibility(unit, g.board.map, presence);

        const velocity = V.mul(computedDirection, distancePerTick);

        // Velocity is the position "jump" applied to all units at once
        // TODO - slow starts and braking
        V.vecSet(unit.velocity, velocity);

        return false;
    }

    const getUnitReferencePosition = (target: Unit) => {
        // For regular units, their position is in the middle
        // For buildings, it's the top-left corner
        const bc = getBuildingComponent(target);
        
        if (!bc) {
            return { x: target.position.x, y: target.position.y };
        } else {
            return {
                x: target.position.x + (bc.size / 2),
                y: target.position.y + (bc.size / 2),
            }
        }
    }

    const getUnitReferencePositionById = (targetId: UnitId) => {
        const target = g.units.find(u => u.id === targetId); // TODO Map
        if (target)
            return getUnitReferencePosition(target);
        else
            return;
    }

    const computePathTo = (destination: Destination, tolerance: number): boolean => {
        unit.pathToNext = pathFind(unit.position, destination, tolerance, g.board.map, buildings);
        return Boolean(unit.pathToNext);
    }

    // Compute a path to the target and execute immediate move towards it
    type MoveResult = 'ReachedTarget' | 'Moving' | 'Unreachable';
    type MoveToUnitResult = MoveResult | 'TargetNonexistent';

    const moveTowards = (destination: Destination, tolerance: number): MoveResult => {
        // assume idle unless we can guarantee movement
        unit.state.action = 'Idle';

        if (destinationDistance(unit.position, destination) < tolerance) {
            return 'ReachedTarget'; // nothing to do
        }

        const mc = getMoveComponent(unit);
        if (!mc)
            return 'Unreachable';

        // If no path is computed, compute it
        if (!unit.pathToNext) {
            if (!computePathTo(destination, tolerance))
                return 'Unreachable';
        } else {
            // If we have a path, but the target is too far from its destination, also compute it
            const PATH_RECOMPUTE_DISTANCE_THRESHOLD = 3;

            // TODO this logic is a bit wonky
            const pathEmpty = unit.pathToNext.length === 0;
            if (pathEmpty) {
                if (!computePathTo(destination, tolerance))
                    return 'Unreachable';
            } else {
                const distanceFromPathEndToTarget = destinationDistance(unit.pathToNext[unit.pathToNext.length-1], destination);
                if (distanceFromPathEndToTarget > PATH_RECOMPUTE_DISTANCE_THRESHOLD + tolerance){
                    if (!computePathTo(destination, tolerance))
                        return 'Unreachable';
                }
            }
            // Otherwise we continue on the path that we have
        }

        // At this point we certainly have a path
        if (moveApply(mc)) {
            return 'ReachedTarget';
        }

        unit.state.action = 'Moving';

        return 'Moving';
    }

    const moveTowardsPoint = (targetPos: Position, tolerance: number): MoveResult => {
        return moveTowards({type: 'MapDestination', position: {x: targetPos.x, y: targetPos.y}}, MAP_MOVEMENT_TOLERANCE);
    }

    const moveTowardsUnit = (target: Unit, extraTolerance: number): MoveResult => {
        const bc = getBuildingComponent(target);

        const tolerance = extraTolerance + UNIT_FOLLOW_DISTANCE;
        if (!bc) {
            return moveTowardsPoint(getUnitReferencePosition(target), tolerance);
        } else {
            const tiles = tilesTakenByBuilding(bc, target.position);
            return moveTowards({ type: 'BuildingDestination', tiles }, tolerance);
        }
    }

    // helper
    const moveTowardsUnitById = (targetId: UnitId, extraTolerance: number): MoveToUnitResult => {
        const target = g.units.find(u => u.id === targetId);
        if (target) {
            return moveTowardsUnit(target, extraTolerance);
        } else {
            return 'TargetNonexistent';
        }
    }

    const unitDistance = (a: Unit, b: Unit): number => {
         // TODO for buildings it should use perimeter instead of reference?
        const aPos = getUnitReferencePosition(a);
        const bPos = getUnitReferencePosition(b);
        return V.distance(aPos, bPos);
    }

    const findClosestUnitBy = (p: (u: Unit) => boolean) => {
        const units = g.units.filter(p);

        if (units.length === 0) {
            return;
        }

        units.sort((a, b) => unitDistance(unit, a) - unitDistance(unit, b));
        
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
        if (unitDistance(unit, target) > ac.range) {
            // Right now the attack command is upheld even if the unit can't move
            // SC in that case just cancels the attack command - TODO decide
            moveTowardsUnit(target, ac.range);
        } else {
            unit.state.action = 'Attacking';
            const targetPos = getUnitReferencePosition(target);
            unit.direction = V.angleFromTo(unit.position, targetPos);
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
    if (unit.state.state === 'idle') {
        const ac = getAttackerComponent(unit);

        // TODO run away when attacked
        if (!ac) {
            return;
        }

        const target = detectNearbyEnemy(); 
        if (!target) {
            // try to return to the idle position;
            // if it's close enough, it shouldn't start moving at all
            moveTowardsPoint(unit.state.idlePosition, MAP_MOVEMENT_TOLERANCE);
            return;   
        }

        // TODO: hysteresis
        const distanceFromIdle = V.distance(unit.position, unit.state.idlePosition);
        if (distanceFromIdle < MAXIMUM_IDLE_AGGRO_RANGE){
            aggro(ac, target);
        } else {
            moveTowardsPoint(unit.state.idlePosition, MAP_MOVEMENT_TOLERANCE);
        }
        
        return;
    }

    const cmd = unit.state.current;
    const owner = g.players[unit.owner - 1]; // TODO players 0-indexed is a bad idea

    switch (cmd.typ) {
        case 'Move': {
            if (moveTowardsPoint(cmd.target, MAP_MOVEMENT_TOLERANCE) !== 'Moving') {
                clearCurrentCommand();
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
                    if (moveTowardsPoint(cmd.target, MAP_MOVEMENT_TOLERANCE) !== 'Moving') {
                        clearCurrentCommand();
                    }
                } else {
                    aggro(ac, closestTarget);
                }
            } else {
                // just move
                if (moveTowardsPoint(cmd.target, MAP_MOVEMENT_TOLERANCE) !== 'Moving') {
                    clearCurrentCommand();
                }
            }

            break;
        }

        case 'Stop': {
            stopMoving();
            // TODO dedicated cancel command
            cancelProduction();
            becomeIdleAtCurrentPosition();
            break;
        }

        case 'Follow': {
            const moveResult = moveTowardsUnitById(cmd.target, UNIT_FOLLOW_DISTANCE);
            if (moveResult === 'Unreachable' || moveResult === 'TargetNonexistent') {
                clearCurrentCommand();
                break;
            }
            break;
        }

        case 'Attack': {
            const ac = getAttackerComponent(unit);
            if (!ac) {
                console.info('[game] A unit without an Attacker component received an Attack command');
                clearCurrentCommand();
                break;
            }

            // target not existing is a common situation if the target got destroyed
            // after the command was made
            const target = g.units.find(u => u.id === cmd.target);
            if (!target) {
                clearCurrentCommand();
                break;
            }

            aggro(ac, target);
            break;
        }

        case 'Harvest': {
            const hc = getHarvesterComponent(unit);
            if (!hc) {
                clearCurrentCommand();
                break;
            }

            const target = g.units.find(u => u.id === cmd.target);
            if (!target) {
                // TODO find other nearby resource
                clearCurrentCommand();
                break;
            }

            if (!hc.resourcesCarried) {
                const HARVESTING_DISTANCE = 2;
                const HARVESTING_RESOURCE_COUNT = 8;

                // TODO - should resources use perimeter?
                switch(moveTowardsUnit(target, HARVESTING_DISTANCE)) {
                case 'Unreachable':
                    clearCurrentCommand();
                    break;
                case 'ReachedTarget':
                    if (hc.harvestingProgress >= hc.harvestingTime) {
                        hc.resourcesCarried = HARVESTING_RESOURCE_COUNT;
                        // TODO - reset harvesting at any other action
                        // maybe i could use some "exit state function"?
                        hc.harvestingProgress = 0;
                    } else {
                        unit.state.action = 'Harvesting';
                        hc.harvestingProgress += dt;
                    }
                    break;
                }
            } else {
                // TODO include building&unit size in this distance
                const DROPOFF_DISTANCE = 1;
                // TODO cache the dropoff base
                // TODO - resource dropoff component
                const target = findClosestUnitBy(u => 
                    u.owner === unit.owner &&
                    u.kind === 'Base'
                );

                if (!target) {
                    // no bases to carry resources to; unlikely but possible
                    break;
                }

                switch(moveTowardsUnit(target, DROPOFF_DISTANCE)) {
                case 'Unreachable':
                    // TODO if closest base is unreachable maybe try next one?
                    clearCurrentCommand();
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
                clearCurrentCommand();
                break;
            }

            if (!p.productionState) {
                const numberOfPlayerUnits = g.units.filter(u => u.owner === unit.owner).length;
                if (numberOfPlayerUnits >= MAX_PLAYER_UNITS) {
                    console.info("[game] Unit orderded to produce but maximum unit count reached");
                    clearCurrentCommand();
                    break;
                }

                const utp = p.unitsProduced.find(up => up.unitType == cmd.unitToProduce);
                if (!utp) {
                    console.info("[game] Unit orderded to produce but it can't produce this unit type");
                    clearCurrentCommand();
                    break;
                }

                const cost = utp.productionCost;

                if (cost > owner.resources) {
                    console.info("[game] Unit ordered to produce but player doesn't have enough resources");
                    clearCurrentCommand();
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

            const refPos = getUnitReferencePosition(unit);
            const producedUnitPosition = { x: refPos.x, y: refPos.y+4 };

            if (p.productionState.timeLeft < 0) {
                // TODO - automatic counter
                g.lastUnitId += 1;
                g.units.push(createUnit(
                    g.lastUnitId,
                    unit.owner,
                    p.productionState.unitType,
                    producedUnitPosition,
                ));

                // TODO - build queue
                clearCurrentCommand();
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

                const getBuildingComponentFromUnitData = (ud: UnitData) => {
                    return ud.find(c => c.type === 'Building') as Building;
                };

                const buildingComponent = getBuildingComponentFromUnitData(buildingData);
                if (!buildingComponent)
                    throw "[game] Unit ordered to build something that's not a building: " + cmd.building;

                if (!isBuildPlacementOk(g.board.map, g.units, buildingComponent, cmd.position))
                    throw "[game] Unit ordered to build but some tiles are obscured";

                // the buildings are pretty large, so the worker should go towards the center
                // TODO is there a way to use getUnitReferencePosition here for consistency?
                const buildingSize = buildingComponent.size;
                const middleOfTheBuilding = V.sumScalar(cmd.position, buildingSize/2);
                // and is able to build once they reach the perimeter
                const buildingDistance = buildingComponent.size / 2 + 1;

                switch(moveTowardsPoint(middleOfTheBuilding, buildingDistance)) {
                case 'Unreachable':
                    throw "[game] Unit ordered to build but location is unreachable.";

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
                    clearCurrentCommand();
                    break;
                }
                break;
            }
            catch(e) {
                console.info(e);
                clearCurrentCommand();
                break;
            }
            break;
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

