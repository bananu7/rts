export type UnitDisplayEntry = {
    isBuilding: false;
    modelPath: string;
    selectorSize: number;
}

export type BuildingDisplayEntry = {
    isBuilding: true;
    modelPath: string;
    selectorSize: number;
}

interface UnitDisplayCatalog {
    [kind: string]: () => UnitDisplayEntry | BuildingDisplayEntry;
}

export const UNIT_DISPLAY_CATALOG : UnitDisplayCatalog = {
    'Harvester': () => ({
        isBuilding: false,
        modelPath: 'peasant_1.glb',
        selectorSize: 1,
    }),
    'Base': () => ({
        isBuilding: true,
        modelPath: 'castle_1.glb',
        selectorSize: 6,
    }),
    'ResourceNode': () => ({
        isBuilding: false,
        modelPath: 'gold_node.glb',
        selectorSize: 1.8,
    }),
    'Barracks': () => ({
        isBuilding: true,
        modelPath: 'barracks.glb',
        selectorSize: 6,
    }),
    'Trooper': () => ({
        isBuilding: false,
        modelPath: 'catapult.glb',
        selectorSize: 2.5,
    })
};
