import { useCallback, useEffect, useState, useRef, Suspense, useLayoutEffect, useMemo, memo, Ref, RefObject } from 'react'

import {
    useLoader, Canvas, useFrame,
    useThree,
    ReactThreeFiber,
    ThreeEvent
} from '@react-three/fiber'

import * as THREE from 'three';

import { Board, Unit, GameMap, UnitId, Position, TilePos, Building } from '@bananu7-rts/server/src/types'
import { getAttackerComponent } from '@bananu7-rts/server/src/game/components'
import { notEmpty } from '@bananu7-rts/server/src/tsutil'
import { SelectionCircle } from './SelectionCircle'
import { Line3D } from './Line3D'
import { Map3D, Box } from './Map3D'
import { Unit3D } from './Unit3D'
import { Building3D } from './Building3D'
import { BuildPreview } from './BuildPreview'
import { Projectile } from './Projectile'
import { UNIT_DISPLAY_CATALOG, BuildingDisplayEntry } from './UnitDisplayCatalog'

import { SelectedCommand } from '../game/SelectedCommand'
import { getBuildingSizeFromBuildingName } from '../game/UnitQuery'

export interface Props {
    board: Board;
    playerIndex: number;
    units: Unit[];
    selectedUnits: Set<UnitId>;
    selectedCommand: SelectedCommand | undefined;

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

    const units = props.units.map(u => {
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
        if (props.selectedCommand)
            return;

        function isInBox(p: Position, b: Box) {
            const x1 = b.x1 < b.x2 ? b.x1 : b.x2;
            const x2 = b.x1 < b.x2 ? b.x2 : b.x1;
            const y1 = b.y1 < b.y2 ? b.y1 : b.y2;
            const y2 = b.y1 < b.y2 ? b.y2 : b.y1;
            return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
        }

        const selection = props.units
            .filter(u => isInBox(u.position, box))
            .filter(u => u.owner === props.playerIndex)
            .map(u => u.id);

        props.select(new Set(selection), shift);
    };

    const createBuildPreview = useCallback(() => {
        if (!props.selectedCommand)
            return;

        if (props.selectedCommand.command !== 'Build')
            return;

        const buildingSize = getBuildingSizeFromBuildingName(props.selectedCommand.building);

        return (<BuildPreview
            buildingSize={buildingSize}
            position={pointer}
            map={props.board.map}
            units={props.units} // to check viability
        />);
    }, [props.selectedCommand]);

    const buildPreview = useMemo(() => createBuildPreview(), [props.selectedCommand]);

    return (
        <group name="board">
            <Map3D
                map={props.board.map}
                click={props.mapClick}
                selectInBox={selectInBox}
                pointerMove={setPointer}
            />
            <Projectiles units={props.units} />
            { units }
            { buildPreview }
        </group>
    );
}

function Projectiles(props: { units: Unit[] }) {
    const projectiles = props.units.map(unit => {
        const ac = getAttackerComponent(unit);
        if (unit.state.state !== "active"
            || unit.state.current.typ !== "Attack"
            || unit.state.action !== "Attacking"
        ) {
            return undefined;
        }

        const targetId = unit.state.current.target;
        const target = props.units.find(u => u.id === targetId);

        if (!target)
            return undefined;

        return (
            <Projectile
                position={unit.position}
                target={target.position}
                attackRate={ac.attackRate}
            />
        )

    }).filter(notEmpty);

    return (<group name="Projectiles">
        { projectiles }
    </group>)
}

