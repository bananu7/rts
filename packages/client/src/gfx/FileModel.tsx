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
        //console.log(gltf);
    }, []);

    const [dialScene, setDialScene] = useState<THREE.Object3D | undefined>(undefined);

    if (!dialScene) {
        const dialScene = gltf.scene.clone(true);
        setDialScene(dialScene);
    }

    const origAccentMaterial = gltf.materials['accent'];
    if (!origAccentMaterial || !(origAccentMaterial instanceof THREE.MeshStandardMaterial))
        throw new Error ("No accent material in FileModel");
    const accentMaterial = origAccentMaterial.clone();
    accentMaterial.color.set(props.accentColor);

    const meshes = [];
    for (const n in gltf.nodes) {
        const mesh = (gltf.nodes[n] as THREE.Mesh);
        meshes.push(<mesh
            castShadow
            geometry={mesh.geometry}
            material={mesh.material === origAccentMaterial ? accentMaterial : mesh.material}
        />);
    }

    return (
        <group
            position={[props.position.x, 0, props.position.y]}
            scale={[3, 3, 3]}
            rotation={[0, 0, 0]}
        >
            {meshes}
        </group>
    )
}