import { useState, useEffect, useCallback, CSSProperties } from 'react'

import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from 'rts-server/src/types'
import { Multiplayer, MatchControl, SpectatorControl } from '../Multiplayer';
import { Board, UnitState } from 'rts-server/src/types'
import { MatchList } from '../components/MatchList';

const multiplayer = new Multiplayer("debug_user");

type Props = {
    board: Board,
    units: UnitState[],
}
export function DebugMap(props: Props) {
    const style : CSSProperties = {
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#114411',
        boxSizing: 'border-box',
        overflow: 'hidden',
    };

    const unitStyle = {
        fill:'blue',
        strokeWidth: 1,
        stroke: 'black'
    };

    const contents = props.units.map(u => {
        const ownerToColor = (owner: number) => {
            switch(owner) {
            case 0: return "#dddddd";
            case 1: return "#3333ff";
            case 2: return "#ee1111";
            }
        };
        const color = ownerToColor(u.owner);

        const size = u.kind === 'Base' ? '8' : '3';
        return (<rect
            key={u.id}
            x={u.position.x}
            y={u.position.y}
            width={size}
            height={size}
            style={{...unitStyle, fill: color}}
        />);
    });

    // TODO proper scaling to map size
    return (
        <div style={style}>
            <svg viewBox="0 0 110 110" style={{width: '100%', height: '100%'}}>
                {contents}
            </svg>
        </div>
    );
}

export default function DebugApp() {
    const [controller, setController] = useState<MatchControl | SpectatorControl | null>(null);

    const [lastUpdatePacket, setLastUpdatePacket] = useState<UpdatePacket | null>(null);

    const [serverState, setServerState] = useState<Game | null>(null);
    const refresh = () => {
        if (controller && controller instanceof MatchControl) {
            controller.getMatchState()
            .then(s => setServerState(s));
        }
    };

    useEffect(() => {
        multiplayer.setup({});
    });

    const onUpdatePacket = (p:UpdatePacket) => {
        setLastUpdatePacket(p);
    };

    const joinMatch = async (matchId: string) => {
        const ctrl = await multiplayer.joinMatch(matchId);
        console.log(`[DebugApp] Connected to a match ${matchId}`);
        ctrl.setOnUpdatePacket(onUpdatePacket);
        setController(ctrl);
    };

    const spectateMatch = async (matchId: string) => {
        const ctrl = await multiplayer.spectateMatch(matchId);
        console.log(`[DebugApp] Spectating match ${matchId}`);
        setController(ctrl);
    };

    return (
        <div className="debug">
          <h2>Debug view</h2>
          <button onClick={refresh}>Refresh</button>
          <MatchList
            joinMatch={matchId => multiplayer.joinMatch(matchId)}
            spectateMatch={matchId => multiplayer.spectateMatch(matchId)}
          />
          <span>{lastUpdatePacket ? JSON.stringify(lastUpdatePacket) : ""}</span>
          {
              serverState &&
              lastUpdatePacket &&
              <DebugMap board={serverState.board} units={lastUpdatePacket.units} />
          }
        </div>
    );
}