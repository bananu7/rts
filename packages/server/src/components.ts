import { 
    Unit,
    Hp, Mover, Attacker, Harvester, ProductionFacility, Builder, Vision, Building
} from './types'

export const getHpComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'Hp') as Hp;
}

export const getMoveComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'Mover') as Mover;
}

export const getAttackerComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'Attacker') as Attacker;
}

export const getHarvesterComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'Harvester') as Harvester;
}

export const getProducerComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'ProductionFacility') as ProductionFacility;
}

export const getBuilderComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'Builder') as Builder;
}

export const getVisionComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'Vision') as Vision;
}

export const getBuildingComponent = (unit: Unit) => {
    return unit.components.find(c => c.type === 'Building') as Building;
};
