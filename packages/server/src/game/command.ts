import {
    Milliseconds, Position,
    Board, GameWithPresenceCache,
    GameMap, Game, PlayerIndex, Unit, UnitId, Component, CommandPacket, UpdatePacket, PresenceMap, BuildingMap, TilePos, 
    Hp, Mover, Attacker, Harvester, ProductionFacility, Builder, Vision, Building,
    Command, CommandFollow, CommandAttack, CommandMove, CommandAttackMove, CommandStop, CommandHarvest, CommandProduce, CommandBuild,
    PlayerState, UnitProductionCapability, BuildCapability
} from '../types';

import { isBuildPlacementOk } from '../shared.js'

import { getHpComponent, getMoveComponent, getAttackerComponent, getHarvesterComponent, getProducerComponent, getBuilderComponent, getVisionComponent, getBuildingComponent } from './components.js'
import * as V from '../vector.js'

import { moveTowardsUnit, moveToPointOrCancelCommand, moveTowardsUnitById, moveTowardsMapPosition } from './unit/movement.js'
import { clearCurrentCommand, stopMoving, becomeIdleAtCurrentPosition } from './unit/clear.js'
import { detectNearbyEnemy, findClosestUnitBy, cancelProduction, aggro } from './unit/unit.js'
import { HARVESTING_DISTANCE, HARVESTING_RESOURCE_COUNT, MAX_PLAYER_UNITS, UNIT_FOLLOW_DISTANCE } from './constants.js'
import { createUnit, UnitData, getUnitDataByName } from './units.js'
import { findClosestEmptyTile } from './util.js'
import { findPositionForProducedUnit } from './produce.js'
import { buildPresenceAndBuildingMaps } from './presence.js'

export class GenericLogicError extends Error {}
export class InvalidCommandError extends Error {}
export class ComponentMissingError extends Error {}

type CommandContext = {
    unit: Unit,
    owner: PlayerState,
    dt: Milliseconds,
    gm: GameWithPresenceCache,
}

// Commands
export const moveCommand = (ctx: CommandContext, cmd: CommandMove) => {
    const unit = ctx.unit;
    moveToPointOrCancelCommand(unit, ctx.gm, cmd.target, ctx.dt);
};

export const attackMoveCommand = (ctx: CommandContext, cmd: CommandAttackMove) => {
    const unit = ctx.unit;
    const ac = getAttackerComponent(unit);
    // TODO just execute move to go together with formation
    if (!ac) {
        return;
    }

    const closestTarget = detectNearbyEnemy(unit, ctx.gm.game.units);
    if (closestTarget) {
        const MAX_PATH_DEVIATION = 5;

        // TODO compute
        const pathDeviation = 0; //computePathDeviation(unit);
        if (pathDeviation > MAX_PATH_DEVIATION) {
            // lose aggro and move directly to target
            // TODO: aggro hysteresis?
            moveToPointOrCancelCommand(unit, ctx.gm, cmd.target, ctx.dt);
        } else {
            aggro(unit, ctx.gm, ac, closestTarget, ctx.dt);
        }
    } else {
        moveToPointOrCancelCommand(unit, ctx.gm, cmd.target, ctx.dt);
    }
}

export const attackCommand = (ctx: CommandContext, cmd: CommandAttack) =>  {
    const unit = ctx.unit;
    const g = ctx.gm.game;
    const ac = getAttackerComponent(unit);
    if (!ac) {
        throw new ComponentMissingError("Attacker");
    }

    if (ctx.unit.id === cmd.target)
        throw new InvalidCommandError("Unit tried to attack itself");

    // target not existing is a common situation if the target got destroyed
    // after the command was made
    const target = g.units.find(u => u.id === cmd.target);
    if (!target) {
        clearCurrentCommand(unit);
        return;
    }

    aggro(unit, ctx.gm, ac, target, ctx.dt);
};

