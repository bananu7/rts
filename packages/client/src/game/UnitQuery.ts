import {
   UnitId,
   Unit,
   ProductionFacility,
   Builder,
} from '@bananu7-rts/server/src/types'

import { SelectedAction } from './SelectedAction'

export function canMove(unit: Unit): Boolean {
    return Boolean(unit.components.find(c => c.type === 'Mover'));
}

// TODO: perhaps not all units can attack other units, so 
// this might need target parameter later
export function canAttack(unit: Unit): Boolean {
    return Boolean(unit.components.find(c => c.type === 'Attacker'));
}

export function canHarvest(unit: Unit): Boolean {
    return Boolean(unit.components.find(c => c.type === 'Harvester'));
}

export function canBuild(unit: Unit, building: string): Boolean {
    const builderComponent = unit.components.find(c => c.type === 'Builder') as Builder;
    if (!builderComponent)
        return false;

    return Boolean(builderComponent.buildingsProduced.find(bp => bp.buildingType === building));
}

export function canPerformSelectedAction(unit: Unit, action: SelectedAction): Boolean {
    switch (action.action) {
    case 'Move':
        return canMove(unit);
    case 'Attack':
        return canAttack(unit);
    case 'Harvest':
        return canHarvest(unit);
    case 'Build':
        return canBuild(unit, action.building);
    }
}

export type UnitStatus = 'Moving'|'Attacking'|'Harvesting'|'Idle';

export function getStatus(unit: Unit): UnitStatus {
    const actionToStatus = {
        'Attack': 'Attacking',
        'AttackMove': 'Attacking',
        'Follow': 'Moving',
        'Move': 'Moving',
        'Harvest': 'Harvesting',
        'Produce': 'Producing',
        'Build': 'Idle',
        'Stop': 'Idle',
    };

    return unit.actionState.state === 'active' ?
        (actionToStatus[unit.actionState.current.typ] as UnitStatus) :
        'Idle';
}
