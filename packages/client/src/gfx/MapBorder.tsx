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
                    vec3Color.g *= Math.abs(f(x,y));

                    const height = tileTypeToHeight(tileType);

                    mat4Pos.makeTranslation(x + 0.5 + x0, height-9, y + 0.5 + y0);

                    ref.current.setMatrixAt(ix, mat4Pos);
                    ref.current.setColorAt(ix, vec3Color);
                }
            }

            return (y1-y0) * (x1-x0);
        };

        // TODO this code is pretty unreadable, but at least it's only called once

        let off = 0;
        //top
        off += createRectangle(off, 0, -borderSize, w, 0, (x,y) => y/borderSize);
        //bottom
        off += createRectangle(off, 0, h, w, h+borderSize, (x,y) => (borderSize-y)/borderSize);
        // left
        off += createRectangle(off, -borderSize, 0, 0, h, (x,y) => x/borderSize);
        //right
        off += createRectangle(off, w, 0, w+borderSize, h, (x,y) => (borderSize-x)/borderSize);

        // top-left
        off += createRectangle(off, -borderSize, -borderSize, 0, 0,
            (x,y) => {
                const xi = borderSize-x;
                const yi = borderSize-y;
                return Math.max(1 - Math.sqrt(xi*xi+yi*yi)/Math.sqrt(borderSize*borderSize), 0);
            }
        );

        // top-right
        off += createRectangle(off, w, -borderSize, w+borderSize, 0,
            (x,y) => {
                const xi = x;
                const yi = borderSize-y;
                return Math.max(1 - Math.sqrt(xi*xi+yi*yi)/Math.sqrt(borderSize*borderSize), 0);
            }
        );

        // bottom-left
        off += createRectangle(off, -borderSize, h, 0, h+borderSize,
            (x,y) => {
                const xi = borderSize-x;
                const yi = y;
                return Math.max(1 - Math.sqrt(xi*xi+yi*yi)/Math.sqrt(borderSize*borderSize), 0);
            }
        );

        // bottom-right
        off += createRectangle(off, w, h, w+borderSize, h+borderSize,
            (x,y) => {
                const xi = x;
                const yi = y;
                return Math.max(1 - Math.sqrt(xi*xi+yi*yi)/Math.sqrt(borderSize*borderSize), 0);
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