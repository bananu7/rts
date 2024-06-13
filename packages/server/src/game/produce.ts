import { Position, Unit, Game, PresenceMap, BuildingMap } from '../types'
import { getUnitReferencePosition, findClosestEmptyTile } from './util.js'

export function findPositionForProducedUnit(
    g: Game,
    unit: Unit,
    type: string,
    presence: PresenceMap,
    buildings: BuildingMap
): Position | undefined {
    const refPos = getUnitReferencePosition(unit);
    const pos = findClosestEmptyTile(g, refPos, presence, buildings);

    if (!pos)
        return;

    // position in the middle of a tile
    pos.x += 0.5;
    pos.y += 0.5;

    return pos;
}