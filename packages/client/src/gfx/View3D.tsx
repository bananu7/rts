import { ReactThreeFiber, Canvas, extend, useThree, useFrame } from '@react-three/fiber'
import { Suspense, useRef, useEffect, useLayoutEffect, useState, CSSProperties } from 'react'

import * as THREE from 'three';

import { MapLight } from './MapLight'
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
    const middleOfTheMap = new THREE.Vector3(props.viewX/2, 0, props.viewY/2);

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
                    <color attach="background" args={[0x111111]} />
                    <CameraControls minPan={minPan} maxPan={maxPan} startTarget={startTarget} />
                    <ambientLight args={[0xffffff, 2]} />
                    <MapLight target={middleOfTheMap}/>
                    {props.children}
                    <Stats />
                </Canvas>
            </div>
        </Suspense>
    )
}
