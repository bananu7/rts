import {
    Unit, UnitId, Component, Position,
} from './types';

export type UnitData = Component[];

// those are functions to clone the objects easily
interface Catalog {
    [kind: string]: () => UnitData;
}

const UNIT_CATALOG : Catalog = {
    'Harvester': () => [
        { type: 'Hp', maxHp: 50, hp: 50 },
        { type: 'Mover', speed: 10 },
        { type: 'Attacker', damage: 5, attackRate: 1000, range: 2, cooldown: 0 },
        { type: 'Harvester', harvestingTime: 1000, harvestingValue: 20, harvestingProgress: 0 },
        { type: 'Builder', buildingsProduced: [
            { buildingType: 'Base', buildTime: 5000, buildCost: 400 },
            { buildingType: 'Barracks', buildTime: 5000, buildCost: 150},
            { buildingType: 'Tower', buildTime: 5000, buildCost: 50},
        ]},
        { type: 'Vision', range: 10 },
    ],
    'Base': () => [
        { type: 'Hp', maxHp: 1000, hp: 1000 },
        { type: 'Building', size: 6 },
        { type: 'ProductionFacility', unitsProduced: [
            { unitType: 'Harvester', productionTime: 5000, productionCost: 50 }
        ]},
        { type: 'Vision', range: 5 },
    ],
    'ResourceNode': () => [
        { type: 'Resource', value: 100 }
    ],
    'Barracks': () => [
        { type: 'Hp', maxHp: 600, hp: 600 },
        { type: 'Building', size: 6 },
        { type: 'ProductionFacility', unitsProduced: [
            {unitType: 'Trooper', productionTime: 5000, productionCost: 50}
        ]},
        { type: 'Vision', range: 5 },
    ],
    'Tower': () => [
        { type: 'Hp', maxHp: 300, hp: 300 },
        { type: 'Building', size: 4 },
        { type: 'Vision', range: 12 },
    ],
    'Trooper': () => [
        { type: 'Hp', maxHp: 50, hp: 50 },
        { type: 'Mover', speed: 10 },
        { type: 'Attacker', damage: 10, attackRate: 500, range: 6, cooldown: 0 },
        { type: 'Vision', range: 10 },
    ]
};

export function getUnitDataByName(name: string): UnitData | undefined {
    const ud = UNIT_CATALOG[name]
    return ud ? ud() : undefined;
}

export const createUnit = (id: number, owner: number, kind: string, position: Position): Unit => {
    return {
        state: { state: 'idle', action: 'Idle', actionTime: 0, idlePosition: { x:position.x, y:position.y}},
        id,
        kind,
        owner,
        position,
        velocity: {x:0, y:0},
        direction: 0,
        components: UNIT_CATALOG[kind]()
    }
};

export function createStartingUnits(): Unit[] {
    const startingUnits = [] as Unit[];

    let lastUnitId = 1;

    // top left
    startingUnits.push(createUnit(lastUnitId++, 0, 'ResourceNode', {x:6, y:6}));
    startingUnits.push(createUnit(lastUnitId++, 0, 'ResourceNode', {x:6, y:10}));
    startingUnits.push(createUnit(lastUnitId++, 0, 'ResourceNode', {x:6, y:14}));

    startingUnits.push(createUnit(lastUnitId++, 1, 'Base', {x:30, y:10}));
    startingUnits.push(createUnit(lastUnitId++, 1, 'Harvester', {x:29, y:25}));
    startingUnits.push(createUnit(lastUnitId++, 1, 'Harvester', {x:31, y:25}));
    startingUnits.push(createUnit(lastUnitId++, 1, 'Harvester', {x:33, y:25}));

    // TODO proper starting location placement/orientation
    // bottom right
    startingUnits.push(createUnit(lastUnitId++, 0, 'ResourceNode', {x:90, y:88}));
    startingUnits.push(createUnit(lastUnitId++, 0, 'ResourceNode', {x:90, y:84}));
    startingUnits.push(createUnit(lastUnitId++, 0, 'ResourceNode', {x:90, y:80}));

    startingUnits.push(createUnit(lastUnitId++, 2, 'Base', {x:80, y:85}));
    startingUnits.push(createUnit(lastUnitId++, 2, 'Harvester', {x:62, y:90}));
    startingUnits.push(createUnit(lastUnitId++, 2, 'Harvester', {x:64, y:90}));
    startingUnits.push(createUnit(lastUnitId++, 2, 'Harvester', {x:66, y:90}));

    // left expo
    startingUnits.push(createUnit(lastUnitId++, 0, 'ResourceNode', {x:6, y:50}));
    startingUnits.push(createUnit(lastUnitId++, 0, 'ResourceNode', {x:6, y:54}));
    startingUnits.push(createUnit(lastUnitId++, 0, 'ResourceNode', {x:6, y:58}));

    // right expo
    startingUnits.push(createUnit(lastUnitId++, 0, 'ResourceNode', {x:86, y:40}));
    startingUnits.push(createUnit(lastUnitId++, 0, 'ResourceNode', {x:86, y:44}));
    startingUnits.push(createUnit(lastUnitId++, 0, 'ResourceNode', {x:86, y:48}));

    return startingUnits;
}