export const stopCommand = (ctx: CommandContext, _cmd: CommandStop) => {
    const unit = ctx.unit;
    const owner = ctx.owner;
    stopMoving(unit);
    // TODO dedicated cancel command
    cancelProduction(unit, owner);
    becomeIdleAtCurrentPosition(unit);
};

export const followCommand = (ctx: CommandContext, cmd: CommandFollow) => {
    const unit = ctx.unit;
    const moveResult = moveTowardsUnitById(unit, ctx.gm, cmd.target, UNIT_FOLLOW_DISTANCE, ctx.dt);
    if (moveResult !== 'Moving') {
        clearCurrentCommand(unit);
    }
}

export const harvestCommand = (ctx: CommandContext, cmd: CommandHarvest) => {
    const unit = ctx.unit;
    const owner = ctx.owner;
    const g = ctx.gm.game;
    const dt = ctx.dt;
    const hc = getHarvesterComponent(unit);
    if (!hc) {
        throw new ComponentMissingError("Harvester");
    }

    const target = g.units.find(u => u.id === cmd.target);
    if (!target) {
        // TODO find other nearby resource
        clearCurrentCommand(unit);
        return;
    }

    if (!hc.resourcesCarried) {
        // TODO - should resources use perimeter?
        switch(moveTowardsUnit(unit, target, HARVESTING_DISTANCE, ctx.gm, dt)) {
        case 'Unreachable':
            clearCurrentCommand(unit);
            break;
        case 'ReachedTarget':
            if (hc.harvestingProgress >= hc.harvestingTime) {
                hc.resourcesCarried = HARVESTING_RESOURCE_COUNT;
                // TODO - reset harvesting at any other action
                // maybe i could use some "exit state function"?
                hc.harvestingProgress = 0;
            } else {
                unit.state.action = 'Harvesting';
                hc.harvestingProgress += dt;
            }
            break;
        }
    } else {
        // TODO include building&unit size in this distance
        const DROPOFF_DISTANCE = 1;
        // TODO cache the dropoff base
        // TODO - resource dropoff component
        const target = findClosestUnitBy(unit, ctx.gm.game.units, u => 
            u.owner === unit.owner &&
            u.kind === 'Base'
        );

        if (!target) {
            // no bases to carry resources to; unlikely but possible
            return;
        }

        switch(moveTowardsUnit(unit, target, DROPOFF_DISTANCE, ctx.gm, dt)) {
        case 'Unreachable':
            // TODO if closest base is unreachable maybe try next one?
            clearCurrentCommand(unit);
            return;
        case 'ReachedTarget':
            owner.resources += hc.resourcesCarried
            hc.resourcesCarried = undefined;
            return;
        }
    }
}

export const produceCommand = (ctx: CommandContext, cmd: CommandProduce) =>  {
    const unit = ctx.unit;
    const owner = ctx.owner;
    const g = ctx.gm.game;
    // TODO should this happen regardless of the command if i keep the state
    // in the component anyway?
    const p = getProducerComponent(unit);
    if (!p) {
        throw new ComponentMissingError("Producer");
    }

    if (!p.productionState) {
        const numberOfPlayerUnits = g.units.filter(u => u.owner === unit.owner).length;
        if (numberOfPlayerUnits >= MAX_PLAYER_UNITS) {
            throw new InvalidCommandError("Unit orderded to produce but maximum unit count reached");
        }

        const utp = p.unitsProduced.find((up: UnitProductionCapability) => up.unitType == cmd.unitToProduce);
        if (!utp) {
            throw new InvalidCommandError("Unit orderded to produce but it can't produce this unit type");
        }

        const cost = utp.productionCost;

        if (cost > owner.resources) {
            throw new InvalidCommandError("Unit ordered to produce but player doesn't have enough resources");
        }

        owner.resources -= cost;

        const time = utp.productionTime;
        p.productionState = {
            unitType: cmd.unitToProduce,
            timeLeft: time,
            originalCost: cost,
            originalTimeToProduce: time,
        };
    }

    p.productionState.timeLeft -= ctx.dt;
    if (p.productionState.timeLeft < 0) {
        const producedUnitPosition = findPositionForProducedUnit(g, unit, p.productionState.unitType, ctx.gm.presence, ctx.gm.buildings);

        if (!producedUnitPosition){
            p.productionState = undefined;
            throw new GenericLogicError("Cannot produce unit because of insufficient space");
        }

        // TODO - automatic counter
        g.lastUnitId += 1;
        g.units.push(createUnit(
            g.lastUnitId,
            unit.owner,
            p.productionState.unitType,
            producedUnitPosition,
        ));

        // TODO - build queue
        clearCurrentCommand(unit);
        p.productionState = undefined;
    }
}

