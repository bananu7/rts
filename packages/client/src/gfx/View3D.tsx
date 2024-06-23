import { ReactThreeFiber, Canvas, extend, useThree, useFrame } from '@react-three/fiber'
import { Suspense, useRef, useEffect, useLayoutEffect, useState, CSSProperties } from 'react'
import { debugFlags } from '../debug/flags'

import * as THREE from 'three';

import { MapControls } from './MapControls'
import { Stats } from './Stats'


type CameraControlsProps = {
    minPan: THREE.Vector3,
    maxPan: THREE.Vector3,
}
function CameraControls(props: CameraControlsProps) {
    const { camera, gl: { domElement }, scene } = useThree();

    const vert = Math.PI * 0.2;
    const horiz = Math.PI * 1.0;

    useLayoutEffect (() => {
        const c = new MapControls( camera, props.minPan, props.maxPan, domElement);

        c.minDistance = 30;
        c.maxDistance = 300;

        c.minAzimuthAngle = -horiz;
        c.maxAzimuthAngle = horiz;

        c.enableRotate = false;

        c.target = new THREE.Vector3(50, 0, 50);
        c.update();

        return () => {
            c.dispose();
        }
    }, [camera, domElement]);

    return null;
};

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

function MapSpotlight() {
    const lightRef = useRef<THREE.SpotLight>(null);
    // uncomment to enable
    if (debugFlags.showLightConeHelper)
        useShadowHelper(lightRef);

    const { scene } = useThree();

    useEffect(() => {
        if (!lightRef.current) return;

        const target = new THREE.Object3D();
        target.position.set(50, 0, 50);
        scene.add(target);lightRef

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


export interface Props {
    children: JSX.Element | JSX.Element[];
    onPointerMissed?: () => void;

    enablePan?: boolean;

    // map size
    viewX: number;
    viewY: number;
}

export function View3D(props: Props) {
    const enablePan = props.enablePan ?? false;
    const style : CSSProperties = {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top:0,
        left:0,
        //zIndex: -1
    }

    const minPan = new THREE.Vector3(15, 0, 15);
    const maxPan = new THREE.Vector3(85, 10, 85);

    return (
        <Suspense fallback={null}>
            <div style={style} >
                <Canvas
                    camera={{ fov: 27.8, near: 10, far: 500, up:[0,1,0], position: [50, 60, 90] }}
                    gl={{
                        physicallyCorrectLights: true,
                        pixelRatio: window.devicePixelRatio,
                    }}
                    linear={true}
                    flat={true}
                    shadows={{ type: THREE.BasicShadowMap }} // THREE.PCFSoftShadowMap
                    onPointerMissed={ props.onPointerMissed }
                    dpr={1}
                >
                    <color attach="background" args={[0x11aa11]} />
                    <CameraControls minPan={minPan} maxPan={maxPan} />
                    <ambientLight args={[0xffffff, 2]} />
                    <MapSpotlight />
                    {props.children}
                    <Stats />
                </Canvas>
            </div>
        </Suspense>
    )
}
