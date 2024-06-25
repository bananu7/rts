
import { useEffect, useState, useRef, useLayoutEffect, useCallback, memo, RefObject } from 'react'

import {
    ThreeEvent,
    useFrame
} from '@react-three/fiber'

import * as THREE from 'three';

import { Board, Unit, GameMap, UnitId, Position } from '@bananu7-rts/server/src/types'

import { SelectionBox } from './SelectionBox'

type Click = (originalEvent: ThreeEvent<MouseEvent>, p: Position, button: number, shift: boolean) => void;
type RawClick = (e: ThreeEvent<MouseEvent>) => void;
export type Box = { x1: number, y1: number, x2: number, y2: number };

type Map3DProps = {
    map: GameMap,
    click: Click,
    selectInBox: (box: Box, shift: boolean) => void;

    pointerMove: (p: {x: number, y: number}) => void;
}

function tileTypeToColor(tileType: number, vec3Color: THREE.Color) {
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

function tileTypeToHeight(tileType: number): number {
    const correction = 0.01;
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


export function Map3D(props: Map3DProps) {
    // movement
    const rawClick = (e: ThreeEvent<MouseEvent>) => {
        // turn the 3D position into the 2D map position
        // TODO maybe just extract it above
        props.click(e, {x: e.point.x, y: e.point.z}, e.nativeEvent.button, e.nativeEvent.shiftKey);
    };

    // selection box
    const drag = useRef<{x: number, y: number} | undefined>(undefined);
    const pointer = useRef({ x: 0, y: 0 });
    const pointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (e.nativeEvent.button === 0)
            drag.current = {x: e.point.x, y: e.point.z};
    }, []);
    const pointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        pointer.current.x = e.point.x;
        pointer.current.y = e.point.z;;
        props.pointerMove({x: e.point.x, y: e.point.z});
    }, [props.pointerMove]);
    const pointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
        // TODO - only do select if no action?
        // maybe send drag up instead of handling it here
        if (drag.current && e.nativeEvent.button === 0) {
            props.selectInBox({x1: drag.current.x, y1: drag.current.y, x2: e.point.x, y2: e.point.z}, e.nativeEvent.shiftKey);
        }
        drag.current = undefined;
    }, [drag.current, props.selectInBox]);

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

        const tilePosition = new THREE.Vector3();
        const tileQ = new THREE.Quaternion();
        const tileScale = new THREE.Vector3(1, 1, 1);

        for (let y = 0; y < h; y++){
            for (let x = 0; x < w; x++) {
                const ix = y*props.map.w+x;

                const tileType = props.map.tiles[ix];
                const color = tileTypeToColor(tileType, vec3Color);
                const height = tileTypeToHeight(tileType);

                // TODO - make sure that everything matches with that corrective offset
                mat4Pos.makeTranslation(x * xSize + 0.5, height-9, y * ySize + 0.5); // TODO -1 to move them down because of their height
                /*

                tilePosition.set(x * xSize + 0.5, -1, y * ySize + 0.5);
                tileScale.y = height;
                mat4Pos.compose(tilePosition, tileQ, tileScale); // TODO -1 to move them down because of their heigh

                */

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
                onClick={rawClick}
                onPointerDown={pointerDown}
                onPointerUp={pointerUp}
                onPointerMove={pointerMove}
                position={[0.5*w, 0, ySize*0.5*h]}
            >
                <boxGeometry args={[xSize*w*2, 1, ySize*h*2]} />
                <meshBasicMaterial opacity={0} transparent={true} />
            </mesh>

            <SelectionBox start={drag} pointer={pointer} />

            <instancedMesh
                name="Game map mesh"
                ref={ref}
                args={[undefined, undefined, w*h]}
                receiveShadow
                castShadow
            >
                {/*<planeGeometry args={[xSize, ySize]} />*/}
                <boxGeometry args={[xSize, 20, ySize]} />
                <meshStandardMaterial />
            </instancedMesh>
        </group>
    );
}