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

export interface Props {
    board: Board;
    playerIndex: number;
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
            <Map3D map={props.board.map} click={handleMapClick} selectInBox={selectInBox} />
            { units }
        </group>
    );
}
