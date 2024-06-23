import { ReactThreeFiber, Canvas, extend, useThree, useFrame } from '@react-three/fiber'
import { Suspense, useRef, useEffect, useLayoutEffect, useState, CSSProperties } from 'react'
import { debugFlags } from '../debug/flags'

import * as THREE from 'three';

import { MapControls } from './MapControls'
import { Stats } from './Stats'
import { Position} from '@bananu7-rts/server/src/types'

type CameraControlsProps = {
    minPan: THREE.Vector3,
    maxPan: THREE.Vector3,
    startTarget: THREE.Vector3,
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

        c.target = props.startTarget;
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
        target.position.set(100, 0, 50);
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


export type Props = {
    children: JSX.Element | JSX.Element[],
    onPointerMissed?: () => void,

    enablePan?: boolean,

    startPosition: Position,
    // map size
    viewX: number,
    viewY: number,
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

    const border = 15.0;
    const minPan = new THREE.Vector3(border, 0, border);
    const maxPan = new THREE.Vector3(props.viewX - border, 10, props.viewY - border);
    const startTarget = new THREE.Vector3(props.startPosition.x, 0, props.startPosition.y);
    // TODO specify that as angles
    const startCameraPosition = new THREE.Vector3();
    startCameraPosition.copy(startTarget);
    startCameraPosition.y += 60;
    startCameraPosition.z += 40;

    return (
        <Suspense fallback={null}>
            <div style={style} >
                <Canvas
                    camera={{
                        fov: 27.8,
                        near: 10,
                        far: 500,
                        up:[0,1,0],

                        position: startCameraPosition,
                    }}
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
                    <CameraControls minPan={minPan} maxPan={maxPan} startTarget={startTarget} />
                    <ambientLight args={[0xffffff, 2]} />
                    <MapSpotlight />
                    {props.children}
                    <Stats />
                </Canvas>
            </div>
        </Suspense>
    )
}
