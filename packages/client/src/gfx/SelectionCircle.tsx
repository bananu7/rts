import * as THREE from 'three';

export function SelectionCircle(props: { size: number }) {
    const innerRadius = props.size;
    const outerRadius = props.size * 1.1;
    const segments = 32;

    return (
        <mesh
            name="SelectionBox"
            position={[0, 0, 0]}
        >
            <ringGeometry 
                args={[innerRadius, outerRadius, segments]}
            />
            <meshBasicMaterial
                color={0x00ff00}
                opacity={1.0}
                transparent={false}
            />
        </mesh>
    );
}