import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three';

import { Position } from '@bananu7-rts/server/src/types'
import { ThreeCache } from './ThreeCache'

const cache = new ThreeCache();

export type ProjectileProps = {
    position: Position,
    attackRate: number, // TODO this is just flight time?
}

export function Projectile(props: ProjectileProps) {
    const projectileTarget = new THREE.Vector3(50, 0, 50);
    const projectilePosition = new THREE.Vector3(props.position.x, 5, props.position.y);
    const projectileRef = useRef<THREE.Mesh>(null);

    const tRef = useRef<number>(0);

    useFrame((s, dt) => {
        if(!projectileRef.current)
            return;

        const attackRate = props.attackRate;
        const range = 20;
        const e = tRef.current * (1000/attackRate);
        const y = parabolaHeight(range, 10, e);

        if (tRef.current === 0) {
            projectileRef.current.position.x = props.position.x
            projectileRef.current.position.z = props.position.y;
        }

        projectileRef.current.position.y = y;
        projectileRef.current.position.x = props.position.x + e * range;

        tRef.current += dt;
        if (tRef.current > attackRate / 1000)
            tRef.current = 0;
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
