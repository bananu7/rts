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
    resources: number, // used to check if the player can afford stuff
    selectedUnits: Set<UnitId>,
    selectedAction: SelectedAction | undefined,
    setSelectedAction: (a: SelectedAction | undefined) => void,
    units: UnitState[],
    multiplayer: Multiplayer,
    notify: (text: string) => void,
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

    const stop = () => {
        props.multiplayer.stopCommand(Array.from(props.selectedUnits));
        props.setSelectedAction(undefined);
    }

    const productionUnits = (() => {
        if (props.selectedUnits.size === 0)
            return [];

        if (!allSameType)
            return [];

        const productionComponent = units[0].components.find(c => c.type === 'ProductionFacility') as ProductionFacility;
        if (!productionComponent)
            return [];

        return productionComponent.unitsProduced;
    })();

    // TODO: produce just one unit from the set like SC?
    const produce = (utype: string) => 
        props.multiplayer.produceCommand(Array.from(props.selectedUnits), utype);


    const productionButtons = productionUnits.map(up => {
        const cost = up.productionCost;
        const click = props.resources >= cost ?
            () => produce(up.unitType) :
            () => props.notify("Not enough resources.");

        return (<button
            key={`produce_${up.unitType}`}
            style={{gridRow: "2 / span 1"}}
            onClick={click}
        >Produce {up.unitType}</button>);
    });

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
        const cost = bp.buildCost;

        const active = 
            props.selectedAction &&
            props.selectedAction.action === 'Build' &&
            props.selectedAction.building === b;

        const click = props.resources >= cost ?
            () => build(b, {x: 50, y: 50}) :
            () => props.notify("Not enough resources.");

        return (
            <button
                key={`build_${b}`}
                className={active ? "active" : ""}
                style={{gridRow: "2 / span 1"}}
                onClick={click}
            >Build {b}</button>
        );
    })

    let hint = "";
    if (props.selectedAction) {
        switch (props.selectedAction.action) {
            case 'Build':
                hint = `Right-click on the map to build a ${props.selectedAction.building}.`;
                break;
            case 'Move':
                hint = "Right-click on the map to move, or on a unit to follow it.";
                break;
            case 'Attack':
                hint = "Right-click on an enemy unit to attack it, or on the map to move-attack there.";
                break;
            case 'Harvest':
                hint = "Right-click on a resource node to start harvesting it automatically.";
                break;
        }
    }


    return (
        <div className="CommandPalette">
            { hint && <span className="CommandPaletteHint">{hint}</span> }
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
