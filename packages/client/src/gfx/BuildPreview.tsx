import { useRef, RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Board, Unit, GameMap, UnitId, Position, UnitState, TilePos } from '@bananu7-rts/server/src/types'
import { mapEmptyForBuilding } from '@bananu7-rts/server/src/shared'
import { clampToGrid } from '../game/Grid'

const BRIGHT_GREEN = 0x00ff00;
const DIM_GREEN = 0x33cc33;
const BRIGHT_RED = 0xff0000;
const DIM_RED = 0xcc3333;

type BuildPreviewProps = {
    position: RefObject<Position>;
    building: string;
    map: GameMap;
}
export function BuildPreview(props: BuildPreviewProps) {
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

        const gridPos = clampToGrid(props.position.current);

        // TODO likely needs +3 because ref point for boxgeom is in the middle, make it respect real building size
        ref.current.position.x = gridPos.x + 3;
        ref.current.position.z = gridPos.y + 3;

        if (!blobMatRef.current || !wireMatRef.current)
            return;

        // TODO: building size
        const emptyForBuilding = mapEmptyForBuilding(props.map, 6, gridPos);

        const blobColor = emptyForBuilding ? DIM_GREEN : DIM_RED;
        const wireColor = emptyForBuilding ? BRIGHT_GREEN : BRIGHT_RED;

        blobMatRef.current.color.setHex(blobColor);
        wireMatRef.current.color.setHex(wireColor);
    })

    return (
        <group ref={ref} position={[-100, 2, -100]}>
            <mesh>
                <boxGeometry args={[unitSize, 2, unitSize]} />
                <meshBasicMaterial ref={blobMatRef} transparent={true} opacity={0.5} />
            </mesh>
            <mesh>
                <boxGeometry args={[unitSize, 2, unitSize]} />
                <meshBasicMaterial ref={wireMatRef} wireframe={true}/>
            </mesh>
            <group position={[0, -1, 0]}>
                <gridHelper args={[14, 7]} />
            </group>
        </group>
    );
}
