import { ThreeCache } from '../gfx/ThreeCache'
import * as THREE from 'three';

import { UnitAction } from '@bananu7-rts/server/src/types'

const cache = new ThreeCache();

const coneGeometry = new THREE.ConeGeometry(0.5, 2, 8);
export function ConeIndicator(props: {action: UnitAction, smoothing: boolean}) {
    // TODO - this will be replaced with animations etc
    let indicatorColor = 0xeeeeee;
    if (props.action === 'Moving')
        indicatorColor = 0x55ff55;
    else if (props.action === 'Attacking')
        indicatorColor = 0xff5555;
    else if (props.action === 'Harvesting')
        indicatorColor = 0x5555ff;
    // indicate discrepancy between server and us
    else if (props.smoothing)
        indicatorColor = 0xffff55;

    return (
        <mesh
            position={[0, 5, 0]}
            rotation={[0, 0, -1.57]}
            geometry={coneGeometry}
            material={cache.getBasicMaterial(indicatorColor)}
        />
    );
}
