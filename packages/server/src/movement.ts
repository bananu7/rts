import {
    GameMap, Game, PlayerIndex, Unit, UnitId, Component, Position, TilePos, PresenceMap, BuildingMap,
    Hp, Mover, Attacker, Harvester, ProductionFacility, Builder, Vision,
    Command, CommandFollow, CommandAttack,
} from './types';
import { getBuildingComponent } from './game/components.js'

import * as V from './vector.js'
import { notEmpty } from './tsutil.js'

export function checkMovePossibility(unit: Unit, gm: GameMap, presence: PresenceMap): Position {
    const currentPos = unit.position;
    unit.debug ??= {};

    const explode = (p: TilePos) => p.x+p.y*gm.w; 

    // Disable collisions for harvesting units
    if (unit.state.state === 'active' &&
        unit.state.current.typ === 'Harvest'
    ) {
        let velocity = {
            x: Math.cos(unit.direction),
            y: -Math.sin(unit.direction)
        };
        return velocity;
    }

    const allTilesInfluenced = createTilesInfluenced(currentPos, 1, gm);
    const otherUnitsNearby =
        allTilesInfluenced
        .map(t => presence.get(explode(t)))
        .map(ps => ps ?? [])
        .flat(2)
        .filter(u => u.id !== unit.id);


    let obstacles: Obstacle[] = [];
    // build the view horizon
    for (const u of otherUnitsNearby) {
        // todo establish real radius
        const radius = 1;

        const relativePos = V.difference(u.position, currentPos); //relative pos of enemy unit
        const distance = V.magnitude(relativePos);

        if (distance > 6)
            continue;

        const alpha = 
            radius < distance
            ? 2 * Math.asin(radius / distance)
            : 2; // units squished together

        const beta = Math.atan2(-relativePos.y, relativePos.x);

        const a0 = wrap360(beta - alpha/2);
        const a1 = wrap360(beta + alpha/2);

        if (a0 < a1) {
            obstacles = updateObstacles([a0, a1], obstacles);
        }
        else {
            if (a1 !== 0)
                obstacles = updateObstacles([0, a1], obstacles);
            if (a0 != Math.PI * 2)
                obstacles = updateObstacles([a0, Math.PI * 2], obstacles);
        }
    }
    unit.debug.obstacles = obstacles;

    // propose steering basing on gaps in visible units
    const d = unit.direction;
    const nearestGapAngle = (() => {
        obstacles.sort(([a,b], [c,d]) => a-c);

        // see if current direction is blocked
        const o = obstacles.find(o => overlap(o, [d, d]));
        // if yes, aim for its edge
        // TODO consider own size instead of EXTRA_TURN
        if (o) {
            const EXTRA_TURN = 0.1;
            return Math.abs(o[0] - d) < Math.abs(o[1] - d)
                    ? o[0]-EXTRA_TURN
                    : o[1]+EXTRA_TURN;
        } else {
            return d;
        }
    })();
    
    let separation = {x:0, y:0};
    for (const u of otherUnitsNearby) {
        // Don't use separation force on buildings
        if (getBuildingComponent(u))
            continue;

        const MAX_LOCAL_SEPARATION_FORCE = 2;
        const SEPARATION_OVERCOMP = 1.05; // overcompensation for separation distance

        let localSeparation = V.difference(currentPos, u.position);    
        const distance = V.magnitude(localSeparation);

        // TODO real sizes or buildings which are square
        const myOwnRadius = 1;
        const otherUnitRadius = 1;

        if (distance > (myOwnRadius + otherUnitRadius) * SEPARATION_OVERCOMP)
            continue;

        // the force gets stronger the closer it is
        const distanceFactor = distance > 0.00001 ? 0.2 / distance : MAX_LOCAL_SEPARATION_FORCE; // avoid zero distance issues
        localSeparation.x *= distanceFactor;
        localSeparation.y *= distanceFactor;

        // clamp the local force to avoid very high impulses at close passes
        localSeparation = V.clamp(localSeparation, MAX_LOCAL_SEPARATION_FORCE);
        separation = V.sum(separation, localSeparation);

        // push other unit apart (but only if it can move)
        
        //if (u.components.find(c => c.type === 'Mover')) {
        //    u.position.x -= localSeparation.x;
        //    u.position.y -= localSeparation.y;
        //}
    }

    // limit maximum    
    const MAX_SEPARATION_FORCE = 3;
    separation = V.clamp(separation, MAX_SEPARATION_FORCE);

    // push off of terrain
    const TERRAIN_AVOIDANCE_RADIUS = 1.5;
    const MAX_TERRAIN_AVOIDANCE_FORCE = 1;
    let terrainAvoidance = {x: 0, y:0};
    unit.debug.terrainAvoidanceForces = [];
    {
        const terrainNearby =
            allTilesInfluenced
            .map(t => gm.tiles[explode(t)] !== 0 ? t : undefined)
            .filter(notEmpty);
        unit.debug.terrainNearby = terrainNearby;

        for (const t of terrainNearby) {
            const centerOfTile = {x: t.x + 0.5, y: t.y + 0.5};
            const diff = V.difference(currentPos, centerOfTile);
            const distance = V.magnitude(diff);

            // TODO radius etc
            if (distance > TERRAIN_AVOIDANCE_RADIUS) {
                continue;
            }

            // convert to unit vector
            const force = {
                x: diff.x / distance,
                y: diff.y / distance,
            };

            // TODO crude approximation of linear falloff for my sanity
            if (distance < 0.5) {
                V.scalarMul(force, 2)
            }
            else if (distance < 1){
                V.scalarMul(force, 1.2)
            }
            else {
                V.scalarMul(force, 0.5)
            }

            unit.debug.terrainAvoidanceForces.push(force);
            V.vecAdd(terrainAvoidance, force);
        }
    }
    terrainAvoidance = V.clamp(terrainAvoidance, MAX_TERRAIN_AVOIDANCE_FORCE);
    unit.debug.terrainAvoidance = terrainAvoidance;

    const gapDirection = {
        x: Math.cos(nearestGapAngle),
        y: -Math.sin(nearestGapAngle)
    };

    const resultDirection = V.weightedDirectionCombine([
        {v: gapDirection,       e: 0.6},
        {v: separation,         e: 0.3},
        {v: terrainAvoidance,   e: 0.1},
    ]);
    return resultDirection;
}

