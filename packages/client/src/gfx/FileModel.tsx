import { useLoader, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

import * as THREE from 'three';
import { useRef, useEffect, useState, useLayoutEffect, memo } from 'react'

export type FileModelProps = {
    path: string,
    accentColor: THREE.ColorRepresentation,
}

function FileModel_(props: FileModelProps) {
    const gltf = useLoader(GLTFLoader, props.path)

    useEffect(() => {
        console.log(gltf);
    }, []);

    const origAccentMaterial = gltf.materials['accent'];
    const accentMaterial = (() => {
        if (!origAccentMaterial || !(origAccentMaterial instanceof THREE.MeshStandardMaterial))
            return undefined;
        const accentMaterial = origAccentMaterial.clone();
        accentMaterial.color.set(props.accentColor);
        return accentMaterial;
    })();

    const nodes = [];
    for (const n in gltf.nodes) {
        const node = gltf.nodes[n];

        if (node instanceof THREE.SkinnedMesh) {
            const material = node.material === origAccentMaterial ? accentMaterial : node.material;

            // TODO pull rotation and scaling info
            nodes.push(<skinnedMesh
                castShadow
                key={n}
                geometry={node.geometry}
                material={material}
                skeleton={node.skeleton}
            />);
        }
        else if (node instanceof THREE.Mesh) {
            const material = node.material === origAccentMaterial ? accentMaterial : node.material;

            // TODO pull rotation and scaling info
            nodes.push(<mesh
                castShadow
                key={n}
                geometry={node.geometry}
                material={material}
            />);
        } else {
            nodes.push(<primitive key={n} object={node} />);
        }
    }

    const ref = useRef<THREE.Group>(null);

    let mixer: THREE.AnimationMixer | null = null;
    useFrame((state, delta) => {
        if(!ref.current)
            return;

        if(gltf.animations.length === 0) {
            return;
        }

        if (!mixer) {
            console.log("new mixer")
            mixer = new THREE.AnimationMixer(ref.current);
            
            //mixer.clipAction(gltf.animations[0]).play();
            //console.log("playing")
        }

        //mixer.update(delta);
    });

    return (
        <group
            ref={ref}
            rotation={[0, 0, 0]}
        >
            {nodes}
        </group>
    )
}

export const FileModel = memo(FileModel_);


function PeasantModel_(props: FileModelProps) {
    const gltf = useLoader(GLTFLoader, props.path)

    useEffect(() => {
        console.log(gltf);
    }, []);

    const origAccentMaterial = gltf.materials['accent'];
    const accentMaterial = (() => {
        if (!origAccentMaterial || !(origAccentMaterial instanceof THREE.MeshStandardMaterial))
            return undefined;
        const accentMaterial = origAccentMaterial.clone();
        accentMaterial.color.set(props.accentColor);
        return accentMaterial;
    })();

    const nodes = gltf.nodes as any;
  
    const ref = useRef<THREE.Group>(null);

    let mixer: THREE.AnimationMixer | null = null;
    useFrame((state, delta) => {
        if(!ref.current)
            return;

        if(gltf.animations.length === 0) {
            return;
        }

        if (!mixer) {
            console.log("new mixer")
            mixer = new THREE.AnimationMixer(ref.current);
            
            mixer.clipAction(gltf.animations[0]).play();
            //console.log("playing")
        }

        mixer.update(delta);
    });

    return (
    <group ref={ref} {...props} dispose={null}>
      <group name="Scene">
        <group
          name="Armature"
          position={[0, 0.9, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={3}
        >
          <primitive object={nodes.Spine} />
          <primitive object={nodes.Left_Hip} />
          <primitive object={nodes.Right_Hip} />
          <primitive object={nodes.neutral_bone} />
          <primitive object={nodes.neutral_bone_1} />
          <primitive object={nodes.neutral_bone_2} />
          <primitive object={nodes.neutral_bone_3} />
          <primitive object={nodes.neutral_bone_4} />
          <primitive object={nodes.neutral_bone_5} />
          <skinnedMesh
            name="arm_left"
            geometry={nodes.arm_left.geometry}
            material={nodes.arm_left.material}
            skeleton={nodes.arm_left.skeleton}
          />
          <skinnedMesh
            name="arm_right"
            geometry={nodes.arm_right.geometry}
            material={nodes.arm_right.material}
            skeleton={nodes.arm_right.skeleton}
          />
          <group name="head">
            <skinnedMesh
              name="Mesh_head_default_Instance"
              geometry={nodes.Mesh_head_default_Instance.geometry}
              material={nodes.Mesh_head_default_Instance.material}
              skeleton={nodes.Mesh_head_default_Instance.skeleton}
            />
            <skinnedMesh
              name="Mesh_head_default_Instance_1"
              geometry={nodes.Mesh_head_default_Instance_1.geometry}
              material={nodes.Mesh_head_default_Instance_1.material}
              skeleton={nodes.Mesh_head_default_Instance_1.skeleton}
            />
            <skinnedMesh
              name="Mesh_head_default_Instance_2"
              geometry={nodes.Mesh_head_default_Instance_2.geometry}
              material={nodes.Mesh_head_default_Instance_2.material}
              skeleton={nodes.Mesh_head_default_Instance_2.skeleton}
            />
            <skinnedMesh
              name="Mesh_head_default_Instance_3"
              geometry={nodes.Mesh_head_default_Instance_3.geometry}
              material={nodes.Mesh_head_default_Instance_3.material}
              skeleton={nodes.Mesh_head_default_Instance_3.skeleton}
            />
          </group>
          <group name="leg_left">
            <skinnedMesh
              name="Mesh_leg_boots_Instance"
              geometry={nodes.Mesh_leg_boots_Instance.geometry}
              material={nodes.Mesh_leg_boots_Instance.material}
              skeleton={nodes.Mesh_leg_boots_Instance.skeleton}
            />
            <skinnedMesh
              name="Mesh_leg_boots_Instance_1"
              geometry={nodes.Mesh_leg_boots_Instance_1.geometry}
              material={nodes.Mesh_leg_boots_Instance_1.material}
              skeleton={nodes.Mesh_leg_boots_Instance_1.skeleton}
            />
          </group>
          <group name="leg_right">
            <skinnedMesh
              name="Mesh_leg_boots_Instance001"
              geometry={nodes.Mesh_leg_boots_Instance001.geometry}
              material={nodes.Mesh_leg_boots_Instance001.material}
              skeleton={nodes.Mesh_leg_boots_Instance001.skeleton}
            />
            <skinnedMesh
              name="Mesh_leg_boots_Instance001_1"
              geometry={nodes.Mesh_leg_boots_Instance001_1.geometry}
              material={nodes.Mesh_leg_boots_Instance001_1.material}
              skeleton={nodes.Mesh_leg_boots_Instance001_1.skeleton}
            />
          </group>
          <group name="torso">
            <skinnedMesh
              name="Mesh_torso_default_Instance"
              geometry={nodes.Mesh_torso_default_Instance.geometry}
              material={nodes.Mesh_torso_default_Instance.material}
              skeleton={nodes.Mesh_torso_default_Instance.skeleton}
            />
            <skinnedMesh
              name="Mesh_torso_default_Instance_1"
              geometry={nodes.Mesh_torso_default_Instance_1.geometry}
              material={nodes.Mesh_torso_default_Instance_1.material}
              skeleton={nodes.Mesh_torso_default_Instance_1.skeleton}
            />
            <skinnedMesh
              name="Mesh_torso_default_Instance_2"
              geometry={nodes.Mesh_torso_default_Instance_2.geometry}
              material={nodes.Mesh_torso_default_Instance_2.material}
              skeleton={nodes.Mesh_torso_default_Instance_2.skeleton}
            />
          </group>
        </group>
      </group>
    </group>
    )
}

export const PeasantModel = memo(PeasantModel_);