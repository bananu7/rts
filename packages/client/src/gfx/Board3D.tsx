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


type Line3DProps = {
    points: THREE.Vector3[],
}
function Line3D(props: Line3DProps) {
    const ref = useRef<THREE.Line>()
    useLayoutEffect(() => {
        if(!ref.current) return;
        ref.current.geometry.setFromPoints(props.points);
    }, [props.points]);

    return (
        <line ref={ref}>
            <bufferGeometry />
            <lineBasicMaterial color="yellow" />
        </line>
    )
}

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
            props.click(props.unit.id, e.button);
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
                >
                    <boxGeometry args={[unitSize, 2, unitSize]} />
                    <meshBasicMaterial color={color} />
                </mesh>
                { props.selected && <SelectionCircle size={unitSize} /> }    
            </group>
        </group>
    );
}

type Click = (p: Position, button: number) => void;
type RawClick = (e: ThreeEvent<MouseEvent>) => void;
type Box = { x1: number, y1: number, x2: number, y2: number };

type Map3DProps = {
    map: GameMap,
    click: Click,
    selectInBox: (box: Box) => void;
}

export function Map3D(props: Map3DProps) {
    // movement
    const rawClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        // turn the 3D position into the 2D map position
        props.click({x: e.point.x, y: e.point.z}, e.button);
    };

    // selection box
    const [drag, setDrag] = useState<{x:number, y:number}|undefined>(undefined);
    const pointerDown = e => {
        setDrag({x: e.point.x, y: e.point.z});
    };
    const pointerUp = e => {
        if (e.button !== 0)
            return;
        if (drag) {
            props.selectInBox({x1: drag.x, y1: drag.y, x2: e.point.x, y2: e.point.z});
        }
        setDrag(undefined);
    };


    const w = props.map.w;
    const h = props.map.h;

    const xSize = 1;
    const ySize = 1;

    const ref = useRef<THREE.InstancedMesh>()
    useLayoutEffect(() => {
        if (!ref.current)
            return;

        const mat4Pos = new THREE.Matrix4();
        const vec3Color = new THREE.Color();

        for (let y = 0; y < w; y++){
            for (let x = 0; x < h; x++) {
                const ix = y*props.map.w+x;
                const color = props.map.tiles[ix] === 0 ? 0x11cc11 : 0x111111;
                
                mat4Pos.makeTranslation((x + 0.5) * xSize, 0, (y + 0.5) * ySize);
                vec3Color.set(color);

                ref.current.setMatrixAt(ix, mat4Pos);
                ref.current.setColorAt(ix, vec3Color);
            }
        }
        ref.current.instanceMatrix.needsUpdate = true
        ref.current.instanceColor.needsUpdate = true
    }, [props.map])

    return (
        <group name="Game Map">
            <mesh 
                name="Click Mesh"
                onContextMenu={rawClick}
                onPointerDown={pointerDown}
                onPointerUp={pointerUp}
                position={[xSize*0.5*w, 0, ySize*0.5*h]}
            >
                <boxGeometry args={[xSize*w, 1, ySize*h]} />
                <meshBasicMaterial opacity={0} transparent={true} />
            </mesh>

            <instancedMesh ref={ref} args={[undefined, undefined, w*h]}>
                {/*<planeGeometry args={[xSize, ySize]} />*/}
                <boxGeometry args={[xSize, 1, ySize]} />
                <meshBasicMaterial />
            </instancedMesh>
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
        // Add unit to selection TODO - require shift for that
        if (b === 0) {
            props.select(props.selectedUnits.add(u));
        } else if (b === 2) {
            props.unitRightClick(u);
        }
    }

    const units = props.unitStates.map(u => 
        (<Unit3D
            key={u.id}
            unit={u}
            click={handleUnitClick}
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
            <Map3D map={props.board.map} click={mapClick} selectInBox={selectInBox} />
            { units }
        </group>
    );
}
