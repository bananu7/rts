import { ReactThreeFiber, Canvas, extend, useThree, useFrame } from '@react-three/fiber'
import { Suspense, useRef, useEffect, useLayoutEffect, useState, CSSProperties } from 'react'

import StatsImpl from 'three/examples/jsm/libs/stats.module.js'

import * as THREE from 'three';

import { MapControls } from './MapControls'

function Stats() {
  const [stats] = useState(() => new StatsImpl())
  useEffect(() => {
    stats.showPanel(0)
    document.body.appendChild(stats.dom)
    return () => document.body.removeChild(stats.dom)
  }, [stats])
  return useFrame(state => {
    stats.begin()
    state.gl.render(state.scene, state.camera)
    stats.end()
  }, 1)
}

function CameraControls() {
    const { camera, gl: { domElement }, scene } = useThree();

    const vert = Math.PI * 0.2;
    const horiz = Math.PI * 1.0;

    useLayoutEffect (() => {
        const c = new MapControls( camera, domElement );

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
    //useShadowHelper(lightRef);

    const { scene } = useThree();

    useEffect(() => {
        if (!lightRef.current) return;

        const target = new THREE.Object3D();
        target.position.set(50, 0, 50);
        scene.add(target);lightRef

        lightRef.current.target = target;
    }, [lightRef]);

    return (
        <group>
            <spotLight 
                ref={lightRef}
                position={[400, 180, 90]}
                angle={0.16}
                distance={0}
                decay={0}
                intensity={6}
                color={0xffffff}

                castShadow
                shadow-camera-near={300}
                shadow-camera-far={500}
                shadow-mapSize-height={1024}
                shadow-mapSize-width={1024}
            />
        </group>
     )   
}


export interface Props {
    children: JSX.Element | JSX.Element[];
    onPointerMissed?: () => void;

    enablePan?: boolean;
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

    return (
        <Suspense fallback={null}>
            <div style={style} >
                <Canvas
                    camera={{ fov: 60, near: 0.1, far: 2000, up:[0,1,0], position: [50, 90, 90] }}
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
                    <CameraControls />
                    <ambientLight />
                    <MapSpotlight />
                    {props.children}
                    <Stats />
                </Canvas>
            </div>
        </Suspense>
    )
}
