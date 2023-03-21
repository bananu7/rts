import {
   UnitId,
   Unit,
   UnitState,
   ProductionFacility,
   Builder,
} from 'rts-server/src/types'

import { SelectedAction } from './SelectedAction'

export function canMove(unit: UnitState | Unit): Boolean {
    return Boolean(unit.components.find(c => c.type === 'Mover'));
}

// TODO: perhaps not all units can attack other units, so 
// this might need target parameter later
export function canAttack(unit: UnitState | Unit): Boolean {
    return Boolean(unit.components.find(c => c.type === 'Attacker'));
}

export function canHarvest(unit: UnitState | Unit): Boolean {
    return Boolean(unit.components.find(c => c.type === 'Harvester'));
}

export function canBuild(unit: UnitState | Unit, building: string): Boolean {
    const builderComponent = unit.components.find(c => c.type === 'Builder') as Builder;
    if (!builderComponent)
        return false;

    return Boolean(builderComponent.buildingsProduced.find(bp => bp.buildingType === building));
}

export function canPerformSelectedAction(unit: UnitState | Unit, action: SelectedAction): Boolean {
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