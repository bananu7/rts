import { 
    Unit, UnitId, Milliseconds, PlayerState, GameWithPresenceCache,
    Hp, Mover, Attacker, Harvester, ProductionFacility, Builder, Vision, Building, Component
} from '../../types'

import * as V from '../../vector.js'
import { MAP_MOVEMENT_TOLERANCE, MAXIMUM_IDLE_AGGRO_RANGE, ATTACK_RANGE_COMPENSATION } from '../constants.js'
import { checkMovePossibility } from '../../movement.js'

import { clearCurrentCommand, stopMoving } from './clear.js'
import { moveTowardsUnit, moveTowardsMapPosition } from './movement.js'
import { getHpComponent, getMoveComponent, getAttackerComponent, getHarvesterComponent, getProducerComponent, getBuilderComponent, getVisionComponent, getBuildingComponent } from '../components.js'
import { getUnitReferencePosition, unitInteractionDistance } from '../util.js'

export const cancelProduction = (unit: Unit, owner: PlayerState) => {
    const p = unit.components.find(c => c.type === "ProductionFacility") as ProductionFacility | undefined;
    if (p && p.productionState) {
        // refund
        console.log(`[game] Refunding production cost from unit ${unit.id}`);
        owner.resources += p.productionState.originalCost;
        p.productionState = undefined;
    }
}

const getUnitReferencePositionById = (unit: Unit, units: Unit[], targetId: UnitId) => {
    const target = units.find(u => u.id === targetId); // TODO Map
    if (target)
        return getUnitReferencePosition(target);
    else
        return;
}

// TODO - presence cache
export const findClosestUnitBy = (unit: Unit, units: Unit[], p: (u: Unit) => boolean) => {
    const unitsFiltered = units.filter(p);

    if (unitsFiltered.length === 0) {
        return;
    }

    unitsFiltered.sort((a: Unit, b: Unit) => unitInteractionDistance(unit, a) - unitInteractionDistance(unit, b));
    
    return unitsFiltered[0];
}

export const detectNearbyEnemy = (unit: Unit, units: Unit[]) => {
    const vision = getVisionComponent(unit);
    if (!vision) {
        return;
    }

    // TODO query range for optimizations
    const target = findClosestUnitBy(unit, units, u => 
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

export const aggro = (unit: Unit, gm: GameWithPresenceCache, ac: Attacker, target: Unit, dt: Milliseconds) => {
    // first let the movement system do its thing
    const movementTolerance = ac.range - ATTACK_RANGE_COMPENSATION;
    if (moveTowardsUnit(unit, target, movementTolerance, gm, dt) === 'ReachedTarget') {
        // if it gives us a proper position, we can attack
        unit.state.action = 'Attacking';
        const targetPos = getUnitReferencePosition(target);
        unit.direction = V.angleFromTo(unit.position, targetPos);
        attemptDamage(ac, target);
    }
    // in any other case we can't do much else
}

export const updatePassiveCooldowns = (unit: Unit, dt: Milliseconds) => {
    const ac = getAttackerComponent(unit);
    if (ac) {
        ac.cooldown -= dt;
        if (ac.cooldown < 0)
            ac.cooldown = 0;
    }
}

export const idle = (unit: Unit, gm: GameWithPresenceCache, dt: Milliseconds): boolean => {
    if (unit.state.state !== 'idle') {
        return false;
    }

    const ac = getAttackerComponent(unit);

    // TODO run away when attacked
    if (!ac) {
        return true;
    }

    const target = detectNearbyEnemy(unit, gm.game.units); 
    if (!target) {
        // try to return to the idle position;
        // if it's close enough, it shouldn't start moving at all
        moveTowardsMapPosition(unit, unit.state.idlePosition, MAP_MOVEMENT_TOLERANCE, gm, dt);
        return true;
    }

    // TODO: hysteresis
    const distanceFromIdle = V.distance(unit.position, unit.state.idlePosition);
    if (distanceFromIdle < MAXIMUM_IDLE_AGGRO_RANGE){
        aggro(unit, gm, ac, target, dt);
    } else {
        moveTowardsMapPosition(unit, unit.state.idlePosition, MAP_MOVEMENT_TOLERANCE, gm, dt);
    }

    return true;
}
