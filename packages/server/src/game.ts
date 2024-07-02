import {
    Milliseconds, Position,
    Board,
    GameMap, Game, PlayerIndex, Unit, UnitId, Component, CommandPacket, UpdatePacket, PresenceMap, BuildingMap, TilePos, 
    Hp, Mover, Attacker, Harvester, ProductionFacility, Builder, Vision, Building,
    Command, CommandFollow, CommandAttack, CommandMove, CommandAttackMove, CommandStop, CommandHarvest, CommandProduce, CommandBuild,
    PlayerState, UnitProductionCapability, BuildCapability
} from './types';

import * as V from './vector.js'
import { pathFind } from './pathfinding.js'
import { createUnit, createStartingUnits, getUnitDataByName, UnitData } from './game/units.js'
import { notEmpty } from './tsutil.js'
import { isBuildPlacementOk, mapEmptyForBuilding, tilesTakenByBuilding } from './shared.js'

import { getHpComponent, getAttackerComponent, getBuildingComponent } from './game/components.js'
import { findPositionForProducedUnit } from './game/produce.js'
import { spiral, willAcceptCommand, getUnitReferencePosition } from './game/util.js'
import { updateUnit } from './game/unit_update.js'
import { buildPresenceAndBuildingMaps } from './game/presence.js'

export function newGame(matchId: string, board: Board): Game {
    const units = createStartingUnits(2, board);
    const startingResources = 150;
    return {
        matchId,
        state: {id: 'Lobby'},
        tickNumber: 0,
        // TODO factor number of players in creation
        // TODO handle disconnect separately from elimination
        players: [{resources: startingResources, stillInGame: true}, {resources: startingResources, stillInGame: true}],
        board,
        units,
        lastUnitId: units.length,
        winCondition: 'BuildingElimination',
    }
}

export function startGame(g: Game) {
    console.log(`[game] Game #${g.matchId} starting precount`);
    g.state = {id: 'Precount', count: 0};
}

function commandOne(shift: boolean, command: Command, unit: Unit, playerIndex: number) {
    if (unit.owner !== playerIndex) {
        console.info(`[game] Player tried to control other player's unit`);
        return;
    }

    // Don't even add/set actions that the unit won't accept
    const accept = willAcceptCommand(unit, command);
    if (!accept) {
        console.info(`[game] Rejecting command ${command.typ} for unit ${unit.id}`);
        return;
    }

    switch (command.typ) {
    case 'Move':
        console.log(`[game] Command: Move unit ${unit.id} towards [${command.target.x}, ${command.target.y}]`);
        break;
    case 'AttackMove':
        console.log(`[game] Command: AttackMove unit ${unit.id} towards [${command.target.x}, ${command.target.y}]`);
        break;
    case 'Follow':
        console.log(`[game] Command: Follow, unit ${unit.id} follows ${command.target}`);
        break;
    case 'Attack':
        console.log(`[game] Command: Attack, unit ${unit.id} attacks ${command.target}`);
        break;
    default:
        console.log(`[game] Command: ${command.typ} for unit ${unit.id}`);
        break;
    }
    
    if (unit.state.state === 'idle') {
        unit.state = {
            state: 'active',
            action: 'Idle',
            actionTime: 0,
            current: command,
            rest: []
        }
    } else {
        if (shift) {
            unit.state.rest.push(command);
        }
        else {
            unit.state.current = command;
            unit.state.rest = [];
            delete unit.pathToNext;
        }
    }
}

export function command(c: CommandPacket, g: Game, playerIndex: number) {
    const us: Unit[] = c.unitIds
        .map(id => g.units.find(u => id === u.id))
        .filter(notEmpty) // non-null
    ;

    if (us.length === 0)
        return;

    if (g.state.id !== 'Play')
        return;

    // if multiple units get a move command, spread their targets out
    if (c.command.typ === 'Move' || c.command.typ === 'AttackMove') {
        const target = c.command.target;
        const explode = (p: Position) => Math.floor(p.x)+Math.floor(p.y)*g.board.map.w;
        const isAcceptable = (p: Position) => g.board.map.tiles[explode(p)] === 0; // TODO - out of bounds etc

        // Don't even bother if the original target isn't passable
        // TODO - flying units
        if (!isAcceptable(target))
            return;
        
        // find all units that will participate in spiral formation forming
        const simps = us
            .filter(u => willAcceptCommand(u, c.command))
            .map(u => ({ unit: u, position: u.position }))
        ;

        // TODO - rough ordering of them by distance. This could be done better,
        // including their relative positions to the target, or even the time
        // it will take them to reach the target
        simps.sort((a,b) => 
            V.distance(a.position, target) - V.distance(b.position, target)
        )

        // assign a position on the spiral for each unit
        const ssimps = simps.map((s, i) => {
            const potentialNewTarget = spiral(target, i, 1.5);
            return {
                unit: s.unit,
                position: isAcceptable(potentialNewTarget) ? potentialNewTarget : target
            }
        });

        // send the command to each unit individually
        ssimps.forEach(s => {
            const command = {
                typ: c.command.typ,
                target: { x: s.position.x, y: s.position.y }
            } as CommandMove;
            commandOne(c.shift, command, s.unit, playerIndex);
        });
    }

    else {
        us.forEach(u => {
            commandOne(c.shift, c.command, u, playerIndex);
        });
    }
}

