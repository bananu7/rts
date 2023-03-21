import { useCallback, useEffect, useState, useRef, Suspense, useLayoutEffect, useMemo, memo, Ref, RefObject } from 'react'

import {
    useLoader, Canvas, useFrame,
    useThree,
    ReactThreeFiber,
    ThreeEvent
} from '@react-three/fiber'

import * as THREE from 'three';

import { Board, Unit, GameMap, UnitId, Position, UnitState, TilePos } from '@bananu7-rts/server/src/types'
import { mapEmptyForBuilding } from '@bananu7-rts/server/src/shared'
import { SelectionCircle } from './SelectionCircle'
import { Line3D } from './Line3D'
import { Map3D, Box } from './Map3D'
import { Unit3D } from './Unit3D'
import { Building3D } from './Building3D'
import { UNIT_DISPLAY_CATALOG, BuildingDisplayEntry } from './UnitDisplayCatalog'

import { SelectedAction } from '../game/SelectedAction'

type BuildPreviewProps = {
    position: RefObject<Position>;
    building: string;
    map: GameMap;
}
function BuildPreview(props: BuildPreviewProps) {
    const unitSize = 6;

    if (!props.position.current) {
        return <></>;
    }

    const ref = useRef<THREE.Group>(null);
    const blobMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const wireMatRef = useRef<THREE.MeshBasicMaterial>(null);

    useFrame(() => {
        if(!ref.current)
            return;

        if (!props.position.current)
            return;

        const onGridX = Math.floor(props.position.current.x/2)*2
        const onGridY = Math.floor(props.position.current.y/2)*2;

        // TODO likely needs +3 because ref point for boxgeom is in the middle, make it respect real building size
        ref.current.position.x = onGridX + 3;
        ref.current.position.z = onGridY + 3;

        if (!blobMatRef.current || !wireMatRef.current)
            return;

        const emptyForBuilding = mapEmptyForBuilding(props.map, 6, {x:onGridX, y:onGridY});
        if (!emptyForBuilding)
            console.log("!");

        const blobColor = emptyForBuilding ? 0x33cc33 : 0xcc3333;
        const wireColor = emptyForBuilding ? 0x00ff00 : 0xff0000;

        blobMatRef.current.color.setHex(blobColor);
        wireMatRef.current.color.setHex(wireColor);
    })

    return (
        <group ref={ref} position={[-100, 2, -100]}>
            <mesh>
                <boxGeometry args={[unitSize, 2, unitSize]} />
                <meshBasicMaterial ref={blobMatRef} color={0x33cc33} transparent={true} opacity={0.5} />
            </mesh>
            <mesh>
                <boxGeometry args={[unitSize, 2, unitSize]} />
                <meshBasicMaterial ref={wireMatRef} color={0x00ff00} wireframe={true}/>
            </mesh>
            <group position={[0, -1, 0]}>
                <gridHelper args={[14, 7]} />
            </group>
        </group>
    );
}

export interface Props {
    board: Board;
    playerIndex: number;
    unitStates: UnitState[];
    selectedUnits: Set<UnitId>;
    selectedAction: SelectedAction | undefined;

    select: (ids: Set<UnitId>, shift: boolean) => void;
    mapClick: (originalEvent: ThreeEvent<MouseEvent>, p: Position, button: number, shift: boolean) => void;
    unitClick: (originalEvent: ThreeEvent<MouseEvent>, u: UnitId, button: number, shift: boolean) => void;
}

export function Board3D(props: Props) {
    const pointer = useRef({ x: 0, y: 0 });
    const setPointer = useCallback((p: Position) => {
        pointer.current.x = p.x;
        pointer.current.y = p.y;
    }, [pointer]);

    const units = props.unitStates.map(u => {
        const catalogEntryFn = UNIT_DISPLAY_CATALOG[u.kind];
        if (!catalogEntryFn)
            throw new Error("No display catalog entry for unit" + u.kind);
        const catalogEntry = catalogEntryFn();

        if (catalogEntry.isBuilding) {
            return (<Building3D
                key={u.id}
                unit={u}
                click={props.unitClick}
                selected={props.selectedUnits.has(u.id)}
                displayEntry={catalogEntry}
                enemy={u.owner !== props.playerIndex}
            />);
        } else {
            return (<Unit3D
                key={u.id}
                unit={u}
                click={props.unitClick}
                selected={props.selectedUnits.has(u.id)}
                displayEntry={catalogEntry}
                enemy={u.owner !== props.playerIndex}
            />);
        }
    });


    const groupRef = useRef<THREE.Group>(null);

    const selectInBox = (box: Box, shift: boolean) => {
        // TODO - this is a hotfix; Board shouldn't make those decisions...
        if (props.selectedAction)
            return;

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

        props.select(new Set(selection), shift);
    };

    return (
        <group name="board">
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
                <BuildPreview building={props.selectedAction.building} position={pointer} map={props.board.map}/>
            }
        </group>
    );
}
