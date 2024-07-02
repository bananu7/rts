
import { useEffect, useState, useRef, useLayoutEffect, useCallback, memo, RefObject } from 'react'

import {
    ThreeEvent,
    useFrame
} from '@react-three/fiber'

import * as THREE from 'three';

import { Board, Unit, GameMap, UnitId, Position } from '@bananu7-rts/server/src/types'

import { SelectionBox } from './SelectionBox'
import { tileTypeToColor, tileTypeToHeight } from './map_display'
import { MapBorder } from './MapBorder'

type Click = (originalEvent: ThreeEvent<MouseEvent>, p: Position, button: number, shift: boolean) => void;
type RawClick = (e: ThreeEvent<MouseEvent>) => void;
export type Box = { x1: number, y1: number, x2: number, y2: number };

type Map3DProps = {
    map: GameMap,
    click: Click,
    selectInBox: (box: Box, shift: boolean) => void;

    pointerMove: (p: {x: number, y: number}) => void;
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

    const ref = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!ref.current)
            return;

        const mat4Pos = new THREE.Matrix4();
        const vec3Color = new THREE.Color();


        for (let y = 0; y < h; y++){
            for (let x = 0; x < w; x++) {
                const ix = y*props.map.w+x;

                const tileType = props.map.tiles[ix];
                const color = tileTypeToColor(tileType, vec3Color);
                const height = tileTypeToHeight(tileType);

                // TODO - make sure that everything matches with that corrective offset
                mat4Pos.makeTranslation(x + 0.5, height-9, y + 0.5); // TODO -1 to move them down because of their height

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
                position={[0.5*w, 0, 0.5*h]}
            >
                <boxGeometry args={[w*2, 1, h*2]} />
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
                {/*<planeGeometry args={[1, 1]} />*/}
                <boxGeometry args={[1, 20, 1]} />
                <meshStandardMaterial />
            </instancedMesh>

            <MapBorder w={w} h={h} />
        </group>
    );
}
