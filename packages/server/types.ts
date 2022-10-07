
// Misc
export type Position = {
    x: number,
    y: number,
}

export type Milliseconds = number;

export type UnitId = number;

// Network connectivity
export type MatchInfo = {
    matchId: string,
    playerCount: number,
    status: GameState, 
}

export type IdentificationPacket = {
    userId: UserId,
    matchId: string, 
}

export type Action = ActionMove | ActionStop | ActionFollow | ActionAttackMove | ActionAttack | ActionHarvest | ActionProduce | ActionBuild;
export type ActionMove = {
    typ: 'Move',
    target: Position,
}
export type ActionStop = {
    typ: 'Stop'
}
export type ActionFollow = {
    typ: 'Follow',
    target: UnitId,
}
export type ActionAttackMove = {
    typ: 'AttackMove',
    target: Position,
}
export type ActionAttack = {
    typ: 'Attack',
    target: UnitId,
}
export type ActionHarvest = {
    typ: 'Harvest',
    target: UnitId,
}
export type ActionProduce = {
    typ: 'Produce',
    unitToProduce: string,
}
export type ActionBuild = {
    typ: 'Build',
    building: string,
    position: Position,
}

export type CommandPacket = {
    action: Action,
    unitIds: UnitId[],
    shift: boolean,
}

export type UpdatePacket = {
    state: GameState,
    tickNumber: number,
    units: UnitState[],
    player: PlayerState,
}

export type UnitState = {
    id: number,
    kind: string,
    status: 'Moving'|'Attacking'|'Harvesting'|'Producing'|'Idle',
    position: Position,
    velocity: Position, // TODO - Position to Vec2
    direction: number,
    owner: number,

    components: Component[],
}

// Components
export type Component = Hp | Attacker | Mover | Building | ProductionFacility | Harvester | Resource | Builder | Vision;
export type Hp = {
    type: 'Hp',
    maxHp: number,
    hp: number,
}
export type Attacker = {
    type: 'Attacker',
    damage: number,
    cooldown: Milliseconds,
    range: number,
}
export type Mover = {
    type: 'Mover',
    speed: number,
}
export type Harvester = {
    type: 'Harvester',
    harvestingTime: Milliseconds,
    harvestingValue: number,
    harvestingProgress: number,
    resourcesCarried?: number,
}
export type Resource = { 
    type: 'Resource',
    value: number,
}
export type Building = {
    type: 'Building',
    constructionTimeLeft?: number,
}

export type UnitProductionCapability = {
    unitType: string,
    productionTime: number,
    productionCost: number,
}
export type CurrentProductionState = {
    unitType: string,
    timeLeft: number,

    // TODO - im not sure about those two, but it was convenient to do it like that
    // when in doubt - remove and pull that info from the unit blueprint
    originalTimeToProduce: number,
    originalCost: number,
}
export type ProductionFacility = {
    type: 'ProductionFacility',
    productionState?: CurrentProductionState,
    unitsProduced: UnitProductionCapability[],
}

export type BuildCapability = {
    buildingType: string,
    buildTime: number,
    buildCost: number,
}

export type Builder = {
    type: 'Builder',
    buildingsProduced: BuildCapability[],
    currentlyBuilding?: UnitId,
}

export type Vision = {
    type: 'Vision',
    range: number,
}

// Internal Game stuff
export type TilePos = { x: number, y: number }

export type PlayerIndex = number
export type UserId = string

export type Unit = {
    id: number,
    actionQueue: Action[],
    kind: string, // TODO should this be in a component
    owner: PlayerIndex,
    position: Position,
    direction: number,
    velocity: Position,

    components: Component[],

    pathToNext?: TilePos[],
}

export type PlayerState = {
    resources: number,
}

export type Game = {
    state: GameState
    tickNumber: number,
    players: PlayerState[],
    board: Board,
    units: Unit[],
    lastUnitId: number,
}

export type GameMap = {
    tiles: number[],
    w: number,
    h: number,
};

export type Board = {
    map: GameMap,
}

export type GameState = {
    id: 'Lobby',
} | {
    id: 'Precount', // once everyone joins
    count: number,
} | {
    id: 'Play',
} | {
    id: 'Paused',
} | {
    id: 'GameEnded',
}