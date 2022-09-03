import * as THREE from 'three';
import { useRef, useEffect } from 'react'

export function SelectionCircle(props: { size: number }) {
    const innerRadius = props.size;
    const outerRadius = props.size * 1.1;
    const segments = 32;

    const ref = useRef<THREE.RingGeometry>();

    useEffect(() => {
        if (!ref.current)
            return;
        ref.current.rotateX(-Math.PI/2);
    }, [ref]);

    return (
        <mesh
            name="SelectionRing"
            position={[0, 1, 0]}
        >
            <ringGeometry
                ref={ref}
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