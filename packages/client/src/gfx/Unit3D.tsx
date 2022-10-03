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

function ConeIndicator(props: {unit: UnitState, smoothing: boolean}) {
    // TODO - this will be replaced with animations etc
    let indicatorColor = 0xeeeeee;
    if (props.unit.status === 'Moving')
        indicatorColor = 0x55ff55;
    else if (props.unit.status === 'Attacking')
        indicatorColor = 0xff5555;
    else if (props.unit.status === 'Harvesting')
        indicatorColor = 0x5555ff;
    // indicate discrepancy between server and us
    else if (props.smoothing)
        indicatorColor = 0xffff55;

    return (
        <mesh position={[0, 5, 0]} rotation={[0, -props.unit.direction, -1.57]}>
            <coneGeometry args={[0.5, 2, 8]} />
            <meshBasicMaterial color={indicatorColor} />
        </mesh>
    );
}

type Unit3DProps = {
    unit: UnitState,
    selected: boolean,
    click?: (id: UnitId, button: number) => void,
    enemy: boolean,
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
    const ownerToColor = (owner: number) => {
        switch(owner) {
        case 0: return 0xdddddd;
        case 1: return 0x1111ee;
        case 2: return 0xee1111;
        }
    };

    const color = ownerToColor(props.unit.owner);

    // TODO proper unit catalog
    const isBuilding = props.unit.kind === 'Base' || props.unit.kind === 'Barracks';
    const unitSize = isBuilding ? 5 : 1;

    /* TODO - debug path view
    const path = props.unit.actionQueue.map(a => {
        return new THREE.Vector3(a.target.x, 1, a.target.y);
    })*/

    // smoothing
    const unitGroupRef = useRef<THREE.Group>(null);
    const softSnapVelocity =
        unitGroupRef.current ?
        { x: props.unit.position.x - unitGroupRef.current.position.x,
          y: props.unit.position.y - unitGroupRef.current.position.z
        }
        :
        { x: 0, y: 0 };

    const SMOOTHING_TIME = 100;
    const SMOOTHING_SCALE = 1000 / SMOOTHING_TIME;

    const smoothingVelocity = {
        x: props.unit.velocity.x + softSnapVelocity.x * SMOOTHING_SCALE,
        y: props.unit.velocity.y + softSnapVelocity.y * SMOOTHING_SCALE
    }

    useFrame((s, dt) => {
        if(!unitGroupRef.current)
            return;

        // TODO - temporary fix to bring units where they're needed quickly
        if (softSnapVelocity.x > 5 || softSnapVelocity.y > 5) {
            unitGroupRef.current.position.x = props.unit.position.x;
            unitGroupRef.current.position.z = props.unit.position.y;
            return;
        }

        unitGroupRef.current.position.x += smoothingVelocity.x * dt;
        unitGroupRef.current.position.z += smoothingVelocity.y * dt;
    });

    return (
        <group>
            {/*<Line3D points={path} />*/}
            <group
                ref={unitGroupRef}
                position={[0, 1, 0]}
                name={`Unit_${props.unit.id}`}
            >
                <ConeIndicator unit={props.unit} smoothing={smoothingVelocity.x > 0.01 || smoothingVelocity.y > 0.01} />

                { /* Click mesh */ }
                <mesh
                    onContextMenu={ onClick }
                    onClick={ onClick }
                >
                    <cylinderGeometry args={[unitSize, unitSize, 2, 12]} />
                    <meshBasicMaterial
                        colorWrite={false}
                        depthWrite={false}
                    />
                </mesh>

                { props.selected &&
                    <SelectionCircle size={unitSize} enemy={props.enemy} />
                }

                <mesh
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={[unitSize, 2, unitSize]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            </group>
        </group>
    );
}
