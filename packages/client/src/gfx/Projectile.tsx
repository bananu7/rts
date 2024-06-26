import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three';

import { Position } from '@bananu7-rts/server/src/types'
import { ThreeCache } from './ThreeCache'

const cache = new ThreeCache();

export type ProjectileProps = {
    position: Position
}

export function Projectile(props: ProjectileProps) {
    const projectileTarget = new THREE.Vector3(50, 0, 50);
    const projectilePosition = new THREE.Vector3(props.position.x, 5, props.position.y);
    const projectileRef = useRef<THREE.Mesh>(null);
    useFrame((s, dt) => {
        if(!projectileRef.current)
            return;

        if (projectileRef.current.position.y > 10) {
            projectileRef.current.position.x = props.position.x
            projectileRef.current.position.y = 0;
            projectileRef.current.position.z = props.position.y;
        } else {
            projectileRef.current.position.y += dt * 5;
        }
    });

    return (
        <mesh
            ref={projectileRef}
            material={cache.getBasicMaterial(0xeeeeee)}
            geometry={cache.getCylinderGeometry(1.0)}
        />
    );
}
