import { useState, useEffect, useCallback } from 'react'
import './App.css'

import { MatchList } from './MatchList';
import { Minimap } from './Minimap';
import { CommandPalette } from './components/CommandPalette';

import { View3D } from './gfx/View3D';
import { Board3D } from './gfx/Board3D';

import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from 'server/types'
import { Multiplayer } from './Multiplayer';

const multiplayer = new Multiplayer("bananu7");

function App() {
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [msgs, setMsgs] = useState([] as string[]);
  const [serverState, setServerState] = useState<Game | null>(null);

  const [lastUpdatePacket, setLastUpdatePacket] = useState<UpdatePacket | null>(null);
 
  const getMatchState = useCallback((matchId: string) => {
    console.log("Getting match state");
    fetch(`http://${window.location.hostname}:9208/getMatchState?` + new URLSearchParams({ matchId }))
      .then(r => r.json())
      .then(s => setServerState(s));
  }, []);

  useEffect(() => {
    multiplayer.setup({
      onUpdatePacket: (p:UpdatePacket) => setLastUpdatePacket(p),
      onMatchConnected: (matchId: string) => getMatchState(matchId),
    });
  }, []);

  const lines = msgs.map((m: string, i: number) => <li key={i}>{String(m)}</li>);

  const [selectedUnits, setSelectedUnits] = useState(new Set<UnitId>());

  const mapClick = useCallback((p: Position) => {
    selectedUnits.forEach(u => {
      multiplayer.moveCommand(p, u);
    });
  }, [selectedUnits]);

  const unitRightClick = (targetId: UnitId) => {
    if (!lastUpdatePacket)
      return;

    const target = lastUpdatePacket.units.find(u => u.id === targetId);
    if (!target) {
      console.warn("A right click generated on a unit that does not exist");
      return;
    }

    selectedUnits.forEach(u => {
      // TODO - handle actual user numbers
      if (target.owner === 1) {
        multiplayer.followCommand(u, targetId);
      } else {
        multiplayer.attackCommand(u, targetId);
      }
    });
  }

  return (
    <div className="App">
      <button className="MainMenuButton" onClick={() => setShowMainMenu((smm) => !smm) }>Menu</button>
      {showMainMenu &&
        <div className="MainMenu">
          <h3>Main menu</h3>
          <button>Play</button>
          <button>Leave game</button>
        </div>
      }

      <div className="chat">
          <ul>
            {lines}
          </ul>
          <button onClick={ () => multiplayer.sendChatMessage("lol") }>Chat</button>
      </div>

      { !serverState &&
        <div className="card">
          <MatchList joinMatch={(matchId) => multiplayer.joinMatch(matchId)} />
          <button onClick={() => multiplayer.createMatch()}>Create</button>
        </div>
      }

      { serverState &&
        <>
          <CommandPalette selectedUnits={selectedUnits} multiplayer={multiplayer} />
          <View3D>
            <Board3D
              board={serverState.board}
              unitStates={lastUpdatePacket ? lastUpdatePacket.units : []}
              selectedUnits={selectedUnits}
              select={setSelectedUnits}
              mapClick={mapClick}
              unitRightClick={unitRightClick}
            />
          </View3D>
          <Minimap board={serverState.board} units={lastUpdatePacket ? lastUpdatePacket.units : []} />
        </>
      }
    </div>
  )
}

export default App
