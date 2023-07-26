import { Game, GameMap, TilePos, Position, Building, Unit } from './types'
import { getBuildingComponent } from './components.js'
import { notEmpty } from './tsutil.js'

export function tilesTakenByBuilding(building: Building, position: Position): TilePos[] {
    const tiles: TilePos[] = [];
    const buildingSize = building.size;

    for (let x = position.x; x < position.x + buildingSize; x += 1) {
        for (let y = position.y; y < position.y + buildingSize; y += 1) {
            tiles.push({ x, y });
        }
    }
    return tiles;
}

export function mapEmptyForBuilding(gm: GameMap, building: Building, position: Position): boolean {
    const isOnModN = (x: number, n: number) => x/n - Math.floor(x/n) === 0;

    // buildings can only be built on mod2 grid
    // TODO report this as an error condition?
    if (!isOnModN(position.x, 2) || !isOnModN(position.y, 2)) {
        return false;
    }

    const tilesToCheck = tilesTakenByBuilding(building, position);

    // TODO this is getting duplicated, maybe GameMap needs better utility functions
    const explode = (p: TilePos) => p.x+p.y*gm.w;

    const empty = ! tilesToCheck.some(t => gm.tiles[explode(t)] !== 0);
    return empty;
}

export function isBuildPlacementOk(gm: GameMap, units: Unit[], building: Building, position: Position): boolean {
    const mapEmpty = mapEmptyForBuilding(gm, building, position);
    if (!mapEmpty)
        return false;

    // TODO this should perhaps be cached?
    const buildings = units.map(u => ({ pos: u.position, bc: getBuildingComponent(u)})).filter(({pos, bc}) => bc);
    const tiles = buildings.map(({pos, bc}) => tilesTakenByBuilding(bc, pos));

    // TODO this is getting duplicated, maybe GameMap needs better utility functions
    const explode = (p: TilePos) => p.x+p.y*gm.w;
    const obscuredTiles = new Set();
    tiles
        .flat(1)
        .map(t => explode(t))
        .forEach(t => obscuredTiles.add(t));

    const desiredTiles = tilesTakenByBuilding(building, position).map(explode);

    for (const t of desiredTiles) {
        if (obscuredTiles.has(t)) 
            return false;
    }

    return true;
}
