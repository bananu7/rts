
import { useEffect, useState, useRef, useLayoutEffect, useCallback, memo, RefObject } from 'react'

import {
    ThreeEvent,
    useFrame
} from '@react-three/fiber'

import * as THREE from 'three';

import { Board, Unit, GameMap, UnitId, Position, UnitState } from 'server/types'

type Click = (p: Position, button: number, shift: boolean) => void;
type RawClick = (e: ThreeEvent<MouseEvent>) => void;
export type Box = { x1: number, y1: number, x2: number, y2: number };

type SelectionBoxProps = {
    start: RefObject<Position | undefined>,
    pointer: RefObject<Position | undefined>,
}

function SelectionBox(props: SelectionBoxProps) {
    const sbxRef = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (!sbxRef.current)
            return;

        if (!props.start.current || !props.pointer.current) {
            sbxRef.current.visible = false;
            return;
        }

        const start = props.start.current;
        const pointer = props.pointer.current;

        sbxRef.current.visible = true;

        const selectionBoxSize = {
            x: Math.abs(start.x - pointer.x),
            y: Math.abs(start.y - pointer.y)
        };

        const sbx = pointer.x - selectionBoxSize.x / 2 * (pointer.x > start.x ? 1 : -1);
        const sby = pointer.y - selectionBoxSize.y / 2 * (pointer.y > start.y ? 1 : -1);

        sbxRef.current.position.set(sbx, 2, sby);
        sbxRef.current.scale.set(selectionBoxSize.x, selectionBoxSize.y, 1);
    })

    return (
        <mesh
            name="SelectionBox"
            position={[0,2,0]}
            rotation={[-Math.PI/2, 0, 0]}
            ref={sbxRef}
        >
            <planeGeometry args={[1, 1]}/>
            <meshBasicMaterial wireframe color={0x00ff00} />
        </mesh>
    )
}

type Map3DProps = {
    map: GameMap,
    click: Click,
    selectInBox: (box: Box, shift: boolean) => void;

    pointerMove: (p: {x: number, y: number}) => void;
}

export function Map3D(props: Map3DProps) {
    // movement
    const rawClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        // turn the 3D position into the 2D map position
        props.click({x: e.point.x, y: e.point.z}, e.nativeEvent.button, e.nativeEvent.shiftKey);
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