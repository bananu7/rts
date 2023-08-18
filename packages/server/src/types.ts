
// Misc
export type Position = {
    x: number,
    y: number,
}

export type Milliseconds = number;

export type UnitId = number;

// used for MatchList
export type MatchId = string;

export type MatchInfo = {
    matchId: MatchId,
    playerCount: number,
    status: GameState, 
}

// constant for the entire match, used by the match controller
export type PlayerMetadata = {
    readonly index: PlayerIndex,
    readonly userId: UserId,
    readonly color: number,
}

export type MatchMetadata = {
    readonly matchId: MatchId;
    readonly players: PlayerMetadata[],
    readonly board: Board,
}

export type IdentificationPacket = {
    userId: UserId,
    matchId: MatchId, 
}

export type Command = CommandMove | CommandStop | CommandFollow | CommandAttackMove | CommandAttack | CommandHarvest | CommandProduce | CommandBuild;
export type CommandMove = {
    typ: 'Move',
    target: Position,
}
export type CommandStop = {
    typ: 'Stop'
}
export type CommandFollow = {
    typ: 'Follow',
    target: UnitId,
}
export type CommandAttackMove = {
    typ: 'AttackMove',
    target: Position,
}
export type CommandAttack = {
    typ: 'Attack',
    target: UnitId,
}
export type CommandHarvest = {
    typ: 'Harvest',
    target: UnitId,
}
export type CommandProduce = {
    typ: 'Produce',
    unitToProduce: string,
}
export type CommandBuild = {
    typ: 'Build',
    building: string,
    position: Position,
}

export type CommandPacket = {
    command: Command,
    unitIds: UnitId[],
    shift: boolean,
}

export type UpdatePacket = {
    state: GameState,
    tickNumber: number,
    units: Unit[],
    player: PlayerState,
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
    attackRate: Milliseconds,
    range: number,
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
    // state
    harvestingProgress: number,
    resourcesCarried?: number,
}
export type Resource = { 
    type: 'Resource',
    value: number,
}
export type Building = {
    type: 'Building',
    size: number,
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


export type UnitAction = 'Moving'|'Attacking'|'Harvesting'|'Idle'|'Producing'|'Building';

// TODO this should probably be a separate variable instead
type UnitActionState = {
    action: UnitAction,
    actionTime: number, // how long has the unit been performing the current action?
}

// represents a non-empty queue
export type UnitActiveState = {
    state: 'active',
    current: Command,
    rest: Command[],    
} & UnitActionState

export type UnitIdleState = {
    state: 'idle',
    idlePosition: Position,
} & UnitActionState

export type UnitState = UnitIdleState | UnitActiveState;

export type Unit = {
    debug?: any;

    readonly id: number,
    state: UnitState,

    readonly kind: string, // TODO should this be in a component
    readonly owner: PlayerIndex,
    readonly position: Position,
    direction: number,
    readonly velocity: Position,

    readonly components: Component[],

    // Only used on the server
    pathToNext?: TilePos[],
}

export type PlayerState = {
    resources: number,
}

export type WinCondition = 'BuildingElimination'|'OneLeft';

export type Game = {
    // uuid: UUID, TODO
    readonly matchId: MatchId,
    readonly board: Board,
    readonly winCondition: WinCondition,

    state: GameState,
    players: PlayerState[],
    tickNumber: number,
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

export type PresenceMap = Map<number, Unit[]>;
export type BuildingMap = Map<number, UnitId>;