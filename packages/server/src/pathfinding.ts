import { GameMap, TilePos, Position, Unit, BuildingMap } from './types'
import FastPriorityQueue from 'fastpriorityqueue'
import { distance } from './vector.js'

type TilePosPath = TilePos[];
type Path = Position[];

export function pathFind(
    start: Position,
    target: Position,
    closeEnoughToTarget: (p: Position) => boolean,
    m: GameMap,
    buildings: BuildingMap
): Path | undefined {
    const startTilePos = { x: Math.floor(start.x), y: Math.floor(start.y) };
    const targetTilePos = { x: Math.floor(target.x), y: Math.floor(target.y) };
    const path = gridPathFind(startTilePos, targetTilePos, closeEnoughToTarget, m, buildings);

    if (!path) {
        console.log("[pathfinding] Path not found")
        return;
    }

    const cleanedPath = cleanupPath(path);  // remove redundant nodes
    cleanedPath.pop();                      // remove last grid tile to avoid backtracking
    cleanedPath.push(target);               // add the precise destination as the last step
    return cleanedPath;
};


// A*

// the issue with this function is that the center of the building is
// inside of the building, so i can't path inside of it

function gridPathFind(
    start: TilePos,
    target: TilePos,
    closeEnoughToTarget: (tp: TilePos) => boolean,
    m: GameMap,
    buildings: BuildingMap
): TilePosPath | undefined  {
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

    const isTileWithinBounds = (t: TilePos) => t.x > 0 && t.y > 0 && t.x < m.w && t.y < m.h;

    // this is necessary because path lies on edges of tiles, not through the middle
    // this check verifies the "width" of the path to be 2
    // TODO different sizes for different units?
    const isClearAroundTile = (t: TilePos) => {
        const locations = [
            explode(t),
            explode({x: t.x,   y: t.y-1}),
            explode({x: t.x-1, y: t.y}),
            explode({x: t.x-1, y: t.y-1})
        ];

        return ! locations.some(t => m.tiles[t] !== 0 || buildings.get(t));
    };

    let pathFinish = undefined;
    while (!q.isEmpty()) {
        const [current, v] = q.poll() as [TilePos, number]; // TODO this `as` looks like a bug in pqueue typing

        // Check when finished
        if (closeEnoughToTarget(current)) {
            pathFinish = current;
            break;
        }

        const options = 
            getSurroundingPos(current)
            .filter(t => isTileWithinBounds(t))
            .filter(t => isClearAroundTile(t));

        for (let next of options) {
            // detect if moving diagonally
            const stepCost =
                (next.x === current.x || next.y === current.y)
                ? 1
                : Math.SQRT2;

            // costSoFar will always contain this element here
            const newCost = costSoFar.get(current)! + stepCost;
            const costOfNext = costSoFar.get(next);

            if (!costOfNext || newCost < costOfNext) {
                costSoFar.set(next, newCost);
                const priority = newCost + heuristic(next, target);
                q.add([next, priority]);

                cameFrom.set(next, current);
            }
        }
    }

    // TODO I don't think that's a correct check
    if (!pathFinish)
        return undefined;

    // Reconstruct the path from the chained map
    const path = [] as TilePos[];
    let explodedStart = explode(start);
    let current = pathFinish;

    while(explode(current) !== explodedStart) {
        path.push(current);
        // The idea is that this never fails because it represents a found path
        current = cameFrom.get(current) as TilePos;
    }

    path.reverse();

    return path;
}


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


function cleanupPath(path: TilePosPath): Path {
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
    return newPath
}