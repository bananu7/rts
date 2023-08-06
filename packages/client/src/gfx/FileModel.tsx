import { useLoader, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils';
import { useRef, useEffect, useState, useLayoutEffect, memo } from 'react'

export type FileModelProps = {
    path: string,
    accentColor: THREE.ColorRepresentation,
    animate?: string, // TODO which anims how fast etc
}

const ACCENT_MATERIAL_NAME = 'Accent';

function FileModel_(props: FileModelProps) {
    const gltf = useLoader(GLTFLoader, props.path)

    const origAccentMaterial = gltf.materials[ACCENT_MATERIAL_NAME];
    const accentMaterial = (() => {
        if (!origAccentMaterial || !(origAccentMaterial instanceof THREE.MeshStandardMaterial))
            return undefined;
        const accentMaterial = origAccentMaterial.clone();
        accentMaterial.color.set(props.accentColor);
        return accentMaterial;
    })();

    const ref = useRef<THREE.Group>(null);

    let mixer: THREE.AnimationMixer | null = null;

    interface Animations {
        [key: string]: THREE.AnimationClip;
    }
    const animations: Animations = {};

    useFrame((state, delta) => {
        if(!ref.current)
            return;

        if(gltf.animations.length === 0) {
            return;
        }

        if (!mixer) {
            mixer = new THREE.AnimationMixer(ref.current);

            // TODO streamline
            const idleAnimation = gltf.animations.find(a => a.name === "Idle");
            if (idleAnimation)
                animations['Idle'] = idleAnimation;

            const moveAnimation = gltf.animations.find(a => a.name === "Move");
            if (moveAnimation)
                animations['Moving'] = moveAnimation;

            const harvestAnimation = gltf.animations.find(a => a.name === "Harvest");
            if (harvestAnimation)
                animations['Harvesting'] = harvestAnimation;

            const attackAnimation = gltf.animations.find(a => a.name === "Attack");
            if (attackAnimation)
                animations['Attacking'] = attackAnimation;
        }

        if (props.animate) {
            const action = animations[props.animate];
            if (action) {
                mixer.clipAction(action).play();
                mixer.update(delta);
            }
        }
    });

    const clonedObject = SkeletonUtils.clone(gltf.scene);
    clonedObject.traverse(o => {
        if (o instanceof THREE.Mesh) {
            if (o.material.name === ACCENT_MATERIAL_NAME)
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
