import { Position, Unit, Command, Component, Game, BuildingMap, PresenceMap } from '../types'
import { getHpComponent, getMoveComponent, getAttackerComponent, getHarvesterComponent, getProducerComponent, getBuilderComponent, getVisionComponent, getBuildingComponent } from './components.js'
import * as V from '../vector.js'
import { tilesTakenByBuilding } from '@bananu7-rts/server/src/shared.js'

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

const generateLayer = (n: number): [number, number][] => {
    const res: [number, number][] = [];
    // CCW order

    /*
        #0
        .....
        .....
        ..P..
        .....
        .....

        #1
        .....
        .TTT.
        .LPR.
        .BBB.
        .....

        #2
         <<<

        TTTTT
        L...R  ^
        L.P.R  ^
        L...R  ^
        BBBBB

         >>>
    */

    // bottom
    for (let x = -n; x <= n; x += 1) {
        res.push([x, n]);
    }
    // right
    for (let y = n-1; y >= -n+1; y -= 1) {
        res.push([n, y]);
    }
    // top
    for (let x = n; x >= -n; x -= 1) {
        res.push([x, -n]);
    }
    // left
    for (let y = -n+1; y <= n-1; y += 1) {
        res.push([-n, y]);
    }
    return res;
}

const CONCENTRIC_LAYERS = ([[0,0]]).concat(
    generateLayer(1),
    generateLayer(2),
    generateLayer(3),
    generateLayer(4),
    generateLayer(5),
    generateLayer(6),
    generateLayer(7),
    generateLayer(8),
);


export function concentric(p: Position, i: number): Position | undefined {
    if (i < CONCENTRIC_LAYERS.length) {
        return { x: CONCENTRIC_LAYERS[i][0] + p.x, y: CONCENTRIC_LAYERS[i][1] + p.y };
    } else {
        return undefined;
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

export function unitDistance(a: Unit, b: Unit): number {
     // TODO for buildings it should use perimeter instead of reference?
    const aPos = getUnitReferencePosition(a);
    const bPos = getUnitReferencePosition(b);
    return V.distance(aPos, bPos);
}

export function attackerToTargetDistance(attacker: Unit, target: Unit): number {
    const aPos = getUnitReferencePosition(attacker);
    const bc = getBuildingComponent(target);
    if (!bc) {
        return V.distance(aPos, getUnitReferencePosition(target));
    } else {
        const tiles = tilesTakenByBuilding(bc, target.position);
        const tileDistances = tiles.map(t => V.distance(t as Position, aPos));
        return Math.min(...tileDistances);
    }
}

export function findClosestEmptyTile(
    g: Game,
    position: Position,
    presence: PresenceMap,
    buildings: BuildingMap
): Position | undefined {
    const MAX_POSITIONS_TO_CHECK = 100;

    const pos = {
        x: Math.floor(position.x),
        y: Math.floor(position.y)
    };

    // TODO - duplicated logic
    const explode = (p: Position) => Math.floor(p.x)+Math.floor(p.y)*g.board.map.w;

    for (let i = 0; i < MAX_POSITIONS_TO_CHECK; i++) {
        const p = concentric(pos, i);
        if (!p) {
            return undefined;
        }

        const noBuilding = ! buildings.has(explode(p));
        const noUnit = ! presence.has(explode(p));

        if (noBuilding && noUnit) {
            return p;
        }
    }

    return undefined;
}
