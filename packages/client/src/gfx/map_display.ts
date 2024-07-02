import * as THREE from 'three';
import { GameMap } from '@bananu7-rts/server/src/types'

export function explode(map: GameMap, x: number, y: number): number {
    return y*map.w+x;
}

export function mapColor(map: GameMap, x: number, y: number, vec3Color: THREE.Color) {
    const ix = explode(map, x, y);
    const tileType = map.tiles[ix];

    let factor = 0.0;
    if (x > 0 && map.tiles[explode(map,x-1,y)] > 0)
        factor += 0.2;
    if (x < map.w && map.tiles[explode(map,x+1,y)] > 0)
        factor += 0.2;
    if (y > 0 && map.tiles[explode(map,x,y-1)] > 0)
        factor += 0.2;
    if (y > 0 && map.tiles[explode(map,x,y+1)] > 0)
        factor += 0.2;

    tileTypeToColor(tileType, vec3Color);
    if (tileType == 0) {
        vec3Color.r += factor;
        //vec3Color.g *= 1 - factor * 0.5;
    }
}

export function tileTypeToColor(tileType: number, vec3Color: THREE.Color) {
    const isPassable = tileType === 0;    

    switch (tileType) {
        case 0: {
            const color = 0x11aa11;
            vec3Color.set(color);
            const f = 0.06;
            vec3Color.r += (Math.random() - 0.5) * f;
            vec3Color.g += (Math.random() - 0.5) * f;
            vec3Color.b += (Math.random() - 0.5) * f;
            break;
        }

        case 2: {
            const color = 0x3377cc;
            vec3Color.set(color);
            const f = 0.06;
            vec3Color.r += (Math.random() - 0.5) * f;
            vec3Color.g += (Math.random() - 0.5) * f;
            vec3Color.b += (Math.random() - 0.5) * f;
            break;
        }

        case 1:
        default: {
            const color = 0x888888;
            vec3Color.set(color);
            const d = (Math.random() - 0.5) * 0.1;
            vec3Color.r += d;
            vec3Color.g += d;
            vec3Color.b += d;
        }
    }
}


export function mapHeight(map: GameMap, x: number, y: number): number {
    const ix = explode(map, x, y);
    const tileType = map.tiles[ix];
    return tileTypeToHeight(tileType);
}

export function tileTypeToHeight(tileType: number): number {
    const correction = 0.001;
    switch (tileType) {
    case 0:
        return 0 - correction;

    case 2:
        return -0.5 - Math.random() * 0.7 - correction

    case 1:
    default:
        return 0.8 + Math.random() * 4.7 - correction;
    }
}
