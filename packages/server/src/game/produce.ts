import { Position, Unit } from '../types'
import { getUnitReferencePosition } from './util.js'

export function findPositionForProducedUnit(unit: Unit, type: string): Position {

    const refPos = getUnitReferencePosition(unit);
    refPos.y += 4;

    // TODO implement
    return refPos;
}