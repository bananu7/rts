import { 
    Unit, Game, Milliseconds, GameWithPresenceCache,
} from '../types'

import { 
    GenericLogicError,
    InvalidCommandError,
    ComponentMissingError,
    moveCommand,
    attackMoveCommand,
    stopCommand,
    followCommand,
    attackCommand,
    harvestCommand,
    produceCommand,
    buildCommand
} from './command.js'

import { updatePassiveCooldowns, idle } from './unit/unit.js'

import { MAXIMUM_IDLE_AGGRO_RANGE, MAP_MOVEMENT_TOLERANCE } from './constants.js'

import { clearCurrentCommand } from './unit/clear.js'

export function updateUnit(dt: Milliseconds, gm: GameWithPresenceCache, unit: Unit) {
    updatePassiveCooldowns(unit, dt);

    if (idle(unit, gm, dt))
        return;

    // TODO - idle doesn't propagate state check and type narrowing
    if (unit.state.state === 'idle') {
        return false;
    }

    const cmd = unit.state.current;
    const owner = gm.game.players[unit.owner - 1]; // TODO players 0-indexed is a bad idea

    try {
        const commandContext = {
            unit, owner, dt, gm,
        };

        switch (cmd.typ) {
            case 'Move': {
                moveCommand(commandContext, cmd);
                break;
            }

            case 'AttackMove': {
                attackMoveCommand(commandContext, cmd);
                break;
            }

            case 'Stop': {
                stopCommand(commandContext, cmd);
                break;
            }

            case 'Follow': {
                followCommand(commandContext, cmd);
                break;
            }

            case 'Attack': {
                attackCommand(commandContext, cmd);
                break;
            }

            case 'Harvest': {
                harvestCommand(commandContext, cmd);
                break;
            }

            case 'Produce': {
                produceCommand(commandContext, cmd);
                break;
            }

            case 'Build': {
                buildCommand(commandContext, cmd);
                break;
            }
        }
    }
    catch (e) {
        if (e instanceof ComponentMissingError) {
            console.info("[game] Command missing component " + e.message);
            clearCurrentCommand(unit);
        } else if (e instanceof InvalidCommandError) {
            console.info("[game] " + e.message);
            clearCurrentCommand(unit);
        } else if (e instanceof GenericLogicError) {
            console.error("[game] Logic error during command processing: " + e.message);
            clearCurrentCommand(unit);
        } else if (e instanceof Error) {
            console.error("[game] Significant error during command processing: " + e.message);
            throw e;
        } else {
            console.error("[game] Unknown error during command processing");
            throw e;
        }

    }
}
