import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Unit, UnitState, Position, ProductionFacility } from 'server/types'
import { Multiplayer } from '../Multiplayer'

type Props = {
    selectedUnits: Set<UnitId>,
    units: UnitState[],
}

export function BottomUnitView (props: Props) {
    const view = (() => {
        if (props.selectedUnits.size === 0) {
            return (<div>No unit selected</div>);
        }
        else if (props.selectedUnits.size === 1) {
            const uid = Array.from(props.selectedUnits)[0];
            const u = props.units.find(u => u.id === uid);
            if (!u)
                throw new Error("Selected unit id not in the unit set");
            return (<SingleUnitView unit={u} />);
        } else {
            // TODO duplication with CommandPalette
            const units: UnitState[] = 
                Array.from(props.selectedUnits)
                .map(id => {
                    const unit = props.units.find(u => u.id === id);
                    if (!unit)
                        throw new Error("Selected unit id not in the unit set");
                    return unit;
                });

            return (<MultiUnitView units={units} />);
        }
    })();

    return (
        <div className="BottomUnitView">
            { view }
        </div>
    );
}

function SingleUnitView(props: {unit: UnitState}) {
    return (
        <div>
            <h2>{props.unit.kind}</h2>
            <span>{props.unit.status}</span>
        </div>
    );
}

function MultiUnitView(props: {units: UnitState[]}) {
    const style = {
        display: "flex",
        gap: "5px",
    }
    return (
        <div style={style}>
            { props.units.map(u => <div className="UnitIcon" key={u.id}>{u.kind}</div>) }
        </div>
    );
}
