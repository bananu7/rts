import { useLoader, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils';
import { useRef, useEffect, useState, useLayoutEffect, memo } from 'react'

export type FileModelProps = {
    path: string,
    accentColor: THREE.ColorRepresentation,
    animate: boolean, // TODO which anims how fast etc
}

function FileModel_(props: FileModelProps) {
    const gltf = useLoader(GLTFLoader, props.path)

    const origAccentMaterial = gltf.materials['accent'];
    const accentMaterial = (() => {
        if (!origAccentMaterial || !(origAccentMaterial instanceof THREE.MeshStandardMaterial))
            return undefined;
        const accentMaterial = origAccentMaterial.clone();
        accentMaterial.color.set(props.accentColor);
        return accentMaterial;
    })();

    const ref = useRef<THREE.Group>(null);

    let mixer: THREE.AnimationMixer | null = null;
    useFrame((state, delta) => {
        if(!ref.current)
            return;

        if(gltf.animations.length === 0) {
            return;
        }

        if (!mixer) {
            mixer = new THREE.AnimationMixer(ref.current);
            mixer.clipAction(gltf.animations[0]).play();
        }

        if (props.animate)
            mixer.update(delta*5);
    });

    const clonedObject = SkeletonUtils.clone(gltf.scene);
    clonedObject.traverse(o => {
        if (o instanceof THREE.Mesh) {
            if (o.material.name === "accent")
                o.material = accentMaterial;
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });

    return (
        <group
            ref={ref}
            rotation={[0, 0, 0]}
        >
            <primitive object={clonedObject} />
        </group>
    )
}

export const FileModel = memo(FileModel_);
