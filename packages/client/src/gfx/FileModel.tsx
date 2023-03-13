import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

import * as THREE from 'three';
import { useRef, useEffect, useState, useLayoutEffect } from 'react'

export type FileModelProps = {
    position: {x: number, y: number},
    path: string,
    accentColor: THREE.ColorRepresentation,
}

export function FileModel(props: FileModelProps) {
    const gltf = useLoader(GLTFLoader, props.path)

    useEffect(() => {
        (gltf.materials['bricksDark(Clone)'] as THREE.MeshStandardMaterial).color.set("#bb3");
        (gltf.materials['stone(Clone)'] as THREE.MeshStandardMaterial).color.set("#ddd");
        //console.log(gltf);
    }, []);

    const [dialScene, setDialScene] = useState<THREE.Object3D | undefined>(undefined);

    if (!dialScene) {
        const dialScene = gltf.scene.clone(true);
        setDialScene(dialScene);
    }

    const accentMaterial = ((gltf.nodes.mesh_0_2 as THREE.Mesh).material as THREE.Material).clone();
    (accentMaterial as THREE.MeshStandardMaterial).color.set(props.accentColor);

    return (
        <group
            position={[props.position.x, 0, props.position.y]}
            scale={[3, 3, 3]}
            rotation={[0, Math.PI/2 - Math.PI/4, 0]}
        >
            {/*<primitive object={dialScene} />*/}
            <mesh castShadow geometry={(gltf.nodes.mesh_0 as THREE.Mesh).geometry} material={(gltf.nodes.mesh_0 as THREE.Mesh).material} />
            <mesh castShadow geometry={(gltf.nodes.mesh_0_1 as THREE.Mesh).geometry} material={(gltf.nodes.mesh_0_1 as THREE.Mesh).material} />
            <mesh castShadow geometry={(gltf.nodes.mesh_0_2 as THREE.Mesh).geometry} material={accentMaterial} />
        </group>
    )
}