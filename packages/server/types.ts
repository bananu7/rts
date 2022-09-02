
export type MatchInfo = {
    matchId: string,
    playerCount: number
}

export type IdentificationPacket = {
    playerId: number,
    matchId: string, 
}


// Game

export type Action = 'Move' | 'Attack' | 'Harvest'

export type Player = number

export type Position = {
    x: number,
    y: number,
}

export type UnitKind = 'Harvester' | 'Marine' | 'Tank'
export type Unit = {
    actionQueue: Action[]
    kind: UnitKind,
    owner: Player,
    position: Position,
}

export type BuildingKind = 'Base' | 'Barracks'
export type Building = {
    kind: BuildingKind,
    owner: Player,
}

export type Game = {
    state: GameState
    tickNumber: number,
    players: Player[],
    board: Board,
}

export type GameMap = {
    tiles: number[],
    w: number,
    h: number,
};

export type Board = {
    map: GameMap,
    units: Unit[],
    buildings: Building[],
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