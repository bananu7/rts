import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Unit, Position, ProductionFacility, Hp, Builder } from '@bananu7-rts/server/src/types'
import { Multiplayer } from '../Multiplayer'

type Props = {
    selectedUnits: Set<UnitId>,
    setSelectedUnits: (us: Set<UnitId>) => void,
    units: Unit[],
    ownerIndex: number,
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
            const owned = u.owner === props.ownerIndex;
            return (<SingleUnitView unit={u} owned={owned}/>);
        } else {
            // TODO duplication with CommandPalette
            const units: Unit[] = 
                Array.from(props.selectedUnits)
                .map(id => {
                    const unit = props.units.find(u => u.id === id);
                    if (!unit)
                        throw new Error("Selected unit id not in the unit set");
                    return unit;
                });

            return (
                <MultiUnitView
                    units={units}
                    select={id => props.setSelectedUnits(new Set([id]))}
                    deselect={id => props.setSelectedUnits(
                        new Set(Array.from(props.selectedUnits).filter(i => i !== id))
                    )}
                />
            );
        }
    })();

    return (
        <div className="BottomUnitView">
            { view }
        </div>
    );
}

function HealthBar(props: {hp: number, maxHp: number}) {
    const outer = {
        height: "3px",
        width: "100%",
        backgroundColor: "black",
    };
    const bar = {
        width: `${(props.hp * 100) / props.maxHp}%`,
        height: '100%',
        backgroundColor: '#00ee00',
    };
    return (
        <div style={outer}>
            <div style={bar} />
        </div>
    );
}

function ProductionProgressBar(props: {percent: number}) {
    const outer = {
        height: "15px",
        width: "100%",
        backgroundColor: "transparent",
        border: "1px solid #333",
        borderRadius: "3px",
    };
    const bar = {
        width: `${props.percent}%`,
        height: '100%',
        backgroundColor: '#00ee00',
    };
    return (
        <div style={outer}>
            <div style={bar} />
        </div>
    );
}


function SingleUnitView(props: {unit: Unit, owned: boolean}) {
    const health = props.unit.components.find(c => c.type === "Hp") as Hp | undefined;

    const productionComponent = props.unit.components.find(c => c.type === "ProductionFacility") as ProductionFacility;
    const productionProgress = (() => {
        if (!productionComponent)
            return;
        if (!productionComponent.productionState)
            return;

        const left = productionComponent.productionState.timeLeft;
        const full = productionComponent.productionState.originalTimeToProduce;
        const percent = ((full-left)/full) * 100;
        return percent;
    })();
        
    return (
        <div>
            <h2>{props.unit.kind}</h2>
            { health && <HealthBar hp={health.hp} maxHp={health.maxHp} /> }
            { health && <h3>{health.hp}/{health.maxHp}</h3> }
            { props.owned && productionProgress && <ProductionProgressBar percent={productionProgress} /> }
        </div>
    );
}

// TODO select on click
function UnitIcon(props: {unit: Unit, onClick: (e: React.MouseEvent<HTMLElement>) => void}) {
    const u = props.unit;

    // TODO component getters to shared code
    const health = u.components.find(c => c.type === "Hp") as Hp | undefined;

    return (
        <div
            className="UnitIcon"
            onClick={props.onClick}
        >
            {u.kind}
            { health && <HealthBar hp={health.hp} maxHp={health.maxHp} /> }
        </div>
    );
}

type MultiUnitViewProps = {
    units: Unit[];
    select: (id: UnitId) => void;
    deselect: (id: UnitId) => void;
}
function MultiUnitView(props: MultiUnitViewProps) {
    return (
        <div className="MultiUnitView">
            { props.units.map(u => 
                <UnitIcon
                    key={u.id}
                    unit={u}
                    onClick={e =>
                        e.shiftKey
                        ? props.deselect(u.id)
                        : props.select(u.id)
                    }
                />)
            }
        </div>
    );
}
