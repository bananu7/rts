import * as THREE from 'three';
import { useRef, useEffect } from 'react'

const enemyMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000
});

const friendlyMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00
});

export function SelectionCircle(props: { size: number, enemy?: boolean }) {
    const innerRadius = props.size;
    const outerRadius = props.size * 1.1;
    const segments = 32;

    const ref = useRef<THREE.Mesh>(null);

    useEffect(() => {
        if (!ref.current)
            return;
        ref.current.rotateX(-Math.PI/2);
    }, [ref]);

    return (
        <mesh
            ref={ref}
            name="SelectionRing"
            position={[0, 0, 0]}
            material={props.enemy ? enemyMaterial : friendlyMaterial}
        >
            <ringGeometry args={[innerRadius, outerRadius, segments]} />
        </mesh>
    );
}