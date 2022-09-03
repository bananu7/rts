import { ReactThreeFiber, Canvas, extend, useThree, useFrame } from '@react-three/fiber'
import { Suspense, useRef, useEffect, useLayoutEffect, useState } from 'react'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import * as THREE from 'three';

function CameraControls() {
    const { camera, gl: { domElement } } = useThree();

    const vert = Math.PI * 0.2;
    const horiz = Math.PI * 1.0;

    useEffect (() => {
        const c = new OrbitControls( camera, domElement );

        c.minDistance = 10;
        c.maxDistance = 50;

        c.minPolarAngle = (Math.PI / 2) - vert;
        c.maxPolarAngle = (Math.PI / 2) + vert;

        c.minAzimuthAngle = -horiz;
        c.maxAzimuthAngle = horiz;

        c.enablePan = true;
        c.enableRotate = true;

        c.target = new THREE.Vector3(90,0,90);

        return () => {
            c.dispose();
        }
    }, [camera, domElement]);

    return null;
};


export interface Props {
    children: JSX.Element | JSX.Element[];
    onPointerMissed?: () => void;

    enablePan?: boolean;
}

export function View3D(props: Props) {
    const enablePan = props.enablePan ?? false;
    const style = {
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
                    camera={{ fov: 60, near: 0.1, far: 2000, up:[0,1,0], position:[100,100,100] }}
                    gl={{
                        physicallyCorrectLights: true,
                        pixelRatio: window.devicePixelRatio,
                    }}
                    linear={true}
                    flat={true}
                    onPointerMissed={ props.onPointerMissed }
                >
                    {/*<color attach="background" args={["red"]} />*/}
                    <CameraControls />
                    <pointLight position={[-10, 10, 0]} distance={50} decay={1.1} intensity={300} color={0xcecece}/>
                    <pointLight position={[30, 10, 0]} distance={50} decay={1.1} intensity={300} color={0xcecece}/>
                    {props.children}
                </Canvas>
            </div>
        </Suspense>
    )
}
