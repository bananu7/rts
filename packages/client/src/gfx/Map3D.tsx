
import { useEffect, useState, useRef, useLayoutEffect } from 'react'

import {
    ThreeEvent
} from '@react-three/fiber'

import * as THREE from 'three';

import { Board, Unit, GameMap, UnitId, Position, UnitState } from 'server/types'

type Click = (p: Position, button: number) => void;
type RawClick = (e: ThreeEvent<MouseEvent>) => void;
type Box = { x1: number, y1: number, x2: number, y2: number };

type Map3DProps = {
    map: GameMap,
    click: Click,
    selectInBox: (box: Box) => void;
}

export function Map3D(props: Map3DProps) {
    // movement
    const rawClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        // turn the 3D position into the 2D map position
        props.click({x: e.point.x, y: e.point.z}, e.nativeEvent.button);
    };

    // selection box
    const [drag, setDrag] = useState<{x:number, y:number}|undefined>(undefined);
    const pointerDown = (e: ThreeEvent<PointerEvent>) => {
        setDrag({x: e.point.x, y: e.point.z});
    };
    const pointerUp = (e: ThreeEvent<PointerEvent>) => {
        if (e.nativeEvent.button !== 0)
            return;
        if (drag) {
            props.selectInBox({x1: drag.x, y1: drag.y, x2: e.point.x, y2: e.point.z});
        }
        setDrag(undefined);
    };


    const w = props.map.w;
    const h = props.map.h;

    const xSize = 1;
    const ySize = 1;

    const ref = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!ref.current)
            return;

        const mat4Pos = new THREE.Matrix4();
        const vec3Color = new THREE.Color();

        for (let y = 0; y < w; y++){
            for (let x = 0; x < h; x++) {
                const ix = y*props.map.w+x;

                const isPassable = props.map.tiles[ix] === 0;

                const color = isPassable ? 0x11aa11 : 0x888888;
                const height = isPassable ? 0 : 0.8;
                
                mat4Pos.makeTranslation(x * xSize, height, y * ySize);
                vec3Color.set(color);

                ref.current.setMatrixAt(ix, mat4Pos);
                ref.current.setColorAt(ix, vec3Color);
            }
        }
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    }, [props.map])

    return (
        <group name="Game Map">
            <mesh 
                name="Click Mesh"
                onContextMenu={rawClick}
                onPointerDown={pointerDown}
                onPointerUp={pointerUp}
                position={[0.5*w, 0, ySize*0.5*h]}
            >
                <boxGeometry args={[xSize*w, 1, ySize*h]} />
                <meshBasicMaterial opacity={0} transparent={true} />
            </mesh>

            <instancedMesh
                ref={ref}
                args={[undefined, undefined, w*h]}
            >
                {/*<planeGeometry args={[xSize, ySize]} />*/}
                <boxGeometry args={[xSize, 1, ySize]} />
                <meshStandardMaterial />
            </instancedMesh>
        </group>
    );
}