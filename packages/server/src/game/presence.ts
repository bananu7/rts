import {
    Unit, Board, PresenceMap, BuildingMap, TilePos, Position,
} from '../types'

import { tilesTakenByBuilding } from '../shared.js'

import {
    getBuildingComponent
} from './components'

// The purpose of presence map is easy finding of nearby enemies
// The purpose of building map is to pass it to pathfinding to prevent pathing
// on tiles taken by buildings
export function buildPresenceAndBuildingMaps(units: Unit[], board: Board): [PresenceMap, BuildingMap] {
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
