import { useState, useEffect, useCallback } from 'react'
import './App.css'

import { MatchList } from './MatchList';
import { Minimap } from './Minimap';
import { CommandPalette, SelectedAction } from './components/CommandPalette';
import { BottomUnitView } from './components/BottomUnitView';
import { ResourceView } from './components/ResourceView';
import { PrecountCounter } from './components/PrecountCounter'
import { Chat } from './components/Chat';

import { View3D } from './gfx/View3D';
import { Board3D } from './gfx/Board3D';

import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from 'server/types'
import { Multiplayer } from './Multiplayer';
import { HTTP_API_URL } from './config';

// TODO
let userId = localStorage.getItem("userId");
if (!userId) {
  userId = window.prompt("Please provide your user id");
  if (userId)
    localStorage.setItem('userId', userId);
  else
    throw "No user id present; set item 'userId' in localStorage to play";
}
const multiplayer = new Multiplayer(userId);

function App() {
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [msgs, setMsgs] = useState([] as string[]);
  const [serverState, setServerState] = useState<Game | null>(null);

  const [lastUpdatePacket, setLastUpdatePacket] = useState<UpdatePacket | null>(null);

  const [messages, setMessages] = useState<string[]>([]);
 
  const updateMatchState = useCallback(() => {
    multiplayer.getMatchState()
    .then(s => setServerState(s));
  }, []);

  useEffect(() => {
    multiplayer.setup({
      onUpdatePacket: (p:UpdatePacket) => {
        setLastUpdatePacket(p);
        setSelectedUnits(su => new Set(p.units.map(u => u.id).filter(id => su.has(id))));
      },
      onMatchConnected: (matchId: string) => {
        console.log(`[App] Connected to a match ${matchId}`);
        updateMatchState();
      }
    });
  }, []);

  const lines = msgs.map((m: string, i: number) => <li key={i}>{String(m)}</li>);

  const [selectedAction, setSelectedAction] = useState<SelectedAction | undefined>(undefined);

  const [selectedUnits, setSelectedUnits] = useState(new Set<UnitId>());

  const mapClick = useCallback((p: Position) => {
    if (selectedUnits.size === 0)
      return;

    const action = selectedAction ?? { action: 'Move' };
    switch(action.action) {
    case 'Move':
      multiplayer.moveCommand(Array.from(selectedUnits), p);
      break;
    case 'Attack':
      multiplayer.attackMoveCommand(Array.from(selectedUnits), p);
      break;
    case 'Build':
      multiplayer.buildCommand(Array.from(selectedUnits), action.building, p);
      break;
    }

    setSelectedAction(undefined);

  }, [selectedAction, selectedUnits]);

  const boardSelectUnits = (units: Set<UnitId>) => {
    setSelectedAction(undefined);
    setSelectedUnits(units);
  };

  // TODO it feels like it shouldn't be be here, maybe GameController component?
  const unitRightClick = (targetId: UnitId) => {
    if (!lastUpdatePacket)
      return;

    // if the target unit is selected, it shouldn't target itself
    // TODO what about special abilities such as healing?
    selectedUnits.delete(targetId);

    if (selectedUnits.size === 0)
      return;

    const target = lastUpdatePacket.units.find(u => u.id === targetId);
    if (!target) {
      console.warn("A right click generated on a unit that does not exist");
      return;
    }

    // TODO properly understand alliances
    if (target.owner === 0) { // neutral
      // TODO actually check if can harvest and is resource
      multiplayer.harvestCommand(Array.from(selectedUnits), targetId);
    }
    else if (target.owner === multiplayer.getPlayerIndex()) {
      multiplayer.followCommand(Array.from(selectedUnits), targetId);
    }
    else if (target.owner !== multiplayer.getPlayerIndex()) {
      multiplayer.attackCommand(Array.from(selectedUnits), targetId);
    }
  }

  return (
    <div className="App">
      { showMainMenu &&
        <div className="MainMenu">
          <h3>Main menu</h3>
          <h4>You are player #{multiplayer.getPlayerIndex()}</h4>
          { !serverState && <button>Play</button> }
          { serverState && <button onClick={() => { multiplayer.leaveMatch(); setServerState(null); }}>Leave game</button> }
          { serverState && <button onClick={() => { console.log(serverState) }}>Dump state</button> }
          { lastUpdatePacket && <button onClick={() => { console.log(lastUpdatePacket) }}>Dump update packet</button> }
          { serverState && <button onClick={() => { updateMatchState() }}>Update state</button> }
        </div>
      }

      {
        <Chat
          sendMessage={(msg) => multiplayer.sendChatMessage("lol")}
          messages={messages}
        />
      }

      { !serverState &&
        <div className="card">
          <h1>Welcome to (for the lack of a better name) BartekRTS</h1>
          <p>To play, either join an existing match, or create a new one. You will
          need two people to play; the game won't start until two people join. You can
          only join matches in the "lobby" state, you can't join matches that have already started
          </p>
          <p>The game is designed to be able to be refreshed at any time. If you experience any
          weird behavior or crashes, refreshing the page should help and will reconnect you
          back to your game.</p>
          <p><strong>GLHF!</strong></p>
          <br />
          <MatchList joinMatch={(matchId) => multiplayer.joinMatch(matchId)} />
          <div style={{textAlign:"center"}}>
            <button onClick={() => multiplayer.createMatch()}>Create</button>
          </div>
        </div>
      }

      { lastUpdatePacket && 
        lastUpdatePacket.state.id === 'Precount' &&
        <PrecountCounter count={lastUpdatePacket.state.count} />
      }

      { lastUpdatePacket && 
        lastUpdatePacket.state.id === 'Lobby' &&
        <div className="card">
          <span>Waiting for the other player to join</span>
        </div>
      }

      { lastUpdatePacket && 
        lastUpdatePacket.state.id === 'Paused' &&
        <div className="card">
          <span>Game paused</span>
        </div>
      }

      { serverState &&
        lastUpdatePacket && 
        (lastUpdatePacket.state.id === 'Precount' || lastUpdatePacket.state.id === 'Play' || lastUpdatePacket.state.id === 'Paused')
        &&
        <>
          <button className="MainMenuButton" onClick={() => setShowMainMenu((smm) => !smm) }>Menu</button>
          <CommandPalette
            resources={lastUpdatePacket.player.resources}
            selectedUnits={selectedUnits}
            units={lastUpdatePacket.units}
            multiplayer={multiplayer}
            selectedAction={selectedAction}
            setSelectedAction={setSelectedAction}
            notify={(msg) => setMessages(m => [...m, msg]) }
          />
          <BottomUnitView
            selectedUnits={selectedUnits}
            setSelectedUnits={setSelectedUnits}
            units={lastUpdatePacket.units}
          />
          <ResourceView resources={lastUpdatePacket.player.resources} />
          <View3D>
            <Board3D
              board={serverState.board}
              playerIndex={multiplayer.getPlayerIndex() || 0} // TODO really need a match class to fix this undefined
              unitStates={lastUpdatePacket ? lastUpdatePacket.units : []}
              selectedUnits={selectedUnits}
              selectedAction={selectedAction}
              select={boardSelectUnits}
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
