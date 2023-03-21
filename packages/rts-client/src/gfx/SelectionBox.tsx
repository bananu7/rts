import { useRef, RefObject } from 'react'
import {
    ThreeEvent,
    useFrame
} from '@react-three/fiber'

import * as THREE from 'three';

import { Position } from 'rts-server/src/types'

type SelectionBoxProps = {
    start: RefObject<Position | undefined>,
    pointer: RefObject<Position | undefined>,
}

export function SelectionBox(props: SelectionBoxProps) {
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
