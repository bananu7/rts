import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three';

import { Position, Milliseconds } from '@bananu7-rts/server/src/types'
import { ThreeCache } from './ThreeCache'

const cache = new ThreeCache();

export type ProjectileProps = {
    origin: Position,
    target: Position,
    flightTime: Milliseconds,
    flightTimeLeft: Milliseconds,
}

export function Projectile3D(props: ProjectileProps) {
    const projectilePosition = new THREE.Vector3(props.origin.x, 5, props.origin.y);
    const projectileRef = useRef<THREE.Mesh>(null);

    const startPos = new THREE.Vector3(props.origin.x, 0, props.origin.y);
    const targetPos = new THREE.Vector3(props.target.x, 0, props.target.y);

    const flightTimeLeft = useRef<number>(props.flightTimeLeft);

    // if(time_since_fire *  projectile_speed > distance(target, shot_location)) hit(target, projectile);

    useFrame((s, dt) => {
        if(!projectileRef.current)
            return;

        flightTimeLeft.current -= dt * 1000;
        if (flightTimeLeft.current <= 0)
            return;

        const range = 20;
        const e = 1 - (flightTimeLeft.current / props.flightTime);
        const y = parabolaHeight(range, 10, e);

        projectileRef.current.position.lerpVectors(startPos, targetPos, e);
        projectileRef.current.position.y = y;
    });

    return (
        <mesh
            ref={projectileRef}
            material={cache.getBasicMaterial(0xeeeeee)}
            geometry={cache.getCylinderGeometry(1.0)}
        />
    );
}

function parabolaHeight(length: number, height: number, epsilon: number) {
    const k = length;
    const h = height;

    const x = epsilon * k;

    return 4*h * (x/k - (x*x)/(k*k));
}
