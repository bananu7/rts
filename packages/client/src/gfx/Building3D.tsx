import { useEffect, useState, useRef, Suspense, useLayoutEffect, useMemo } from 'react'

import {
    useLoader, Canvas, useFrame,
    useThree,
    ReactThreeFiber,
    ThreeEvent
} from '@react-three/fiber'

import * as THREE from 'three';

import { Board, Unit, GameMap, UnitId, Position } from '@bananu7-rts/server/src/types'
import { SelectionCircle } from './SelectionCircle'
import { Line3D } from './Line3D'
import { Map3D, Box } from './Map3D'
import { ThreeCache } from './ThreeCache'
import { FileModel } from './FileModel'
import { BuildingDisplayEntry } from './UnitDisplayCatalog'

const cache = new ThreeCache();

const invisibleMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    transparent: true,
    opacity:0,
});

type Building3DProps = {
    unit: Unit,
    selected: boolean,
    displayEntry: BuildingDisplayEntry,
    click?: (originalEvent: ThreeEvent<MouseEvent>, id: UnitId, button: number, shift: boolean) => void,
    enemy: boolean,
}
export function Building3D(props: Building3DProps) {
    const onClick = (e: ThreeEvent<MouseEvent>) => {
        if (props.click)
            props.click(e, props.unit.id, e.nativeEvent.button, e.nativeEvent.shiftKey);
    }

    // TODO duplicate with Unit3D
    const ownerToColor = (owner: number): number => {
        switch(owner) {
        case 0: return 0xdddddd;
        case 1: return 0x1111ee;
        case 2: return 0xee1111;
        default: return 0xff00ff;
        }
    };

    const color = ownerToColor(props.unit.owner);

    const modelPath = props.displayEntry.modelPath;
    const selectorSize = props.displayEntry.selectorSize / 2;

    // smoothing
    const unitGroupRef = useRef<THREE.Group>(null);

    // Bring the unit to the proper position before first paint
    useLayoutEffect(() => {
        if(!unitGroupRef.current)
            return;

        unitGroupRef.current.position.x = props.unit.position.x;
        unitGroupRef.current.position.z = props.unit.position.y;
        unitGroupRef.current.rotation.y = props.unit.direction;
    }, []);

    // TODO animate buildings when they're producing
    const action = props.unit.state.action;

    return (
        <group>
            <group
                ref={unitGroupRef}
                position={[0, 1, 0]}
                name={`BuildingUnit_${props.unit.id}`}
            >
                <group position={[selectorSize, 0, selectorSize]}>
                    { props.selected &&
                        <SelectionCircle size={selectorSize} enemy={props.enemy} />
                    }

                    { /* Click mesh */ }
                    <mesh
                        onContextMenu={ onClick }
                        onClick={ onClick }
                        geometry={cache.getCylinderGeometry(selectorSize)}
                        material={invisibleMaterial}
                    />
                </group>

                <FileModel path={modelPath} accentColor={color} animate={action}/>
            </group>
        </group>
    );
}
