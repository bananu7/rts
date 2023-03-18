interface UnitDisplayCatalog {
    [kind: string]: () => {
        modelPath: string;
        selectorSize: number;
    };
}

export const UNIT_DISPLAY_CATALOG : UnitDisplayCatalog = {
    'Harvester': () => ({
        modelPath: 'peasant_1.glb',
        selectorSize: 1,
    }),
    'Base': () => ({
        modelPath: 'castle_1.glb',
        selectorSize: 6,
    }),
    'ResourceNode': () => ({
        modelPath: 'gold_node.glb',
        selectorSize: 1.8,
    }),
    'Barracks': () => ({
        modelPath: 'castle_1.glb',
        selectorSize: 6,
    }),
    'Trooper': () => ({
        modelPath: 'catapult.glb',
        selectorSize: 2.5,
    })
};
