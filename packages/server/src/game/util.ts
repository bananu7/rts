import { Position, Unit, Command, Component } from '../types'
import { getHpComponent, getMoveComponent, getAttackerComponent, getHarvesterComponent, getProducerComponent, getBuilderComponent, getVisionComponent, getBuildingComponent } from './components.js'

// This code generates an offset position for a given spiral index
export function spiral(p: Position, i: number, scale: number) {
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

export function willAcceptCommand(unit: Unit, command: Command) {
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

export function getUnitReferencePosition(target: Unit): Position {
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
