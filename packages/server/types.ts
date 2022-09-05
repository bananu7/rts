
// Misc
export type Milliseconds = number;

export type UnitId = number;

// Network connectivity
export type MatchInfo = {
    matchId: string,
    playerCount: number
}

export type IdentificationPacket = {
    playerId: number,
    matchId: string, 
}

export type ActionType = 'Move' | 'Attack' | 'Harvest'
export type Action = {
    typ: ActionType,
    target: Position | UnitId,
}

export type CommandPacket = {
    action: Action,
    unitId: UnitId,
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
    direction: number,
    owner: number,
}

// Components
export type Component = Attacker | Mover | Building | ProductionFacility | Harvester | Resource;
export type Attacker = {
    type: 'Attacker',
    damage: number,
    cooldown: Milliseconds,
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

export type Player = number

export type Position = {
    x: number,
    y: number,
}

export type Unit = {
    id: number,
    actionQueue: Action[],
    kind: string, // TODO should this be in a component
    owner: Player,
    position: Position,
    direction: number,

    pathToNext?: TilePos[],
}

export type Game = {
    state: GameState
    tickNumber: number,
    players: Player[],
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
    id: 'Fresh',
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