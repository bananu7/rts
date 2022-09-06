import { useEffect, useState, useRef, Suspense, useLayoutEffect, useMemo } from 'react'

import {
    useLoader, Canvas, useFrame,
    useThree,
    ReactThreeFiber,
    ThreeEvent
} from '@react-three/fiber'

import * as THREE from 'three';

//import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
//import { SkeletonUtils } from "three/examples/jsm/utils/SkeletonUtils"

import { Board, Unit, GameMap, UnitId, Position, UnitState } from 'server/types'
import { SelectionCircle } from './SelectionCircle'
import { Line3D } from './Line3D'
import { Map3D, Box } from './Map3D'

type Unit3DProps = {
    unit: UnitState,
    selected: boolean,
    click?: (id: UnitId, button: number) => void,
}
export function Unit3D(props: Unit3DProps) {
    //const [catalog] = useState(() => require('../../assets/catalog.json'));
    //const clone = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf]);

    const onClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();

        if (props.click)
            props.click(props.unit.id, e.nativeEvent.button);
    }

    // TODO better color choices
    const color = props.unit.owner === 1 ? 0x1111ee : 0xee1111;

    // TODO proper unit catalog
    const isBuilding = props.unit.kind === 'Base' || props.unit.kind === 'Barracks';
    const unitSize = isBuilding ? 5 : 1;

    /* TODO - debug path view
    const path = props.unit.actionQueue.map(a => {
        return new THREE.Vector3(a.target.x, 1, a.target.y);
    })*/

    // TODO - this will be replaced with animations etc
    let indicatorColor = 0xeeeeee;
    if (props.unit.status === 'Moving')
        indicatorColor = 0x55ff55;
    else if (props.unit.status === 'Attacking')
        indicatorColor = 0xff5555;
    else if (props.unit.status === 'Harvesting')
        indicatorColor = 0x5555ff;

    return (
        <group>
            {/*<Line3D points={path} />*/}
            <group 
                position={[props.unit.position.x, 1, props.unit.position.y]}
                name={`Unit_${props.unit.id}`}
            >
                <mesh position={[0, 5, 0]} rotation={[0, -props.unit.direction, -1.57]}>
                    <coneGeometry args={[1, 3, 8]} />
                    <meshBasicMaterial color={indicatorColor} />
                </mesh>
                <mesh
                    onClick={ onClick }
                    onContextMenu={ onClick }
                    castShadow
                >
                    <boxGeometry args={[unitSize, 2, unitSize]} />
                    <meshStandardMaterial color={color} />
                </mesh>
                { props.selected && <SelectionCircle size={unitSize} /> }    
            </group>
        </group>
    );
}

export interface Props {
    board: Board;
    unitStates: UnitState[];
    select: (ids: Set<UnitId>) => void;
    selectedUnits: Set<UnitId>;
    mapClick: (p: Position) => void;
    unitRightClick: (u: UnitId) => void;
}

export function Board3D(props: Props) {
    const handleUnitClick = (u: UnitId, b: number) => {
        // Add unit to selection
        if (b === 0) {
            // TODO shiftclick
            //props.select(props.selectedUnits.add(u));
            props.select(new Set([u]));
        } else if (b === 2) {
            props.unitRightClick(u);
        }
    }

    const handleMapClick = (p: Position, button: number) => {
        if (button === 2) {
            props.mapClick(p);
        }
        else if (button === 0) {
            props.select(new Set());
        }
    };

    const units = props.unitStates.map(u => 
    (<Unit3D
        key={u.id}
        unit={u}
        click={handleUnitClick}
        selected={props.selectedUnits.has(u.id)}
    />));

    const groupRef = useRef<THREE.Group>(null);

    const selectInBox = (box: Box) => {
        function isInBox(p: Position, b: Box) {
            return p.x >= b.x1 && p.x <= b.x2 && p.y >= b.y1 && p.y <= b.y2;
        }

        const selection = props.unitStates
            .filter(u => isInBox(u.position, box))
            .map(u => u.id);

        props.select(new Set(selection));
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
            <Map3D map={props.board.map} click={handleMapClick} selectInBox={selectInBox} />
            { units }
        </group>
    );
}
