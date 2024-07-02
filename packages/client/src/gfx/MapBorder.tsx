import { useRef, useLayoutEffect } from 'react'
import * as THREE from 'three';

import { tileTypeToColor, tileTypeToHeight } from './map_display'

export type MapBorderProps = {
    w: number,
    h: number,
}

export function MapBorder(props: MapBorderProps) {
    const w = props.w;
    const h = props.h;

    const borderSize = 30;

    /*

    XAAAAY
    CMMMMD
    CMMMMD
    CMMMMD
    CMMMMD
    ZBBBBW

    */

    const borderTilesCount =
        borderSize * w * 2 +            // horizontal
        borderSize * h * 2 +            // vertical
        borderSize * borderSize * 4;    // corners

    const ref = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!ref.current)
            return;

        const mat4Pos = new THREE.Matrix4();
        const vec3Color = new THREE.Color();
        const tileType = 0;

        const createRectangle = (
            off: number,
            x0: number,
            y0: number,
            x1: number,
            y1: number,
            f: (x: number, y:number) => number
        ) => {
            if (!ref.current)
                return 0;

            for (let y = 0; y < y1-y0; y++){
                for (let x = 0; x < x1-x0; x++) {
                    const ix = y*(x1-x0)+x + off;
                    const color = tileTypeToColor(tileType, vec3Color);

                    // outline darker
                    vec3Color.g *= Math.min(f(x,y), 1.0);

                    const height = tileTypeToHeight(tileType);

                    mat4Pos.makeTranslation(x + 0.5 + x0, height-9, y + 0.5 + y0);

                    ref.current.setMatrixAt(ix, mat4Pos);
                    ref.current.setColorAt(ix, vec3Color);
                }
            }

            return (y1-y0) * (x1-x0);
        };

        // TODO this code is pretty unreadable, but at least it's only called once

        const noise = new Simple1DNoise();
        noise.setAmplitude(1)
        noise.setScale(0.05)

        const fadeoff = (f: number, noiseVar: number) => {
            return Math.pow(f, 2) * (1 + Math.pow(noise.getVal(noiseVar), 2));
        }

        let off = 0;
        //top
        off += createRectangle(off, 0, -borderSize, w, 0, (x,y) => fadeoff(y/borderSize, x));
        //bottom
        off += createRectangle(off, 0, h, w, h+borderSize, (x,y) => fadeoff((borderSize-y)/borderSize, x));
        // left
        off += createRectangle(off, -borderSize, 0, 0, h, (x,y) => fadeoff(x/borderSize, y));
        //right
        off += createRectangle(off, w, 0, w+borderSize, h, (x,y) => fadeoff((borderSize-x)/borderSize, y));

        // top-left
        off += createRectangle(off, -borderSize, -borderSize, 0, 0,
            (x,y) => {
                const xi = borderSize-x;
                const yi = borderSize-y;

                const r = Math.max(1 - Math.sqrt(xi*xi+yi*yi)/Math.sqrt(borderSize*borderSize), 0);
                const a = Math.atan2(y, x);

                return fadeoff(r, a);
            }
        );

        // top-right
        off += createRectangle(off, w, -borderSize, w+borderSize, 0,
            (x,y) => {
                const xi = x;
                const yi = borderSize-y;

                const r = Math.max(1 - Math.sqrt(xi*xi+yi*yi)/Math.sqrt(borderSize*borderSize), 0);
                const a = Math.atan2(y, x);

                return fadeoff(r, a);
            }
        );

        // bottom-left
        off += createRectangle(off, -borderSize, h, 0, h+borderSize,
            (x,y) => {
                const xi = borderSize-x;
                const yi = y;

                const r = Math.max(1 - Math.sqrt(xi*xi+yi*yi)/Math.sqrt(borderSize*borderSize), 0);
                const a = Math.atan2(y, x);

                return fadeoff(r, a);
            }
        );

        // bottom-right
        off += createRectangle(off, w, h, w+borderSize, h+borderSize,
            (x,y) => {
                const xi = x;
                const yi = y;

                const r = Math.max(1 - Math.sqrt(xi*xi+yi*yi)/Math.sqrt(borderSize*borderSize), 0);
                const a = Math.atan2(y, x);

                return fadeoff(r, a);
            }
        );
        

        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    }, [props.w, props.h])

    return (
        <instancedMesh
            name="Map border mesh"
            ref={ref}
            args={[undefined, undefined, w*h]}
            receiveShadow
        >
            <boxGeometry args={[1, 20, 1]} />
            <meshStandardMaterial />
        </instancedMesh>
    );
}


const MAX_VERTICES = 256;
class Simple1DNoise {
    vertices: number;
    mask: number;
    amplitude = 1;
    scale = 1;

    r: number[] = [];

    constructor(vertices: number = MAX_VERTICES) {
        this.vertices = vertices;
        this.mask = vertices - 1;

        for (let i = 0; i < this.vertices; ++i) {
            this.r.push(Math.random());
        }
    }

    getVal(x: number): number {
        const scaledX = x * this.scale;
        const xFloor = Math.floor(scaledX);
        const t = scaledX - xFloor;
        const tRemapSmoothstep = t * t * ( 3 - 2 * t );

        /// Modulo using &
        const xMin = xFloor & this.mask;
        const xMax = ( xMin + 1 ) & this.mask;

        const y = Simple1DNoise.lerp( this.r[ xMin ], this.r[ xMax ], tRemapSmoothstep );

        return y * this.amplitude;
    };

    private static lerp(a: number, b: number, t: number): number {
        return a * ( 1 - t ) + b * t;
    };

    setAmplitude(newAmplitude: number) {
        this.amplitude = newAmplitude;
    }

    setScale(newScale: number) {
        this.scale = newScale;
    }
}