import { GameMap } from './types'
import FastPriorityQueue from 'fastpriorityqueue'

export type TilePos = { x: number, y: number}

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
    type ExplodedTilePos = number; // js cannot use composite values as keys
    const explode = (p: TilePos) => p.x+p.y*m.w; // what an absolute garbage
    const unexplode = (e: number) => { return {x: e % m.w, y: Math.floor(e / m.w) }}

    const comp = ([a, av]: [ExplodedTilePos, number], [b,bv]: [ExplodedTilePos, number]) => av < bv;
    const q = new FastPriorityQueue(comp);

    const heuristic = octileDistance;

    q.add([explode(start), 0]);

    const cameFrom = new Map<ExplodedTilePos, ExplodedTilePos>();
    const costSoFar = new Map<ExplodedTilePos, number>();

    cameFrom.set(explode(start), null);
    costSoFar.set(explode(start), 0);

    const explodedB = explode(b);

    while (!q.isEmpty()) {
        const [current, v] = q.poll();

        if (explodedB === current)
            break;

        const options = getSurroundingPos(unexplode(current)).map(explode);
        for (let next of options) {
            const newCost = costSoFar.get(current) + 1 // cost of moving one tile

            if (!costSoFar.get(next) || newCost < costSoFar.get(next)) {
                costSoFar.set(next, newCost);
                const priority = newCost + heuristic(b, unexplode(next));
                q.add([next, priority]);

                cameFrom.set(next, current);
            }
        }
    }

    // Reconstruct the path from the chained map
    const path = [] as TilePos[];
    let explodedStart = explode(start);
    let current = explodedB;

    while(current !== explodedStart) {
        path.push(unexplode(current));
        current = cameFrom.get(current);
    }

    path.reverse();

    return path;
}
