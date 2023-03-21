import * as THREE from 'three';

// TODO - should this be usable from a hook?

// This class is used to avoid recreating the three geometry with the same parameters
export class ThreeCache {
    constructor() { }

    boxes: Map<number, THREE.BoxGeometry> = new Map();
    getBoxGeometry(size: number) {
        const cached = this.boxes.get(size);
        if (cached) {
            return cached;
        } else {
            const geometry = new THREE.BoxGeometry(size, 2, size);
            this.boxes.set(size, geometry);
            return geometry;
        }
    }

    cylinders: Map<number, THREE.CylinderGeometry> = new Map();
    getCylinderGeometry(size: number) {
        const cached = this.cylinders.get(size);
        if (cached) {
            return cached;
        } else {
            const geometry = new THREE.CylinderGeometry(size, size, 2, 12);
            this.cylinders.set(size, geometry);
            return geometry;
        }
    }
    
    standardMaterials: Map<number, THREE.MeshStandardMaterial> = new Map();
    getStandardMaterial(color: number) {
        const cached = this.standardMaterials.get(color);
        if (cached) {
            return cached;
        } else {
            const material = new THREE.MeshStandardMaterial({color});
            this.standardMaterials.set(color, material);
            return material;
        }
    }

    basicMaterials: Map<number, THREE.MeshBasicMaterial> = new Map();
    getBasicMaterial(color: number) {
        const cached = this.basicMaterials.get(color);
        if (cached) {
            return cached;
        } else {
            const material = new THREE.MeshBasicMaterial({color});
            this.basicMaterials.set(color, material);
            return material;
        }
    }
}
