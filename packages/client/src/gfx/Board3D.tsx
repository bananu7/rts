import { useEffect, useState, useRef, Suspense, useLayoutEffect, useMemo } from 'react'

import {
    useLoader, Canvas, useFrame,
    useThree,
    ReactThreeFiber,
    ThreeEvent
} from '@react-three/fiber'

import * as THREE from 'three';

import { Board, Unit, GameMap, UnitId, Position, UnitState } from 'server/types'
import { SelectionCircle } from './SelectionCircle'
import { Line3D } from './Line3D'
import { Map3D, Box } from './Map3D'
import { Unit3D } from './Unit3D'

import { SelectedAction } from '../components/CommandPalette'

function BuildPreview(props: {position: Position, building: string}) {
    const unitSize = 5;

    return (
        <group position={[props.position.x, 2, props.position.y]}>
            <mesh>
                <boxGeometry args={[unitSize, 2, unitSize]} />
                <meshBasicMaterial color={0x33cc33} transparent={true} opacity={0.5} />
            </mesh>
            <mesh>
                <boxGeometry args={[unitSize, 2, unitSize]} />
                <meshBasicMaterial color={0x00ff00} wireframe={true}/>
            </mesh>
        </group>
    );
}

export interface Props {
    board: Board;
    playerIndex: number;
    unitStates: UnitState[];
    select: (ids: Set<UnitId>) => void;
    selectedUnits: Set<UnitId>;
    selectedAction: SelectedAction | undefined;
    mapClick: (p: Position, button: number) => void;
    unitClick: (u: UnitId, button: number) => void;
}

export function Board3D(props: Props) {
    const [pointer, setPointer] = useState<{x:number, y:number}>({x: 0, y: 0});

    const units = props.unitStates.map(u => 
    (<Unit3D
        key={u.id}
        unit={u}
        click={props.unitClick}
        selected={props.selectedUnits.has(u.id)}
        enemy={u.owner !== props.playerIndex}
    />));

    const groupRef = useRef<THREE.Group>(null);

    const selectInBox = (box: Box) => {
        function isInBox(p: Position, b: Box) {
            const x1 = b.x1 < b.x2 ? b.x1 : b.x2;
            const x2 = b.x1 < b.x2 ? b.x2 : b.x1;
            const y1 = b.y1 < b.y2 ? b.y1 : b.y2;
            const y2 = b.y1 < b.y2 ? b.y2 : b.y1;
            return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
        }

        const selection = props.unitStates
            .filter(u => isInBox(u.position, box))
            .filter(u => u.owner === props.playerIndex)
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
            <Map3D
                map={props.board.map}
                click={props.mapClick}
                selectInBox={selectInBox}
                pointerMove={setPointer}
            />
            { units }
            {
                props.selectedAction &&
                props.selectedAction.action === 'Build' &&
                <BuildPreview building={props.selectedAction.building} position={pointer}/>
            }
        </group>
    );
}
