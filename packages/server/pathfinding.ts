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

    get(key: K): V {
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

    const cameFrom = new HashMap<TilePos, TilePos>(explode);
    const costSoFar = new HashMap<TilePos, number>(explode);

    cameFrom.set(start, null);
    costSoFar.set(start, 0);

    const explodedB = explode(b);

    while (!q.isEmpty()) {
        const [current, v] = q.poll();

        if (explodedB === explode(current))
            break;

        const options = 
            getSurroundingPos(current)
            .filter(e => e.x > 0 && e.y > 0 && e.x < m.w && e.y < m.h)
            .filter(e => m.tiles[explode(e)] === 0);

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

    // TODO I don't think that's a correct check
    if (q.isEmpty())
        return undefined;

    // Reconstruct the path from the chained map
    const path = [] as TilePos[];
    let explodedStart = explode(start);
    let current = b;

    while(explode(current) !== explodedStart) {
        path.push(current);
        current = cameFrom.get(current);
    }

    path.reverse();

    return path;
}

export function pathFind(a: Position, b: Position, m: GameMap)  {
    const unitTilePos = { x: Math.floor(a.x), y: Math.floor(a.y) };
    const destTilePos =  { x: Math.floor(b.x), y: Math.floor(b.y) };
    const path = gridPathFind(unitTilePos, destTilePos, m);

    // improve the resulting path slightly, if found
    if (path) {
        path.pop(); // remove last grid tile to avoid backtracking
        path.push(b); // add the precise destination as the last step
    }

    return path;
};
