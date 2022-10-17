import * as THREE from 'three';

// TODO - should this be usable from a hook?

// This class is used to avoid recreating the three geometry with the same parameters
export class ThreeCache {
    boxes: Map<number, THREE.BoxGeometry>;
    cylinders: Map<number, THREE.CylinderGeometry>;
    standardMaterials: Map<number, THREE.MeshStandardMaterial>;

    constructor() {
        this.boxes = new Map();
        this.cylinders = new Map();
        this.standardMaterials = new Map();
    }

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
}
