import { extend, useThree, useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three';

import { debugFlags } from '../debug/flags'

export type MapSpotlightProps = {
    target: THREE.Vector3,
}

export function MapSpotlight(props: MapSpotlightProps) {
    const lightRef = useRef<THREE.SpotLight>(null);
    if (debugFlags.showLightConeHelper)
        useShadowHelper(lightRef);

    const { scene } = useThree();

    useEffect(() => {
        if (!lightRef.current) return;

        const target = new THREE.Object3D();
        target.position.copy(props.target);
        scene.add(target);

        lightRef.current.target = target;
    }, [lightRef]);

    // TODO spotlight setting to allow time of day
    return (
        <group>
            <spotLight 
                ref={lightRef}
                position={[400, 180, 90]}
                angle={0.16}
                distance={0}
                decay={0}
                intensity={4}
                color={0xffffff}

                castShadow
                shadow-camera-near={300}
                shadow-camera-far={500}
                shadow-mapSize-height={1024}
                shadow-mapSize-width={1024}
                shadow-bias={-0.002}
            />
        </group>
     )   
}


export default function useShadowHelper(
    ref: React.RefObject<THREE.Light | undefined>
) {
    const helper = useRef<THREE.CameraHelper>();
    const scene = useThree((state) => state.scene);

    useEffect(() => {
        if (!ref.current) return;

        helper.current = new THREE.CameraHelper(ref.current?.shadow.camera);
        if (helper.current) {
            scene.add(helper.current);
        }

        return () => {
            if (helper.current) {
                scene.remove(helper.current);
            }
        };
    }, [helper.current?.uuid, ref.current]);

    useFrame(() => {
        if (helper.current?.update) {
            helper.current.update();
        }
    });
}