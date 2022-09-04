import { ReactThreeFiber, Canvas, extend, useThree, useFrame } from '@react-three/fiber'
import { Suspense, useRef, useEffect, useLayoutEffect, useState, CSSProperties } from 'react'

import * as THREE from 'three';

import { MapControls } from './MapControls'

function CameraControls() {
    const { camera, gl: { domElement } } = useThree();

    const vert = Math.PI * 0.2;
    const horiz = Math.PI * 1.0;

    useEffect (() => {
        const c = new MapControls( camera, domElement );

        c.minDistance = 100;
        c.maxDistance = 1000;

        c.minAzimuthAngle = -horiz;
        c.maxAzimuthAngle = horiz;

        c.enableRotate = false;

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
                    camera={{ fov: 60, near: 0.1, far: 2000, up:[0,1,0], position: [0, 200, 200] }}
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
