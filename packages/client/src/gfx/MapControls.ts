import { OrbitControls } from "./OrbitControls";
import * as THREE from 'three';

export class MapControls extends OrbitControls {
    constructor(camera : THREE.Camera, domElement?: HTMLElement) {
        super(camera, domElement);

        this.mouseButtons.MIDDLE = THREE.MOUSE.PAN;

        this.touches.ONE = THREE.TOUCH.PAN;
        this.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    }


}
