
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

export type Action = ActionMove | ActionFollow | ActionAttackMove | ActionAttack | ActionHarvest | ActionProduce;
export type ActionMove = {
    typ: 'Move',
    target: Position,
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

export type CommandPacket = {
    action: Action,
    unitIds: UnitId[],
    shift: boolean,
}

export type UpdatePacket = {
    tickNumber: number,
    units: UnitState[],
}

export type UnitState = {
    id: number,
    kind: string,
    status: 'Moving'|'Attacking'|'Harvesting'|'Idle',
    position: Position,
    velocity: Position, // TODO - Position to Vec2
    direction: number,
    owner: number,
}

// Components
export type Component = Attacker | Mover | Building | ProductionFacility | Harvester | Resource;
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
}
export type Resource = { 
    type: 'Resource',
    value: number,
}
export type Building = {
    type: 'Building'
}
export type ProductionFacility = {
    type: 'ProductionFacility',
    unitsProduced: string[],    
}

// Internal Game stuff
export type TilePos = { x: number, y: number }

export type PlayerIndex = number
export type UserId = string

export type PlayerEntry = {
    index: number,
    user: UserId,
}

export type Unit = {
    id: number,
    actionQueue: Action[],
    kind: string, // TODO should this be in a component
    owner: PlayerIndex,
    position: Position,
    direction: number,
    velocity: Position,

    hp: number, // TODO should be in a dynamic component

    pathToNext?: TilePos[],
}

export type Game = {
    state: GameState
    tickNumber: number,
    players: number,
    board: Board,
    units: Unit[],
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