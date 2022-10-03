
import { useEffect, useState, useRef, useLayoutEffect, useCallback } from 'react'

import {
    ThreeEvent
} from '@react-three/fiber'

import * as THREE from 'three';

import { Board, Unit, GameMap, UnitId, Position, UnitState } from 'server/types'

type Click = (p: Position, button: number) => void;
type RawClick = (e: ThreeEvent<MouseEvent>) => void;
export type Box = { x1: number, y1: number, x2: number, y2: number };

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
    const [pointer, setPointer] = useState<{x:number, y:number}|undefined>(undefined);
    const pointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (e.nativeEvent.button === 0)
            setDrag({x: e.point.x, y: e.point.z});
    }, []);
    const pointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        setPointer({x: e.point.x, y: e.point.z});
    }, []);
    const pointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (drag && e.nativeEvent.button === 0) {
            props.selectInBox({x1: drag.x, y1: drag.y, x2: e.point.x, y2: e.point.z});
        }
        setDrag(undefined);
        setPointer(undefined);
    }, [drag]);

    const selectionBoxSize = (drag && pointer) ? {
        x: Math.abs(drag.x - pointer.x),
        y: Math.abs(drag.y - pointer.y)
    } : undefined;

    // actual map
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
                onPointerMove={pointerMove}
                position={[0.5*w, 0, ySize*0.5*h]}
            >
                <boxGeometry args={[xSize*w*2, 1, ySize*h*2]} />
                <meshBasicMaterial opacity={0} transparent={true} />
            </mesh>

            {drag && pointer && selectionBoxSize && <mesh
                name="SelectionBox"
                position={[
                    pointer.x - selectionBoxSize.x / 2 * (pointer.x > drag.x ? 1 : -1),
                    2,
                    pointer.y - selectionBoxSize.y / 2 * (pointer.y > drag.y ? 1 : -1)
                ]}
                rotation={[-Math.PI/2, 0, 0]}
            >
                <planeGeometry args={[selectionBoxSize.x, selectionBoxSize.y]}/>
                <meshBasicMaterial wireframe color={0x00ff00} />
            </mesh>}

            <instancedMesh
                ref={ref}
                args={[undefined, undefined, w*h]}
                receiveShadow
            >
                {/*<planeGeometry args={[xSize, ySize]} />*/}
                <boxGeometry args={[xSize, 1, ySize]} />
                <meshStandardMaterial />
            </instancedMesh>
        </group>
    );
}