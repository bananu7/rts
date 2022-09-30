import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Unit, UnitState, Position, ProductionFacility } from 'server/types'
import { Multiplayer } from '../Multiplayer'

type Props = {
    selectedUnits: Set<UnitId>,
    units: UnitState[],
    multiplayer: Multiplayer,
}

export function CommandPalette(props: Props) {
    const move = () => props.multiplayer.moveCommand(Array.from(props.selectedUnits), {x:50, y:50});

    const productionUnits = (() => {
        if (props.selectedUnits.size === 0)
            return [];

        const units: UnitState[] = 
            Array.from(props.selectedUnits)
            .map(id => {
                const unit = props.units.find(u => u.id === id);
                if (!unit)
                    throw new Error("Selected unit id not in the unit set");
                return unit;
            });

        const allSameType = units.every(u => u.kind === units[0].kind);

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

    return (
        <div className="CommandPalette">
            <button key="move" onClick={move}>Move</button>

            { productionButtons }
        </div>
    );
};
