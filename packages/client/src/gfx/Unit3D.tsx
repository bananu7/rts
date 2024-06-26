import { useEffect, useState, useRef, Suspense, useLayoutEffect, useMemo } from 'react'

import {
    useLoader, Canvas, useFrame,
    useThree,
    ReactThreeFiber,
    ThreeEvent
} from '@react-three/fiber'

import * as THREE from 'three';

import { Board, Unit, GameMap, UnitId, Position, UnitAction } from '@bananu7-rts/server/src/types'
import { SelectionCircle } from './SelectionCircle'
import { Line3D } from './Line3D'
import { Map3D, Box } from './Map3D'
import { ThreeCache } from './ThreeCache'
import { FileModel } from './FileModel'
import { UnitDisplayEntry } from './UnitDisplayCatalog'
import { Horizon } from '../debug/Horizon'
import { debugFlags } from '../debug/flags'

const cache = new ThreeCache();

const invisibleMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    transparent: true,
    opacity:0,
});

const coneGeometry = new THREE.ConeGeometry(0.5, 2, 8);
function ConeIndicator(props: {action: UnitAction, smoothing: boolean}) {
    // TODO - this will be replaced with animations etc
    let indicatorColor = 0xeeeeee;
    if (props.action === 'Moving')
        indicatorColor = 0x55ff55;
    else if (props.action === 'Attacking')
        indicatorColor = 0xff5555;
    else if (props.action === 'Harvesting')
        indicatorColor = 0x5555ff;
    // indicate discrepancy between server and us
    else if (props.smoothing)
        indicatorColor = 0xffff55;

    return (
        <mesh
            position={[0, 5, 0]}
            rotation={[0, 0, -1.57]}
            geometry={coneGeometry}
            material={cache.getBasicMaterial(indicatorColor)}
        />
    );
}

type Unit3DProps = {
    unit: Unit,
    displayEntry: UnitDisplayEntry,
    selected: boolean,
    click?: (originalEvent: ThreeEvent<MouseEvent>, id: UnitId, button: number, shift: boolean) => void,
    enemy: boolean,
}
export function Unit3D(props: Unit3DProps) {
    const onClick = (e: ThreeEvent<MouseEvent>) => {
        if (props.click)
            props.click(e, props.unit.id, e.nativeEvent.button, e.nativeEvent.shiftKey);
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

    const modelPath = props.displayEntry.modelPath;
    const selectorSize = props.displayEntry.selectorSize;

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

    // rotation
    const unitRotationRef = useRef<THREE.Group>(null);

    // Bring the unit to the proper position before first paint
    useLayoutEffect(() => {
        if(!unitGroupRef.current)
            return;

        unitGroupRef.current.position.x = props.unit.position.x;
        unitGroupRef.current.position.z = props.unit.position.y;
    }, []);

    // Softly interpolate the unit position when it's moving.
    useFrame((s, dt) => {
        if(!unitGroupRef.current || !unitRotationRef.current)
            return;

        unitRotationRef.current.rotation.y = props.unit.direction;

        // TODO - temporary fix to bring units where they're needed quickly
        if (softSnapVelocity.x > 5 || softSnapVelocity.y > 5) {
            unitGroupRef.current.position.x = props.unit.position.x;
            unitGroupRef.current.position.z = props.unit.position.y;
            return;
        }

        unitGroupRef.current.position.x += smoothingVelocity.x * dt;
        unitGroupRef.current.position.z += smoothingVelocity.y * dt;
    });

    const debugArrowHelper = (() => {
        if (!props.unit.debug?.terrainAvoidance)
            return undefined;

        const tavDir = new THREE.Vector3(props.unit.debug.terrainAvoidance.x, 0, props.unit.debug.terrainAvoidance.y);
        const tavLen = tavDir.length() * 3;
        tavDir.normalize();
        return <arrowHelper args={[
            tavDir,
            new THREE.Vector3( 0, 0, 0 ),
            tavLen,
            0xff0000,
        ]} />;
    })();

    const debugPath = props.unit.debug?.pathToNext?.map((a: any) => {
        return new THREE.Vector3(a.x, 1, a.y);
    });

    const action = props.unit.state.action;

    return (
        <group>
            { debugFlags.showPaths && 
                props.selected && debugPath &&
                <Line3D points={[new THREE.Vector3(props.unit.position.x, 1.1, props.unit.position.y), ...debugPath]} />
            }
            <group
                ref={unitGroupRef}
                position={[0, 1, 0]}
                name={`Unit_${props.unit.id}`}
            >
                { /* those things are always world axis oriented */}
                { debugFlags.showHorizons && props.selected && props.unit.debug &&
                    <Horizon obstacles={props.unit.debug.obstacles} />
                }
                { props.selected &&
                    <SelectionCircle size={selectorSize} enemy={props.enemy} />
                }
                { debugFlags.showTerrainArrows && 
                        props.selected && debugArrowHelper
                }

                { /* this group rotates with the unit*/ }
                <group ref={unitRotationRef}>
                    { /* Click mesh */ }
                    <mesh
                        onContextMenu={ onClick }
                        onClick={ onClick }
                        geometry={cache.getCylinderGeometry(selectorSize)}
                        material={invisibleMaterial}
                    />

                    { debugFlags.showCones &&
                        <ConeIndicator action={action} smoothing={smoothingVelocity.x > 0.01 || smoothingVelocity.y > 0.01} />
                    }

                    <FileModel path={modelPath} accentColor={color} animate={action}/>
                </group>
            </group>
        </group>
    );
}
