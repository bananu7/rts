import { useState, useEffect, useCallback } from 'react'
import './App.css'

import { MatchList } from './components/MatchList';
import { Minimap } from './components/Minimap';
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

  const leaveMatch = async () => {
    await multiplayer.leaveMatch();
    setLastUpdatePacket(null);
    setServerState(null);
  };

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


    console.log("[App] Bartek RTS starting");
    console.log(`[App] HTTP_API_URL = ${HTTP_API_URL}`);
    fetch(HTTP_API_URL + '/version')
    .then(res => res.text())
    .then(res => console.log("[App] Server version: " + res));
  }, []);

  const lines = msgs.map((m: string, i: number) => <li key={i}>{String(m)}</li>);

  // TODO should this be part of ADT because undefined is annoying af
  const [selectedAction, setSelectedAction] = useState<SelectedAction | undefined>(undefined);

  const [selectedUnits, setSelectedUnits] = useState(new Set<UnitId>());

  const mapClick = useCallback((p: Position, button: number, shift: boolean) => {
    if (selectedUnits.size === 0)
      return;

    // TODO key being pressed and then RMB is attack move
    switch (button) {
    case 0:
      if (!selectedAction) {
        break;
      } else if (selectedAction.action === 'Move') {
        multiplayer.moveCommand(Array.from(selectedUnits), p, shift);
      } else if (selectedAction.action === 'Attack') {
        multiplayer.attackMoveCommand(Array.from(selectedUnits), p, shift);
      } else if (selectedAction.action === 'Build') {
        // Only send one harvester to build
        // TODO send the closest one
        multiplayer.buildCommand([selectedUnits.keys().next().value], selectedAction.building, p, shift);
      }
      break;
    case 2:
      multiplayer.moveCommand(Array.from(selectedUnits), p, shift);
      break;
    }

    setSelectedAction(undefined);

  }, [selectedAction, selectedUnits]);

  // TODO it feels like it shouldn't be be here, maybe GameController component?
  const unitClick = useCallback((targetId: UnitId, button: number, shift: boolean) => {
    if (!lastUpdatePacket)
      return;

    const target = lastUpdatePacket.units.find(u => u.id === targetId);
    if (!target) {
      console.warn("A right click generated on a unit that does not exist");
      return;
    }

    // if the target unit is selected, it shouldn't target itself
    // TODO what about special abilities such as healing?
    selectedUnits.delete(targetId);

    switch (button) {
    case 0:
      if (!selectedAction) {
        if (shift) {
          // shift-click means add if not there, but remove if there
          setSelectedUnits(prev => {
            const units = new Set(prev);
            if (units.has(targetId)) {
              units.delete(targetId);
            }
            else {
              units.add(targetId);
            } 
            return units;
          });
        } else {
          setSelectedUnits(new Set([targetId]));
        }
        break;
      }

      if (selectedUnits.size === 0) {
        break;
      }

      if (selectedAction.action === 'Move') {
        multiplayer.followCommand(Array.from(selectedUnits), targetId, shift);
      } else if (selectedAction.action === 'Attack') {
        multiplayer.attackCommand(Array.from(selectedUnits), targetId, shift);
      } else if (selectedAction.action === 'Harvest') {
        multiplayer.harvestCommand(Array.from(selectedUnits), targetId, shift);
      }
      break;
    case 2:
      // TODO properly understand alliances
      if (target.owner === 0) { // neutral
        // TODO actually check if can harvest and is resource
        multiplayer.harvestCommand(Array.from(selectedUnits), targetId, shift);
      }
      else if (target.owner === multiplayer.getPlayerIndex()) {
        multiplayer.followCommand(Array.from(selectedUnits), targetId, shift);
      }
      else if (target.owner !== multiplayer.getPlayerIndex()) {
        multiplayer.attackCommand(Array.from(selectedUnits), targetId, shift);
      }
      break;
    }
  }, [lastUpdatePacket, selectedAction, selectedUnits]);

  const boardSelectUnits = (newUnits: Set<UnitId>, shift: boolean) => {
    setSelectedAction(undefined);
    if (shift) {
      setSelectedUnits(units => new Set([...units, ...newUnits]));
    } else {
      setSelectedUnits(newUnits);
    }
  };

  // TODO track key down state for stuff like a-move clicks
  const keydown = useCallback((e: React.KeyboardEvent) => {
    if (e.keyCode === 27) { // esc
     setSelectedAction(undefined);
    }
    else if (e.keyCode === 65) { // a
     setSelectedAction({ action: 'Attack' })
    }
    else if (e.keyCode === 87) { // w
      multiplayer.stopCommand(Array.from(selectedUnits));
      setSelectedAction(undefined);
    }
    else {
     console.log(e.keyCode);
    }
  }, [selectedAction, selectedUnits]);

  const appDivStyle = selectedAction ? { cursor: "pointer"} : { };

  const showGame =
    serverState &&
    lastUpdatePacket &&
    ( lastUpdatePacket.state.id === 'Precount'||
      lastUpdatePacket.state.id === 'Play' ||
      lastUpdatePacket.state.id === 'Paused'
    );

  return (
    <div className="App" onKeyDown={keydown} tabIndex={0} style={appDivStyle}>
      {
        <Chat
          sendMessage={(msg) => multiplayer.sendChatMessage(msg)}
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
          <MatchList
            joinMatch={matchId => multiplayer.joinMatch(matchId)}
            spectateMatch={matchId => multiplayer.spectateMatch(matchId)}
          />
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

      {
        serverState &&
        <>
         <button className="MainMenuButton" onClick={() => setShowMainMenu((smm) => !smm) }>Menu</button>
          { showMainMenu &&
            <div className="MainMenu">
              <h3>Main menu</h3>
              <h4>You are player #{multiplayer.getPlayerIndex()}</h4>
              { !serverState && <button>Play</button> }
              { serverState && <button onClick={async () => {
                await leaveMatch();
                setShowMainMenu(false);
              }}>Leave game</button> }
              { serverState && <button onClick={() => { console.log(serverState) }}>Dump state</button> }
              { lastUpdatePacket && <button onClick={() => { console.log(lastUpdatePacket) }}>Dump update packet</button> }
              { serverState && <button onClick={() => { updateMatchState() }}>Update state</button> }
            </div>
          }
        </>
      }

      { showGame &&
        <>
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
              unitClick={unitClick}
            />
          </View3D>
          <Minimap board={serverState.board} units={lastUpdatePacket ? lastUpdatePacket.units : []} />
        </>
      }

      { lastUpdatePacket &&
        lastUpdatePacket.state.id === "GameEnded" &&
        <div className="card">
          <h2>Game Over</h2>
          <button onClick={leaveMatch}>Return to main menu</button>
        </div>
      }
    </div>
  )
}

export default App
