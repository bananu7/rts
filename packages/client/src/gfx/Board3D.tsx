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

import { Board, Unit, GameMap, UnitId, Position } from 'server/types'
import { SelectionCircle } from './SelectionCircle'

type Unit3DProps = {
    unit: Unit,
    selected: boolean,
    click?: (id: UnitId, button: number) => void,
}

export function Unit3D(props: Unit3DProps) {
    //const [catalog] = useState(() => require('../../assets/catalog.json'));
    //const clone = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf]);

    const onClick = (e: ThreeEvent<MouseEvent>) => {
        console.log('unit click', props.unit.id)
        e.stopPropagation();

        if (props.click)
            props.click(props.unit.id, e.button);
    }

    // TODO better color choices
    const color = props.unit.owner === 1 ? 0x1111ee : 0xee1111;

    // TODO proper unit catalog
    const isBuilding = props.unit.kind === 'Base' || props.unit.kind === 'Barracks';
    const unitSize = isBuilding ? 40 : 10;

    return (
        <group 
            position={[props.unit.position.x, 10, props.unit.position.y]}
            name={`Unit_${props.unit.id}`}
        >
            <mesh
                onClick={ onClick }
                onContextMenu={ onClick }
            >
                <boxGeometry args={[unitSize, 10, unitSize]} />
                <meshBasicMaterial
                    color={color}
                    opacity={1.0}
                    transparent={false}
                />
            </mesh>
            { props.selected && <SelectionCircle size={unitSize} /> }
        </group>
    );
}

type Click = (p: Position, button: number) => void;
type RawClick = (e: ThreeEvent<MouseEvent>) => void;

function Tile (props : {x: number, y: number, color: number, click: RawClick}) {
    const xSize = 10;
    const ySize = 10;

    return (
        <mesh
            position={[xSize/2 + props.x * xSize, 0, ySize/2 + props.y * ySize]}
            onClick={props.click}
            onContextMenu={props.click}
         >
            <boxGeometry args={[xSize, 1, ySize]} />
            <meshBasicMaterial
                color={props.color}
                opacity={1.0}
                transparent={false}
            />
        </mesh>
    );
}

export function Map3D(props: { map: GameMap, click: Click } ) {
    const rawClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        // turn the 3D position into the 2D map position
        props.click({x: e.point.x, y: e.point.z}, e.button);
    };

    let tiles = [];
    for (let y = 0; y < 20; y++){
        for (let x = 0; x < 20; x++) {
            const ix = x*props.map.w+y;
            const color = props.map.tiles[ix] === 0 ? 0x11ee11 : 0x111111;
            tiles.push(
                <Tile key={ix} x={x} y={y} color={color} click={rawClick} />
            )
        }
    }

    return (
        <group name="Game Map">
            {tiles}
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
    const addSelectOne = (u: UnitId, b: number) => {
        if (b === 0)
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
            <Map3D map={props.board.map} click={mapClick} />
            { units }
        </group>
    );
}