const wrap360 = (x: number) => {
    while (x < 0) {
        x += Math.PI*2;
    }
    while (x > Math.PI*2) {
        x -= Math.PI*2;
    }
    return x;
}

function partition<T> (a: T[], f: (t: T) => boolean): [T[], T[]] {
    const good = [];
    const bad = [];
    for (var i = 0; i < a.length; i++)
        if (f(a[i]))
            good.push(a[i]);
        else
            bad.push(a[i]);
    return [good, bad]
}


// TODO duplication with pathfinding
function getSurroundingPos(p: TilePos, gm: GameMap): TilePos[] {
    const SCAN_SIZE = 5;

    const tiles = [];
    for (let x = p.x - SCAN_SIZE; x < p.x + SCAN_SIZE; x ++) {
        for (let y = p.y - SCAN_SIZE; y < p.y + SCAN_SIZE; y ++) {
            // TODO map size
            if (x < 0 || y < 0 || x >= gm.w || y >= gm.h)
                continue;

            tiles.push({x,y});
        }
    }

    return tiles;
}

// TODO use size
function createTilesInfluenced(pos: Position, size: number, gm: GameMap) {
    const result = [];
    const tile = { x: Math.floor(pos.x), y: Math.floor(pos.y) };

    // TODO - incorrect, should actually find all affected tiles
    // depending on the size
    const surrounding = getSurroundingPos(tile, gm);
    surrounding.push(tile);
    return surrounding;
}

// Obstacle avoidance/horizon stuff
type Obstacle = [number, number];

const overlap = ([a,b]: Obstacle, [c,d]: Obstacle) => {
    return a <= d && b >= c;
}

function updateObstacles(p: Obstacle, obstacles: Obstacle[]) {
    if (p[1] <= p[0]) {
        throw "Only positive spans smaller than 180 accepted"
    }

    const merge = (os: Obstacle[], newO: Obstacle): Obstacle => {
        if (os.length == 0){
            return newO;
        }
        const min = Math.min(os[0][0], newO[0]);
        const max = Math.max(os[os.length - 1][1], newO[1]);
        return [min, max];
    }

    // find all obstacles that have at least partial overlap with the new one
    const [overlapping, rest] = partition(obstacles, o => overlap(o, p));

    // replace them all with one that covers that section
    const merged = merge(overlapping, p);
    rest.push(merged);

    return rest;
}
