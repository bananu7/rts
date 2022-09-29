import {
    Unit, UnitId, Component, Position, UnitState,
} from './types';

// those are functions to clone the objects easily
interface Catalog {
    [kind: string]: () => Component[];
}

const UNIT_CATALOG : Catalog = {
    'Harvester': () => [
        { type: 'Hp', maxHp: 50, hp: 50 },
        { type: 'Mover', speed: 10 },
        { type: 'Attacker', damage: 5, cooldown: 1000, range: 2 },
        { type: 'Harvester', harvestingTime: 1000, harvestingValue: 20 }
    ],
    'Base': () => [
        { type: 'Hp', maxHp: 1000, hp: 1000 },
        { type: 'Building' },
        { type: 'ProductionFacility', unitsProduced: [{unitType: 'Harvester', productionTime: 5000}] }
    ],
    'ResourceNode': () => [
        { type: 'Resource', value: 100 }
    ],
    'Barracks': () => [
        { type: 'Hp', maxHp: 600, hp: 600 },
        { type: 'Building' },
        { type: 'ProductionFacility', unitsProduced: [{unitType: 'Trooper', productionTime: 5000}] }
    ],
    'Trooper': () => [
        { type: 'Hp', maxHp: 50, hp: 50 },
        { type: 'Mover', speed: 10 },
        { type: 'Attacker', damage: 10, cooldown: 500, range: 6 }
    ]
};

export function createStartingUnits(): Unit[] {
    const startingUnits = [] as Unit[];

    let lastUnitId = 1;
    const createUnit = (kind: string, position: Position): Unit => {
        return {
            actionQueue: [],
            id: lastUnitId++,
            kind,
            owner: 1,
            position,
            velocity: {x:0, y:0},
            direction: 0,
            components: UNIT_CATALOG[kind]()
        }
    };

    startingUnits.push(createUnit('Harvester', {x:31, y:25}));
    startingUnits.push(createUnit('Harvester', {x:64, y:90}));
    startingUnits.push(createUnit('Base', {x:10, y:10}));
    startingUnits.push(createUnit('Base', {x:90, y:90}));

    [{x:30, y:30}, {x:33, y:30}, {x:36, y:30},{x:39, y:30}].forEach(p => {
        startingUnits.push(createUnit('Trooper', p));
    });

    return startingUnits;
}
