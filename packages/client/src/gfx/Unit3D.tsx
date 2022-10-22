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
import { ThreeCache } from './ThreeCache'

import { Horizon } from '../debug/Horizon'

const cache = new ThreeCache();

const invisibleMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    transparent: true,
    opacity:0,
});

const coneGeometry = new THREE.ConeGeometry(0.5, 2, 8);
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
        <mesh
            position={[0, 5, 0]}
             // TODO unit should rotate
            rotation={[0, 0, -1.57]}
            geometry={coneGeometry}
            material={cache.getBasicMaterial(indicatorColor)}
        />
    );
}

type Unit3DProps = {
    unit: UnitState,
    selected: boolean,
    click?: (id: UnitId, button: number, shift: boolean) => void,
    enemy: boolean,
}
export function Unit3D(props: Unit3DProps) {
    //const [catalog] = useState(() => require('../../assets/catalog.json'));
    //const clone = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf]);

    const onClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();

        if (props.click)
            props.click(props.unit.id, e.nativeEvent.button, e.nativeEvent.shiftKey);
    }

    // TODO better color choices
    const ownerToColor = (owner: number): number => {
        switch(owner) {
        case 0: return 0xdddddd;
        case 1: return 0x1111ee;
        case 2: return 0xee1111;
        default: return 0xff00ff;
        }
    };

    const color = ownerToColor(props.unit.owner);

    // TODO proper unit catalog
    const isBuilding = props.unit.kind === 'Base' || props.unit.kind === 'Barracks';
    const unitSize = isBuilding ? 4 : 1;
    const selectorSize = isBuilding ? 3 : 1;

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

    // Bring the unit to the proper position before first paint
    useLayoutEffect(() => {
        if(!unitGroupRef.current)
            return;

        unitGroupRef.current.position.x = props.unit.position.x;
        unitGroupRef.current.position.z = props.unit.position.y;
    }, []);

    // Softly interpolate the unit position when it's moving.
    useFrame((s, dt) => {
        if(!unitGroupRef.current)
            return;

        unitGroupRef.current.rotation.y = props.unit.direction;

        // TODO - temporary fix to bring units where they're needed quickly
        if (softSnapVelocity.x > 5 || softSnapVelocity.y > 5) {
            unitGroupRef.current.position.x = props.unit.position.x;
            unitGroupRef.current.position.z = props.unit.position.y;
            return;
        }

        unitGroupRef.current.position.x += smoothingVelocity.x * dt;
        unitGroupRef.current.position.z += smoothingVelocity.y * dt;
    });

    const arrowHelper = (() => {
        if (!props.unit.debug?.terrainAvoidance)
            return undefined;

        const tavDir = new THREE.Vector3(props.unit.debug.terrainAvoidance.x, 0, props.unit.debug.terrainAvoidance.y);
        const tavLen = tavDir.length() * 3;
        tavDir.normalize();
        return <arrowHelper args={[
            tavDir,
            new THREE.Vector3( 0, 0, 0 ),
            tavLen,
        ]} />;
    })();

    // TODO - debug path view
    //const target = props.unit.actionQueue.map(a => {
    //    return new THREE.Vector3(a.target.x, 1, a.target.y);
    //})
    const path = props.unit.debug?.pathToNext?.map((a: any) => {
        return new THREE.Vector3(a.x, 1, a.y);
    });

    return (
        <group>
            {
                props.selected && path &&
                <Line3D points={[new THREE.Vector3(props.unit.position.x, 1, props.unit.position.y), ...path]} />
            }
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
                    geometry={cache.getCylinderGeometry(selectorSize)}
                    material={invisibleMaterial}
                />

                { props.selected &&
                    <SelectionCircle size={selectorSize} enemy={props.enemy} />
                }
                {/*
                    props.selected && props.unit.debug &&
                        <Horizon obstacles={props.unit.debug.obstacles} />
                */}

                { props.selected && arrowHelper }

                <mesh
                    castShadow
                    receiveShadow
                    geometry={cache.getBoxGeometry(unitSize)}
                    material={cache.getStandardMaterial(color)}
                />
            </group>
        </group>
    );
}
