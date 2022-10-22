import { GameMap, TilePos, Position, Unit } from './types'
import FastPriorityQueue from 'fastpriorityqueue'

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

class HashMap<K,V> {
    map: Map<number, V>;
    hash: (key: K) => number;

    constructor(f: (key: K) => number) {
        this.map = new Map();
        this.hash = f;
    }

    get(key: K): V | undefined {
        return this.map.get(this.hash(key));
    }

    set(key: K, value: V) {
        return this.map.set(this.hash(key), value);
    }
}

// A*
function gridPathFind(start: TilePos, b: TilePos, m: GameMap) {
    // explode converts to linear index for the purposes of map storage
    // 1-dimensional indexing and comparisons.
    const explode = (p: TilePos) => p.x+p.y*m.w; 

    const comp = ([a, av]: [TilePos, number], [b,bv]: [TilePos, number]) => av < bv;
    const q = new FastPriorityQueue(comp);

    const heuristic = octileDistance;

    q.add([start, 0]);

    const cameFrom = new HashMap<TilePos, TilePos | undefined>(explode);
    const costSoFar = new HashMap<TilePos, number>(explode);

    cameFrom.set(start, undefined);
    costSoFar.set(start, 0);

    const explodedB = explode(b);

    while (!q.isEmpty()) {
        const [current, v] = q.poll() as [TilePos, number]; // TODO this `as` looks like a bug in pqueue typing

        if (explodedB === explode(current))
            break;

        const options = 
            getSurroundingPos(current)
            .filter(e => e.x > 0 && e.y > 0 && e.x < m.w && e.y < m.h)
            .filter(e => m.tiles[explode(e)] === 0);

        for (let next of options) {
            // detect if moving diagonally
            const stepCost =
                (next.x === current.x || next.y === current.y)
                ? 1
                : 1.41421356237;

            // costSoFar will always contain this element here
            const newCost = costSoFar.get(current)! + stepCost;
            const costOfNext = costSoFar.get(next);

            if (!costOfNext || newCost < costOfNext) {
                costSoFar.set(next, newCost);
                const priority = newCost + heuristic(b, next);
                q.add([next, priority]);

                cameFrom.set(next, current);
            }
        }
    }

    // TODO I don't think that's a correct check
    if (q.isEmpty())
        return undefined;

    // Reconstruct the path from the chained map
    const path = [] as TilePos[];
    let explodedStart = explode(start);
    let current = b;

    while(explode(current) !== explodedStart) {
        path.push(current);
        // The idea is that this never fails because it represents a found path
        current = cameFrom.get(current) as TilePos;
    }

    path.reverse();

    return path;
}

export function pathFind(a: Position, b: Position, m: GameMap)  {
    const unitTilePos = { x: Math.floor(a.x), y: Math.floor(a.y) };
    const destTilePos =  { x: Math.floor(b.x), y: Math.floor(b.y) };
    const path = gridPathFind(unitTilePos, destTilePos, m);

    // improve the resulting path slightly, if found
    if (!path) {
        return;
    }

    // remove redundant nodes on straight lines
    const newPath = [];
    if (path.length > 0)
        newPath.push(path[0]);
    if (path.length > 1)
        newPath.push(path[1]);

    if (path.length >= 3) {
        const diff = { x: path[1].x - path[0].x, y: path[1].y - path[0].y};

        for (let i = 2; i < path.length; i++) {
            let dx = path[i].x - path[i-1].x;
            let dy = path[i].y - path[i-1].y;

            // the -2, -1 and 0 points lie on a line?
            if (diff.x === dx && diff.y === dy) {
                // path[i-1] (middle) can be removed
                newPath.pop();
            }

            diff.x = dx;
            diff.y = dy;
            newPath.push(path[i]);
        }
    }

    newPath.pop(); // remove last grid tile to avoid backtracking
    newPath.push(b); // add the precise destination as the last step

    return newPath;
};
