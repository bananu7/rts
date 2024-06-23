import { Unit, UnitId, Position, Milliseconds, Mover, GameWithPresenceCache } from '@bananu7-rts/server/src/types'
import * as V from '../../vector.js'
import { checkMovePossibility } from '../../movement.js'
import { tilesTakenByBuilding } from '../../shared.js'
import { pathFind } from '../../pathfinding.js'

import { getUnitReferencePosition, findClosestEmptyTile, unitInteractionDistance } from '../util.js'
import { PATH_RECOMPUTE_DISTANCE_THRESHOLD, UNIT_FOLLOW_DISTANCE, MAP_MOVEMENT_TOLERANCE } from '../constants.js'

import { clearCurrentCommand, stopMoving } from './clear.js'
import { getMoveComponent, getBuildingComponent } from '../components.js'


const computePathTo = (unit: Unit, gm: GameWithPresenceCache, target: Position, closeEnough:(p: Position) => boolean): boolean => {
    unit.pathToNext = pathFind(unit.position, target, closeEnough, gm.game.board.map, gm.buildings);
    return Boolean(unit.pathToNext);
}

// Compute a path to the target and execute immediate move towards it
type MoveResult = 'ReachedTarget' | 'Moving' | 'Unreachable';
type MoveToUnitResult = MoveResult | 'TargetNonexistent';

function moveTowardsPoint(
    unit: Unit,
    target: Position,
    closeEnough:(p: Position) => boolean,
    gm: GameWithPresenceCache,
    dt: Milliseconds
): MoveResult {
    const mc = getMoveComponent(unit);
    if (!mc)
        return 'Unreachable';

    if (closeEnough(unit.position)) {
        delete unit.pathToNext;
        return 'ReachedTarget';
    }

    // If no path is computed, compute it
    if (!unit.pathToNext) {
        if (!computePathTo(unit, gm, target, closeEnough))
            return 'Unreachable';
    } else {
        // TODO this logic is a bit wonky
        const pathEmpty = unit.pathToNext.length === 0;
        if (pathEmpty) {
            if (!computePathTo(unit, gm, target, closeEnough))
                return 'Unreachable';
        } else {
            const distanceFromPathEndToTarget = V.distance(unit.pathToNext[unit.pathToNext.length-1], target);
            if (distanceFromPathEndToTarget > PATH_RECOMPUTE_DISTANCE_THRESHOLD){
                if (!computePathTo(unit, gm, target, closeEnough))
                    return 'Unreachable';
            }
        }
        // Otherwise we continue on the path that we have
    }

    // At this point we certainly have a path
    if (moveApply(unit, gm, mc, dt)) {
        return 'ReachedTarget';
    }

    unit.state.action = 'Moving';
    return 'Moving';
}

export function moveTowardsUnit(
    unit: Unit,
    target: Unit,
    tolerance: number,
    gm: GameWithPresenceCache,
    dt: Milliseconds
): MoveResult {
    const closeEnough = (p: Position) => {
        return unitInteractionDistance(unit, target, p) <= tolerance;
    };

    return moveTowardsPoint(unit, getUnitReferencePosition(target), closeEnough, gm, dt);
}

export function moveTowardsMapPosition(
    unit: Unit,
    target: Position,
    tolerance: number,
    gm: GameWithPresenceCache,
    dt: Milliseconds
): MoveResult {
    const closeEnough = (p: Position) => {
        return V.distance(target, p) < tolerance;
    };

    return moveTowardsPoint(unit, target, closeEnough, gm, dt);
}

export const moveTowardsUnitById = (unit: Unit, gm: GameWithPresenceCache, targetId: UnitId, tolerance: number, dt: Milliseconds): MoveToUnitResult => {
    const target = gm.game.units.find(u => u.id === targetId);
    if (target) {
        return moveTowardsUnit(unit, target, tolerance, gm, dt);
    } else {
        return 'TargetNonexistent';
    }
}

// attempts direct move to a point; if the point is either
// reached or unable to be reached, the command is concluded over.
export function moveToPointOrCancelCommand(unit: Unit, gm: GameWithPresenceCache, p: Position, dt: Milliseconds) {
    switch (moveTowardsMapPosition(unit, p, MAP_MOVEMENT_TOLERANCE, gm, dt)) {
        case 'Moving':
            unit.state.action = 'Moving';
            break;
        case 'ReachedTarget':
        case 'Unreachable':
            clearCurrentCommand(unit);
            break;
    }
}


// TODO - handle more than one command per tick
// requires pulling out the distance traveled so that two moves can't happen
// one after another
// Returns whether it's reached the target
const moveApply = (unit: Unit, gm: GameWithPresenceCache, mc: Mover, dt: Milliseconds) => {
    const distancePerTick = mc.speed * (dt / 1000); // speed * time in seconds = s
    if (!unit.pathToNext) {
        throw "This unit has a move command but no path computed";
    }

    // if there are no more path steps to do, we've reached the destination
    if (unit.pathToNext.length === 0) {
        // TODO - that will cause stutter at shift-clicked moves
        stopMoving(unit);
        delete unit.pathToNext;
        return true;
    }

    let target = unit.pathToNext[0];
    let targetDist = V.distance(target, unit.position);

    // Skip ONE path node if it's in reach of this ticks' movement
    if (targetDist < distancePerTick) {
        // if that node is the last, move to it ending navigation
        if (unit.pathToNext.length === 1) {
            V.vecSet(unit.velocity, V.difference(target, unit.position));
            delete unit.pathToNext;
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
    const computedDirection = checkMovePossibility(unit, gm.game.board.map, gm.presence);

    const velocity = V.mul(computedDirection, distancePerTick);

    // Velocity is the position "jump" applied to all units at once
    // TODO - slow starts and braking
    V.vecSet(unit.velocity, velocity);

    return false;
}