export const buildCommand = (ctx: CommandContext, cmd: CommandBuild) => {
    const unit = ctx.unit;
    const owner = ctx.owner;
    const g = ctx.gm.game;
    const bc = getBuilderComponent(unit);
    if (!bc)
        throw new ComponentMissingError("Builder");

    const buildCapability = bc.buildingsProduced.find((bp: BuildCapability) => bp.buildingType === cmd.building);
    if (!buildCapability)
        throw new InvalidCommandError("Unit ordered to build something it can't");

    if (buildCapability.buildCost > owner.resources)
        throw new InvalidCommandError("Unit ordered to build but player doesn't have enough resources");

    const buildingData = getUnitDataByName(cmd.building);
    if (!buildingData)
        throw new InvalidCommandError("Unit ordered to build unknown unit" +  cmd.building);

    const getBuildingComponentFromUnitData = (ud: UnitData) => {
        return ud.find(c => c.type === 'Building') as Building;
    };

    const buildingComponent = getBuildingComponentFromUnitData(buildingData);
    if (!buildingComponent)
        throw new InvalidCommandError("Unit ordered to build something that's not a building: " + cmd.building);

    if (!isBuildPlacementOk(g.board.map, g.units, buildingComponent, cmd.position))
        throw new InvalidCommandError("Unit ordered to build but some tiles are obscured");

    // the buildings are pretty large, so the worker should go towards the center
    // TODO is there a way to use getUnitReferencePosition here for consistency?
    const buildingSize = buildingComponent.size;
    const middleOfTheBuilding = V.sumScalar(cmd.position, buildingSize/2);
    // and is able to build once they reach the perimeter
    const buildingDistance = buildingComponent.size / 2 + 1;

    // TODO this would technically allow building over water etc.
    switch(moveTowardsMapPosition(unit, middleOfTheBuilding, buildingDistance, ctx.gm, ctx.dt)) {
        case 'Unreachable':
            throw new InvalidCommandError("Unit ordered to build but location is unreachable.");

        case 'ReachedTarget': {
            owner.resources -= buildCapability.buildCost;
            // TODO - this should take time
            // already specified in bp.buildTime

            // now depending on the building archetype different things might happen
            // 1. summon - the building starts constructing but the unit is free to move
            // 2. orc-style build - the unit disappears inside of the building while it's being built
            // 3. human-style build - the unit stays on the perimeter while it's building

            // for now, I'll make the building appear instantly, and teleport the unit out of it
            g.lastUnitId += 1;
            g.units.push(createUnit(
                g.lastUnitId,
                unit.owner,
                cmd.building,
                { x: cmd.position.x, y: cmd.position.y },
            ));

            // update the buildings map so that the unit is actually pushed out of the
            // newly constructed building
            // TODO - game interface should cover that
            const [presenceNew, buildingsNew] = buildPresenceAndBuildingMaps(g.units, g.board);
            ctx.gm.presence = presenceNew;
            ctx.gm.buildings = buildingsNew;

            const teleportPosition = findClosestEmptyTile(g, unit.position, ctx.gm.presence, ctx.gm.buildings);
            if (teleportPosition) {
                teleportPosition.x += 0.5;
                teleportPosition.y += 0.5;
                V.vecSet(unit.position, teleportPosition);
            } else {
                throw new Error("Cannot find a good place to teleport a unit after building")
            }

            clearCurrentCommand(unit);
            return;
        }
    }
}
