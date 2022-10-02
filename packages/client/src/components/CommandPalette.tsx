import {
   Game,
   CommandPacket,
   IdentificationPacket,
   UpdatePacket,
   UnitId,
   Unit,
   UnitState,
   Position,
   ProductionFacility,
   Builder,
} from 'server/types'
import { Multiplayer } from '../Multiplayer'

export type SelectedAction = 
  { action: 'Move' }
| { action: 'Attack' }
| { action: 'Build', building: string }
| { action: 'Harvest' };

type Props = {
    selectedUnits: Set<UnitId>,
    selectedAction: SelectedAction | undefined,
    setSelectedAction: (a: SelectedAction) => void,
    units: UnitState[],
    multiplayer: Multiplayer,
}

export function CommandPalette(props: Props) {
    if (props.selectedUnits.size === 0) {
        return <div></div>;
    }

    const units: UnitState[] = 
        Array.from(props.selectedUnits)
        .map(id => {
            const unit = props.units.find(u => u.id === id);
            if (!unit)
                throw new Error("Selected unit id not in the unit set");
            return unit;
        });

    const allSameType = units.every(u => u.kind === units[0].kind);

    // TODO check if all can move
    // TODO the selection is somewhat clunky
    const canMove = Boolean(units[0].components.find(c => c.type === 'Mover'));
    const moveButtonActive = props.selectedAction && props.selectedAction.action == 'Move';
    const moveButtonClass = moveButtonActive ? "active" : "";
    const move = () => props.setSelectedAction({ action: 'Move'});
    const moveButton = <button className={moveButtonClass} key="move" onClick={move}>Move</button>

    const canAttack = Boolean(units[0].components.find(c => c.type === 'Attacker'));
    const attackButtonActive = props.selectedAction && props.selectedAction.action == 'Attack';
    const attackButtonClass = attackButtonActive ? "active" : "";
    const attack = () => props.setSelectedAction({ action: 'Attack'});
    const attackButton = <button className={attackButtonClass} key="attack" onClick={attack}>Attack</button>

    const productionUnits = (() => {
        if (props.selectedUnits.size === 0)
            return [];

        if (!allSameType)
            return [];

        const productionComponent = units[0].components.find(c => c.type === 'ProductionFacility') as ProductionFacility;
        if (!productionComponent)
            return [];

        return productionComponent.unitsProduced.map(up => up.unitType);
    })();

    // TODO: produce just one unit from the set like SC?
    const produce = (utype: string) => 
        props.multiplayer.produceCommand(Array.from(props.selectedUnits), utype);

    const productionButtons = productionUnits.map(ut =>
        <button key={`produce_${ut}`} onClick={() => produce(ut)}>Produce {ut}</button>
    );

    const availableBuildings = (() => {
        // TODO if no selected units then doesn't make sense to repeat this check
        if (props.selectedUnits.size === 0)
            return [];

        if (!allSameType)
            return [];

        const builderComponent = units[0].components.find(c => c.type === 'Builder') as Builder;
        if (!builderComponent)
            return [];

        return builderComponent.buildingsProduced;
    })();

    const build = (building: string, position: Position) =>
        props.setSelectedAction({ action: 'Build', building });

    // TODO - second click to determine position
    const buildButtons = availableBuildings.map(bp => {
        const b = bp.buildingType;
        return <button key={`build_${b}`} onClick={() => build(b, {x: 50, y: 50})}>Build {b}</button>
    })

    return (
        <div className="CommandPalette">
            { canMove && moveButton }
            { canAttack && attackButton }

            { productionButtons }
            { buildButtons }
        </div>
    );
};
