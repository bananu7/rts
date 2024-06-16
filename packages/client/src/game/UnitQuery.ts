import {
   UnitId,
   Unit,
   ProductionFacility,
   Builder,
   CommandBuild,
   Building,
} from '@bananu7-rts/server/src/types'
import { getUnitDataByName } from '@bananu7-rts/server/src/game/units'

import { SelectedCommand } from './SelectedCommand'

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

export function canPerformSelectedCommand(unit: Unit, command: SelectedCommand): Boolean {
    switch (command.command) {
    case 'Move':
        return canMove(unit);
    case 'Attack':
        return canAttack(unit);
    case 'Harvest':
        return canHarvest(unit);
    case 'Build':
        return canBuild(unit, command.building);
    }
}

export function getBuildingSizeFromBuildingName(name: string): number {
    const unitData = getUnitDataByName(name);

    if (!unitData)
        throw new Error("No unit data for the build command building");

    // TODO component finding doesn't work on UnitData :(
    const buildingComponent = unitData.find(c => c.type === 'Building') as Building;
    if (!buildingComponent)
        throw new Error("Build command target unit data doesn't have a Building component");

    return buildingComponent.size;
}