// Returns a list of update packets, one for each player
export function tick(dt: Milliseconds, g: Game): UpdatePacket[] {
    switch (g.state.id) {
        case 'Lobby':
            break;
        case 'Precount':
            g.state.count -= dt;
            if (g.state.count <= 1000) {
                g.state = {id: 'Play'};
            }
            break;
        case 'Play': {
            const getPlayerIndexesStillInGame = () => {
                const playersIdxLeft = [];
                for (let i = 0; i < g.players.length; i += 1) {
                    if (g.players[i].stillInGame)
                        playersIdxLeft.push(i + 1);
                }

                return playersIdxLeft;
            };

            // perform checks against every win condition
            // TODO this model isn't detailed enough to note why
            // a player was eliminated or considered winning, but
            // that can be improved later
            switch (g.winCondition) {
                // if building elimination is selected the game will automatically
                // stop a player with no buildings from playing.
                case 'BuildingElimination': {
                    const eliminatedIndexes = eliminated(g);
                    for (let idx of eliminatedIndexes) {
                        console.info(`[game] Player ${idx} eliminated because of no buildings`);
                        g.players[idx-1].stillInGame = false;
                    }
                    break;
                }

                // nothing to be done to compute as it's checked by default
                case 'OneLeft': {
                    break;
                }
            }

            // Check if there's just one player
            const playersIdxLeft = getPlayerIndexesStillInGame();
            if (playersIdxLeft.length <= 1) {
                console.log('[game] Game ended - only one player left');
                g.state = {
                    id: 'GameEnded',
                    winnerIndices: playersIdxLeft,
                };
            }

            g.tickNumber += 1;
            updateUnits(dt, g);
            break;
        }
    }

    const unitUpdates: Unit[] = g.units
        .map(u => {            
            return {
                id: u.id,
                state: u.state,
                position: u.position,
                direction: u.direction,
                velocity: u.velocity,
                owner: u.owner,
                kind: u.kind,
                components: u.components,
                debug: u.debug,
            }
        });

    // TODO - fog of war will happen here
    return g.players.map((p, i) => {
        return {
            tickNumber: g.tickNumber,
            units: unitUpdates,
            player: p,
            state: g.state,
        }
    });
}

export function endGame(g: Game) {
    g.state = { id: "GameForcefullyEnded" };
    return g.players.map((p, i) => {
        return {
            tickNumber: g.tickNumber,
            units: [],
            player: p,
            state: g.state,
        }
    });
}

function updateUnits(dt: Milliseconds, g: Game) {
    // Build a unit presence map
    const [presence, buildings] = buildPresenceAndBuildingMaps(g.units, g.board);

    // calculate updates and velocities
    for (const unit of g.units) {
        updateUnit(dt, { game: g, presence, buildings }, unit);
    }
    // move everything at once
    for (const unit of g.units) {
        V.vecAdd(unit.position, unit.velocity);
        unit.velocity.x = 0;
        unit.velocity.y = 0;
    }

    g.units = g.units.filter(u => {
        const hp = getHpComponent(u);
        if (!hp)
            return true; // units with no HP live forever
        
        return hp.hp > 0;
    });
}


function eliminated(g: Game): PlayerIndex[] {
    const isBuilding = (u: Unit) => !!u.components.find(c => c.type === 'Building');
    const buildingsByPlayer = (p: PlayerIndex) => g.units.filter(u => u.owner === p && isBuilding(u));

    // TODO support more than 2 players
    const buildingCounts = [1,2].map(p => [p, buildingsByPlayer(p).length]);

    return buildingCounts.filter(([p,c]) => c === 0).map(([p,c]) => p);
}

