import { GameMap } from './types'

const FastPriorityQueue = require('fastpriorityqueue');


type TilePos = { x: number, y: number}

// the resolution of the game map is assumed to be 1/3 of the pathfinding grid
// this means that every pixel of the game map occupies 3 pixels of the grid

function octileDistance(a: TilePos, b: TilePos) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return dx + dy - 0.58 * Math.min(dx, dy);
}

function getSurroundingPos(p: TilePos): TilePos[] {
    return [
        {x: p.x+1, y: p.y},
        {x: p.x+1, y: p.y+1},
        {x: p.x, y: p.y+1},
        {x: p.x-1, y: p.y+1},
        {x: p.x-1, y: p.y},
        {x: p.x-1, y: p.y-1},
        {x: p.x, y: p.y-1},
        {x: p.x+1, y: p.y-1}
    ]
}

function equals(a: TilePos, b: TilePos) {
    return a.x === b.x && a.y === b.y;
}

// A*
export function gridPathFind(start: TilePos, b: TilePos, m: GameMap) {
    const comp = ([a, av]: [TilePos, number], [b,bv]: [TilePos, number]) => av < bv;
    const q = new FastPriorityQueue(comp);

    const heuristic = octileDistance;

    q.add([start, 0]);

    const cameFrom = new Map<TilePos, TilePos>();
    const costSoFar = new Map<TilePos, number>();

    cameFrom.set(start, null);
    costSoFar.set(start, 0);

    while (!q.isEmpty()) {
        const current = q.poll();

        if (equals(current, b))
            break;

        const options = getSurroundingPos(current);
        for (let next of options) {
            const newCost = costSoFar.get(current) + 1 // cost of moving one tile

            if (!costSoFar.get(next) || newCost < costSoFar.get(next)) {
                costSoFar.set(next, newCost);
                const priority = newCost + heuristic(b, next);
                q.add([next, priority]);
                cameFrom.set(next, current);
            }
        }
    }
}
