import { useEffect, useState, useRef, Suspense, useLayoutEffect, useMemo } from 'react'

import {
    useLoader, Canvas, useFrame,
    useThree,
    ReactThreeFiber
} from '@react-three/fiber'

import * as THREE from 'three';

//import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
//import { SkeletonUtils } from "three/examples/jsm/utils/SkeletonUtils"

import { Board, Unit } from 'server/types'
import { SelectionCircle } from './SelectionCircle'

import { UnitId, Position } from 'server/types'

type Unit3DProps = {
    unit: Unit,
    selected: boolean,
    click?: (id: UnitId) => void,
}

export function Unit3D(props: Unit3DProps) {
    //const [catalog] = useState(() => require('../../assets/catalog.json'));
    //const clone = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf]);

    const onClick = (e:any) => {
        e.stopPropagation();
        if (props.click)
            props.click(props.unit.id);
    }

    // TODO better color choices
    const color = props.unit.owner === 1 ? 0x1111ee : 0xee1111;

    return (
        <group 
            position={[props.unit.position.x, 10, props.unit.position.y]}
            name={`Unit_${props.unit.id}`}
        >
            <mesh
                onClick={ onClick }
            >
                <boxGeometry args={[10, 10, 10]} />
                <meshBasicMaterial
                    color={color}
                    opacity={1.0}
                    transparent={false}
                />

            </mesh>
            {/*<primitive
                onClick={ onClick }
            />*/}
            { props.selected && <SelectionCircle size={10} /> }
        </group>
    );
}

export function Map3D(props: { click: (p: Position, button: number) => void }) {
    const xSize = 100;
    const ySize = 100;

    const click = e => {
        // turn the 3D position into the 2D map position
        props.click({x: e.point.x, y: e.point.z}, e.button);
    };

    return (
        <group>
            <mesh
                position={[xSize/2, 0, ySize/2]}
                onClick={click}
                onContextMenu={click}
            >
                <boxGeometry args={[xSize, 1, ySize]} />
                <meshBasicMaterial
                    color={0x11cc11}
                    opacity={1.0}
                    transparent={false}
                />

            </mesh>
        </group>
    );
}

export interface Props {
    board: Board;
    select: (ids: Set<UnitId>) => void;
    selectedUnits: Set<UnitId>;
    mapClick: (p: Position) => void;
}

export function Board3D(props: Props) {
    const addSelectOne = (u: UnitId) => {
        props.select(props.selectedUnits.add(u));
    }

    const units = props.board.units.map(u => 
        (<Unit3D
            key={u.id}
            unit={u}
            click={addSelectOne}
            selected={props.selectedUnits.has(u.id)}
        />));

    const groupRef = useRef<THREE.Group>();

    const mapClick = (p: Position, button: number) => {
        if (button === 2) {
            props.mapClick(p);
        }
        else if (button === 0) {
            props.select(new Set());
        }
    };

    useEffect(() => {
        if (!groupRef.current)
            return;

        /*
        const box = new THREE.Box3().setFromObject(groupRef.current);
        const size = box.getSize(new THREE.Vector3()).length();
        const center = box.getCenter(new THREE.Vector3());
        groupRef.current.position.sub(center);
        */
    });

    return (
        <group ref={groupRef} dispose={null} name="ship">
            <Map3D click={mapClick} />
            { units }
        </group>
    );
}
