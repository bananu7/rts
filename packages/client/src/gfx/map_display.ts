import * as THREE from 'three';

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
