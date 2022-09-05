
export type UnitId = number;

export type MatchInfo = {
    matchId: string,
    playerCount: number
}

export type IdentificationPacket = {
    playerId: number,
    matchId: string, 
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
    kind: UnitKind,
    status: 'Moving'|'Attacking'|'Harvesting'|'Idle',
    position: Position,
    direction: number,
    owner: number,
}

// Game

export type TilePos = { x: number, y: number }

export type ActionType = 'Move' | 'Attack' | 'Harvest'
export type Action = {
    typ: ActionType,
    target: Position | UnitId,
}

export type Player = number

export type Position = {
    x: number,
    y: number,
}

export type UnitKind = 'Harvester' | 'Marine' | 'Tank' | 'Base' | 'Barracks'
export type Unit = {
    id: number,
    actionQueue: Action[],
    kind: UnitKind,
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