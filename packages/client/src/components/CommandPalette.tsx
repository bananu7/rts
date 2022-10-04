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

type ButtonProps = {
    x?: number,
    y: number,
    active: boolean,
    onClick:() => void,
    children: React.ReactNode,
}

function Button(props: ButtonProps) {
    const style = {
        gridRow: `${props.y} / span 1`,
    };

    if (props.x) {
        (style as any)["gridColumn"] = `${props.x} / span 1`;
    }

    return (
        <button
            className={props.active ? "active" : ""}
            style={style}
            onClick={props.onClick}
        >{props.children}</button>
    );
}

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
        const canAfford = props.resources >= cost;
        const click = canAfford ?
            () => produce(up.unitType) :
            () => props.notify("Not enough resources.");

        return (
            <Button
                key={`produce_${up.unitType}`}
                active={false}
                y={2}
                onClick={click}
            >
            Produce {up.unitType}
            <span className="tooltip">
                <strong>{up.unitType}</strong>
                <span style={{float:"right", color: canAfford?"white":"red"}}>{cost}💰</span>
                <br /><br/>
                This excellent unit will serve you well, and I
                would tell you how but the tooltip data isn't
                populated for units yet.
            </span>
            </Button>
        );
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
            props.selectedAction.building === b || false;

        const canAfford = props.resources >= cost;

        const click = canAfford ?
            () => build(b, {x: 50, y: 50}) :
            () => props.notify("Not enough resources.");

        return (
            <Button
                key={`build_${b}`}
                active={active}
                y={2}
                onClick={click}
            >
            Build {b}
            <span className="tooltip">
                <strong>{b}</strong>
                <span style={{float:"right", color: canAfford?"white":"red"}}>{cost}💰</span>
                <br /><br/>
                This building probably does something, but that
                information would need to be stored in a dictionary
                somewhere and pulled in during button/tooltip creation.
            </span>

            </Button>
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
                <Button
                    key="Move"
                    x={1} y={1}
                    active={props.selectedAction && props.selectedAction.action === 'Move' || false}
                    onClick={() => props.setSelectedAction({ action: 'Move'})}
                >
                    <span style={{fontSize: "2em"}}>➜</span>
                    <span className="tooltip">Move a unit to a specific location or order it to follow a unit.</span>
                </Button>
            }

            <Button
                key="stop"
                x={2} y={1}
                active={false}
                onClick={stop}
            >
                <span style={{fontSize: "2em"}}>✖</span>
                <span className="tooltip">Stop the current action and all the queued ones.</span>
            </Button>

            {
                canAttack &&
                <Button
                    key="attack"
                    x={3} y={1}
                    active={props.selectedAction && props.selectedAction.action === 'Attack' || false}
                    onClick={() => props.setSelectedAction({ action: 'Attack'})}
                >
                    <span style={{fontSize: "2em"}}>🪓</span>
                    <span className="tooltip">Attack an enemy unit or move towards a point and attack any enemy units on the way</span>
                </Button>
            }

            { productionButtons }
            { buildButtons }
        </div>
    );
};
