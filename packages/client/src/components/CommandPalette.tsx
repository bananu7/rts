import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from 'server/types'
import { Multiplayer } from '../Multiplayer'

type Props = {
    selectedUnits: Set<UnitId>,
    multiplayer: Multiplayer,
}

export function CommandPalette(props: Props) {
    return (
        <div className="CommandPalette">
            <button onClick={() => props.multiplayer.moveCommand({x:50, y:50}, 1)}>Move</button>
        </div>
    );
};
