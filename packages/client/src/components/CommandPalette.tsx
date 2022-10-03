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

    // TODO browse all units?
    const canMove = Boolean(units[0].components.find(c => c.type === 'Mover'));
    const canAttack = Boolean(units[0].components.find(c => c.type === 'Attacker'));

    const stop = () =>
        props.multiplayer.stopCommand(Array.from(props.selectedUnits));

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
        <button
            key={`produce_${ut}`}
            style={{gridRow: "2 / span 1"}}
            onClick={() => produce(ut)}
        >Produce {ut}</button>
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

        return (
            <button
                key={`build_${b}`}
                style={{gridRow: "2 / span 1"}}
                onClick={() => build(b, {x: 50, y: 50})}
            >Build {b}</button>
        );
    })

    return (
        <div className="CommandPalette">
            {
                canMove &&
                <button
                    key="move"
                    style={{gridColumn: "1 / span 1", gridRow: "1 / span 1"}}
                    className={props.selectedAction && props.selectedAction.action === 'Move' ? "active" : ""}
                    onClick={() => props.setSelectedAction({ action: 'Move'})}
                >Move</button>
            }

            <button
                key="stop"
                style={{gridColumn: "2 / span 1", gridRow: "1 / span 1"}}
                onClick={stop}
            >Stop</button>

            {
                canAttack &&
                <button
                    key="attack"
                    style={{gridColumn: "3 / span 1", gridRow: "1 / span 1"}}
                    className={props.selectedAction && props.selectedAction.action === 'Attack' ? "active" : ""}
                    onClick={() => props.setSelectedAction({ action: 'Attack'})}
                >Attack</button>
            }

            { productionButtons }
            { buildButtons }
        </div>
    );
};
