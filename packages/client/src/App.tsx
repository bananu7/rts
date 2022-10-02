import { useState, useEffect, useCallback } from 'react'
import './App.css'

import { MatchList } from './MatchList';
import { Minimap } from './Minimap';
import { CommandPalette } from './components/CommandPalette';
import { BottomUnitView } from './components/BottomUnitView';
import { ResourceView } from './components/ResourceView';

import { View3D } from './gfx/View3D';
import { Board3D } from './gfx/Board3D';

import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from 'server/types'
import { Multiplayer } from './Multiplayer';
import { HTTP_API_URL } from './config';

const multiplayer = new Multiplayer("bananu7");

function App() {
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [msgs, setMsgs] = useState([] as string[]);
  const [serverState, setServerState] = useState<Game | null>(null);

  const [lastUpdatePacket, setLastUpdatePacket] = useState<UpdatePacket | null>(null);
 
  const updateMatchState = useCallback(() => {
    multiplayer.getMatchState()
    .then(s => setServerState(s));
  }, []);

  useEffect(() => {
    multiplayer.setup({
      onUpdatePacket: (p:UpdatePacket) => setLastUpdatePacket(p),
      onMatchConnected: (matchId: string) => {
        console.log(`[App] Connected to a match ${matchId}`);
        updateMatchState();
      }
    });
  }, []);

  const lines = msgs.map((m: string, i: number) => <li key={i}>{String(m)}</li>);

  const [selectedUnits, setSelectedUnits] = useState(new Set<UnitId>());

  const mapClick = useCallback((p: Position) => {
    if (selectedUnits.size === 0)
      return;
    
    multiplayer.moveCommand(Array.from(selectedUnits), p);
  }, [selectedUnits]);

  // TODO it feels like it shouldn't be be here, maybe GameController component?
  const unitRightClick = (targetId: UnitId) => {
    if (!lastUpdatePacket)
      return;

    if (selectedUnits.size === 0)
      return;

    const target = lastUpdatePacket.units.find(u => u.id === targetId);
    if (!target) {
      console.warn("A right click generated on a unit that does not exist");
      return;
    }

    // TODO properly understand your own id
    if (target.owner === 0) { // neutral
      // TODO actually check if can harvest and is resource
      multiplayer.harvestCommand(Array.from(selectedUnits), targetId);
    }
    else if (target.owner === 1) {
      multiplayer.followCommand(Array.from(selectedUnits), targetId);
    }
    else if (target.owner === 2) {
      multiplayer.attackCommand(Array.from(selectedUnits), targetId);
    }
  }

  return (
    <div className="App">
      { showMainMenu &&
        <div className="MainMenu">
          <h3>Main menu</h3>
          { !serverState && <button>Play</button> }
          { serverState && <button onClick={() => { multiplayer.leaveMatch(); setServerState(null); }}>Leave game</button> }
          { serverState && <button onClick={() => { console.log(serverState) }}>Dump state</button> }
          { lastUpdatePacket && <button onClick={() => { console.log(lastUpdatePacket) }}>Dump update packet</button> }
          { serverState && <button onClick={() => { updateMatchState() }}>Update state</button> }
        </div>
      }

      {/*<div className="chat">
          <ul>
            {lines}
          </ul>
          <button onClick={ () => multiplayer.sendChatMessage("lol") }>Chat</button>
      </div>*/}

      { !serverState &&
        <div className="card">
          <MatchList joinMatch={(matchId) => multiplayer.joinMatch(matchId)} />
          <button onClick={() => multiplayer.createMatch()}>Create</button>
        </div>
      }

      { serverState && lastUpdatePacket &&
        <>
          <button className="MainMenuButton" onClick={() => setShowMainMenu((smm) => !smm) }>Menu</button>
          <CommandPalette
            selectedUnits={selectedUnits}
            units={lastUpdatePacket.units}
            multiplayer={multiplayer}
          />
          <BottomUnitView
            selectedUnits={selectedUnits}
            units={lastUpdatePacket.units}
          />
          <ResourceView resources={lastUpdatePacket.player.resources} />
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
