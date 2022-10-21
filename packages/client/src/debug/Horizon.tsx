import * as THREE from 'three';
import { useRef, useEffect } from 'react'

const material = new THREE.MeshBasicMaterial({
    color: 0xcc1111
});

const ringGeometry = new THREE.RingGeometry(1, 1.1, 32);

export function Horizon(props: { obstacles: [number, number][]}) {
    const innerRadius = 5
    const outerRadius = 5 * 1.1;
    const segments = 32;

    const ref = useRef<THREE.Group>(null);

    useEffect(() => {
        if (!ref.current)
            return;
        ref.current.rotateX(-Math.PI/2);
    }, [ref]);

    const obstacles = props.obstacles.map(([a,b], i) => {
        const thetaStart = a;
        const thetaLength = b-a;

        return (<mesh
            key={i}
            name="SelectionRing"
            position={[0, 0, 0]}
            material={material}
            geometry={ringGeometry}
        >
            <ringGeometry args={[innerRadius, outerRadius, segments, thetaStart, thetaLength]} />
        </mesh>);
    });

    return (
        <group ref={ref}>
            { obstacles }
        </group>
    );
}