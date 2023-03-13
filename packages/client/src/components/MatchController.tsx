import { useState, useEffect, useCallback } from 'react'

import { SelectedAction } from '../game/SelectedAction';
import { canPerformSelectedAction } from '../game/UnitQuery';

import { Minimap } from './Minimap';
import { CommandPalette } from './CommandPalette';
import { BottomUnitView } from './BottomUnitView';
import { ResourceView } from './ResourceView';
import { PrecountCounter } from './PrecountCounter'
import { Chat } from './Chat';

import { View3D } from '../gfx/View3D';
import { Board3D } from '../gfx/Board3D';

import { MatchControl } from '../Multiplayer';

import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from 'server/src/types'

type MatchControllerProps = {
  ctrl: MatchControl
}
export function MatchController(props: MatchControllerProps) {
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [msgs, setMsgs] = useState([] as string[]);
  const [serverState, setServerState] = useState<Game | null>(null);

  const [lastUpdatePacket, setLastUpdatePacket] = useState<UpdatePacket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
      // TODO should this be part of ADT because undefined is annoying af
  const [selectedAction, setSelectedAction] = useState<SelectedAction | undefined>(undefined);
  const [selectedUnits, setSelectedUnits] = useState(new Set<UnitId>());
 
  const updateMatchState = useCallback(() => {
    props.ctrl.getMatchState()
    .then(s => setServerState(s));
  }, []);

  const leaveMatch = useCallback(async () => {
    await props.ctrl.leaveMatch();
    setLastUpdatePacket(null);
    setServerState(null);
  }, [props.ctrl, setLastUpdatePacket, setServerState]);

  const onUpdatePacket = useCallback((p:UpdatePacket) => {
    setLastUpdatePacket(p);

    // Based on the current state of the game, some actions selected in the UI
    // might not be viable anymore.

    // The selected unit set is pruned from the ones that aren't on the server
    // (most likely were killed while being selected)

    setSelectedUnits(su => {
      const newSelectedUnits = new Set(
        p.units
        .map(u => u.id)
        .filter(id => su.has(id))
      );

      // If after that the selected action can't be performed by the remaining units,
      // clear it
      setSelectedAction(sa => {
        if (!sa) {
          return undefined;
        }

        let canKeepAction = false;
        // TODO maybe units should be indexed by id in the local state?
        for (const u of p.units) {
          if (!newSelectedUnits.has(u.id))
            continue;

          if (canPerformSelectedAction(u, sa)) {
            canKeepAction = true;
            break;
          }
        }

        if (!canKeepAction) {
          return undefined;
        } else {
          return sa;
        }
      });

      return newSelectedUnits;
    });
  }, [setLastUpdatePacket, setSelectedUnits]);

  // previously onMatchConnected
  useEffect(() => {
    console.log("[MatchController] Initializing and setting update handler")
    props.ctrl.setOnUpdatePacket(onUpdatePacket);
    updateMatchState();
  }, []);

  const lines = msgs.map((m: string, i: number) => <li key={i}>{String(m)}</li>);

  const mapClick = useCallback((p: Position, button: number, shift: boolean) => {
    if (selectedUnits.size === 0)
      return;

    // TODO key being pressed and then RMB is attack move
    switch (button) {
    case 0:
      if (!selectedAction) {
        break;
      } else if (selectedAction.action === 'Move') {
        props.ctrl.moveCommand(Array.from(selectedUnits), p, shift);
      } else if (selectedAction.action === 'Attack') {
        props.ctrl.attackMoveCommand(Array.from(selectedUnits), p, shift);
      } else if (selectedAction.action === 'Build') {
        // Only send one harvester to build
        // TODO send the closest one
        props.ctrl.buildCommand([selectedUnits.keys().next().value], selectedAction.building, p, shift);
      }
      break;
    case 2:
      props.ctrl.moveCommand(Array.from(selectedUnits), p, shift);
      break;
    }

    setSelectedAction(undefined);

  }, [selectedAction, selectedUnits]);

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
        props.ctrl.followCommand(Array.from(selectedUnits), targetId, shift);
      } else if (selectedAction.action === 'Attack') {
        props.ctrl.attackCommand(Array.from(selectedUnits), targetId, shift);
      } else if (selectedAction.action === 'Harvest') {
        props.ctrl.harvestCommand(Array.from(selectedUnits), targetId, shift);
      }
      break;
    case 2:
      // TODO properly understand alliances
      if (target.owner === 0) { // neutral
        // TODO actually check if can harvest and is resource
        props.ctrl.harvestCommand(Array.from(selectedUnits), targetId, shift);
      }
      else if (target.owner === props.ctrl.getPlayerIndex()) {
        props.ctrl.followCommand(Array.from(selectedUnits), targetId, shift);
      }
      else if (target.owner !== props.ctrl.getPlayerIndex()) {
        props.ctrl.attackCommand(Array.from(selectedUnits), targetId, shift);
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
      props.ctrl.stopCommand(Array.from(selectedUnits));
      setSelectedAction(undefined);
    }
    else {
     console.log(e.keyCode);
    }
  }, [selectedAction, selectedUnits]);

  const gameDivStyle = selectedAction ? { cursor: "pointer"} : { };

  const showGame =
    serverState &&
    lastUpdatePacket &&
    ( lastUpdatePacket.state.id === 'Precount'||
      lastUpdatePacket.state.id === 'Play' ||
      lastUpdatePacket.state.id === 'Paused'
    );

  return (
    <div onKeyDown={keydown} style={gameDivStyle}>
      {
        <Chat
          sendMessage={(msg) => props.ctrl.sendChatMessage(msg)}
          messages={messages}
        />
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
              <h4>You are player #{props.ctrl.getPlayerIndex()}</h4>
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
            ctrl={props.ctrl}
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
              playerIndex={props.ctrl.getPlayerIndex()}
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
  </div>);
}