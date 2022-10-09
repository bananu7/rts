import { useRef, useLayoutEffect } from 'react'
import { extend, ReactThreeFiber } from '@react-three/fiber';
import { Line } from 'three';

// Add class `Line` as `Line_` to react-three-fiber's extend function. This
// makes it so that when you use <line_> in a <Canvas>, the three reconciler
// will use the class `Line`
extend({ Line_: Line });

// declare `line_` as a JSX element so that typescript doesn't complain
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'line_': ReactThreeFiber.Object3DNode<Line, typeof Line>,
        }
    }
}

export type Line3DProps = {
    points: THREE.Vector3[],
}

export function Line3D(props: Line3DProps) {
    const ref = useRef<THREE.Line>(null);
    useLayoutEffect(() => {
        if(!ref.current) return;
        ref.current.geometry.setFromPoints(props.points);
    }, [props.points]);

    return (
        <line_ ref={ref}>
            <bufferGeometry />
            <lineBasicMaterial color="yellow" />
        </line_>
    )
}