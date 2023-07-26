import { useCallback, useEffect, useState, useRef, Suspense, useLayoutEffect, useMemo, memo, Ref, RefObject } from 'react'

import {
    useLoader, Canvas, useFrame,
    useThree,
    ReactThreeFiber,
    ThreeEvent
} from '@react-three/fiber'

import * as THREE from 'three';

import { Board, Unit, GameMap, UnitId, Position, UnitState, TilePos } from '@bananu7-rts/server/src/types'
import { SelectionCircle } from './SelectionCircle'
import { Line3D } from './Line3D'
import { Map3D, Box } from './Map3D'
import { Unit3D } from './Unit3D'
import { Building3D } from './Building3D'
import { BuildPreview } from './BuildPreview'
import { UNIT_DISPLAY_CATALOG, BuildingDisplayEntry } from './UnitDisplayCatalog'

import { SelectedAction } from '../game/SelectedAction'

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

        const unitProps = {
            key: u.id,
            unit: u,
            click: props.unitClick,
            selected: props.selectedUnits.has(u.id),
            enemy: u.owner !== props.playerIndex
        };

        // this needs to be done separately because the if disambiguates the type
        // of the retrieved catalogEntry
        if (catalogEntry.isBuilding) {
            return (<Building3D {...unitProps} displayEntry={catalogEntry} />);
        } else {
            return (<Unit3D {...unitProps} displayEntry={catalogEntry} />);
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
