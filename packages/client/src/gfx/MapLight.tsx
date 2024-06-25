import { extend, useThree, useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three';

import { debugFlags } from '../debug/flags'

export type MapLightProps = {
    target: THREE.Vector3,
}

export function MapLight(props: MapLightProps) {
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

    return (
        <group>
            <directionalLight 
                ref={lightRef}
                // TODO time of day
                position={[400, 180, 90]}
                distance={0}
                decay={0}
                intensity={3}
                color={0xffffff}

                castShadow
                shadow-camera-near={100}
                shadow-camera-far={500}
                shadow-mapSize-height={1024}
                shadow-mapSize-width={1024}

                shadow-camera-bottom={props.target.x}
                shadow-camera-top={-props.target.x}
                shadow-camera-left={-props.target.z}
                shadow-camera-right={props.target.z}

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