import { OrbitControls } from "./OrbitControls";
import * as THREE from 'three';

export class MapControls extends OrbitControls {
    constructor(camera : THREE.Camera, minPan: THREE.Vector3, maxPan: THREE.Vector3, domElement?: HTMLElement) {
        super(camera, domElement);

        this.mouseButtons.RIGHT = undefined;
        this.mouseButtons.MIDDLE = THREE.MOUSE.PAN;

        this.touches.ONE = THREE.TOUCH.PAN;
        this.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

        this.minPan.copy(minPan);
        this.maxPan.copy(maxPan);
    }
}
