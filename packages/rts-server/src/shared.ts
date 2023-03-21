import { GameMap, TilePos, Position } from './types'

export function mapEmptyForBuilding(gm: GameMap, buildingSize: number, position: Position): boolean {
    const isOnModN = (x: number, n: number) => x/n - Math.floor(x/n) === 0;

    // buildings can only be built on mod2 grid
    // TODO report this as an error condition?
    if (!isOnModN(position.x, 2) || !isOnModN(position.y, 2)) {
        console.info('[game] Desired building position not on mod2', position);
        return false;
    }

    const tilesToCheck: TilePos[] = [];
    for (let x = position.x; x < position.x + buildingSize; x += 1) {
        for (let y = position.y; y < position.y + buildingSize; y += 1) {
            tilesToCheck.push({ x, y });
        }
    }

    // TODO this is getting duplicated, maybe GameMap needs better utility functions
    const explode = (p: TilePos) => p.x+p.y*gm.w;

    const empty = ! tilesToCheck.some(t => gm.tiles[explode(t)] !== 0);
    return empty;
}
