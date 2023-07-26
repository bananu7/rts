import { useRef, RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Board, Unit, GameMap, UnitId, Position, UnitState, TilePos } from '@bananu7-rts/server/src/types'
import { mapEmptyForBuilding } from '@bananu7-rts/server/src/shared'

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
