import { Position, Unit } from '../types'
import { getUnitReferencePosition } from './util.js'

export function findPositionForProducedUnit(unit: Unit, type: string): Position {

    const refPos = getUnitReferencePosition(unit);

    // TODO implement
    return refPos;
}