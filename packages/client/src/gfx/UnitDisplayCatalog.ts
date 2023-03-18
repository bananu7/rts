interface UnitDisplayCatalog {
    [kind: string]: () => {
        modelPath: string;
    };
}

export const UNIT_DISPLAY_CATALOG : UnitDisplayCatalog = {
    'Harvester': () => ({
        modelPath: 'peasant_1.glb'
    }),
    'Base': () => ({
        modelPath: 'castle_1.glb'
    }),
    'ResourceNode': () => ({
        modelPath: 'gold_node.glb'
    }),
    'Barracks': () => ({
        modelPath: 'castle_1.glb'
    }),
    'Trooper': () => ({
        modelPath: 'catapult.glb'
    })
};
