import { useState, useEffect, useCallback, useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'

import { SelectedCommand } from '../game/SelectedCommand';
import { canPerformSelectedCommand, getBuildingSizeFromBuildingName } from '../game/UnitQuery';
import { clampToGrid } from '../game/Grid';
import { Minimap } from './Minimap';
import { CommandPalette } from './CommandPalette';
import { BottomUnitView } from './BottomUnitView';
import { ResourceView } from './ResourceView';
import { PrecountCounter } from './PrecountCounter'
import { Chat } from './Chat';
import { Lobby } from './Lobby';

import { View3D } from '../gfx/View3D';
import { Board3D } from '../gfx/Board3D';

import { MatchControl } from '../Multiplayer';

import { MatchMetadata, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from '@bananu7-rts/server/src/types'
import { mapEmptyForBuilding } from '@bananu7-rts/server/src/shared'

type GameOverCardProps = {
  playerIndex: number,
  lastUpdatePacket: UpdatePacket | null,
  leaveMatch: () => void,
}
function GameOverCard(props: GameOverCardProps) {
  const lastUpdatePacket = props.lastUpdatePacket;

  if (!lastUpdatePacket)
    return null;

  if (lastUpdatePacket.state.id !== "GameEnded")
    return null;

  const victory = lastUpdatePacket.state.winnerIndices.indexOf(props.playerIndex) !== -1;
  const text = victory ? "Victory!" : "Defeat!";

  return (
    <div className="card">
      <h2>{text}</h2>
      <button onClick={props.leaveMatch}>Return to main menu</button>
    </div>
  );
}

type MatchControllerProps = {
  ctrl: MatchControl,
}
export function MatchController(props: MatchControllerProps) {
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [msgs, setMsgs] = useState([] as string[]);
 
  const [lastUpdatePacket, setLastUpdatePacket] = useState<UpdatePacket | null>(null);

  const [messages, setMessages] = useState<string[]>([]);
      // TODO should this be part of ADT because undefined is annoying af
  const [selectedCommand, setSelectedCommand] = useState<SelectedCommand | undefined>(undefined);
  const [selectedUnits, setSelectedUnits] = useState(new Set<UnitId>());

  const matchMetadata = props.ctrl.getMatchMetadata();

  const leaveMatch = useCallback(async () => {
    await props.ctrl.leaveMatch();
    setLastUpdatePacket(null);
  }, [props.ctrl]);

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

      // If after that the selected command can't be performed by the remaining units,
      // clear it
      setSelectedCommand(sc => {
        if (!sc) {
          return undefined;
        }

        let canKeepCommand = false;
        // TODO maybe units should be indexed by id in the local state?
        for (const u of p.units) {
          if (!newSelectedUnits.has(u.id))
            continue;

          if (canPerformSelectedCommand(u, sc)) {
            canKeepCommand = true;
            break;
          }
        }

        if (!canKeepCommand) {
          return undefined;
        } else {
          return sc;
        }
      });

      return newSelectedUnits;
    });
  }, []);

  useEffect(() => {
    console.log("[MatchController] Initializing and setting update handler")
    props.ctrl.setOnUpdatePacket(onUpdatePacket);
  }, []);

  const lines = useMemo(() =>
    msgs.map((m: string, i: number) => <li key={i}>{String(m)}</li>)
  , [msgs]);

  const mapClick = useCallback((originalEvent: ThreeEvent<MouseEvent>, p: Position, button: number, shift: boolean) => {
    if (selectedUnits.size === 0)
      return;

    // TODO key being pressed and then RMB is attack move
    switch (button) {
    case 0:
      if (!selectedCommand) {
        break;
      } else if (selectedCommand.command === 'Move') {
        props.ctrl.moveCommand(Array.from(selectedUnits), p, shift);
      } else if (selectedCommand.command === 'Attack') {
        props.ctrl.attackMoveCommand(Array.from(selectedUnits), p, shift);
      } else if (selectedCommand.command === 'Build') {
        // Only send one harvester to build
        // TODO send the closest one
        const gridPos = clampToGrid(p);

        const buildingSize = getBuildingSizeFromBuildingName(selectedCommand.building);
        const emptyForBuilding = mapEmptyForBuilding(matchMetadata.board.map, {size: buildingSize, type: 'Building'}, gridPos);
        if (emptyForBuilding) {
          props.ctrl.buildCommand([selectedUnits.keys().next().value], selectedCommand.building, gridPos, shift);
        } else {
          console.log("[MatchController] trying to build in an invalid location")
        }
      }
      break;
    case 2:
      props.ctrl.moveCommand(Array.from(selectedUnits), p, shift);
      break;
    }

    setSelectedCommand(undefined);

  }, [matchMetadata, selectedCommand, selectedUnits]); // TODO will get recomputed on every new state, should it use ref?

  const unitClick = useCallback((originalEvent: ThreeEvent<MouseEvent>, targetId: UnitId, button: number, shift: boolean) => {
    if (!lastUpdatePacket) {
      originalEvent.stopPropagation();
      return;
    }

    const target = lastUpdatePacket.units.find(u => u.id === targetId);
    if (!target) {
      console.warn("[MatchController] A right click generated on a unit that does not exist");
      originalEvent.stopPropagation();
      return;
    }

    // if the target unit is selected, it shouldn't target itself
    // TODO what about special abilities such as healing?
    selectedUnits.delete(targetId);

    switch (button) {
    case 0:
      if (!selectedCommand) {
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

      if (selectedCommand.command === 'Build') {
        // propagate the event so that it hits the map instead
        return;
      } else if (selectedCommand.command === 'Move') {
        props.ctrl.followCommand(Array.from(selectedUnits), targetId, shift);
        setSelectedCommand(undefined);
      } else if (selectedCommand.command === 'Attack') {
        props.ctrl.attackCommand(Array.from(selectedUnits), targetId, shift);
        setSelectedCommand(undefined);
      } else if (selectedCommand.command === 'Harvest') {
        props.ctrl.harvestCommand(Array.from(selectedUnits), targetId, shift);
        setSelectedCommand(undefined);
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

    originalEvent.stopPropagation();

  }, [lastUpdatePacket, selectedCommand, selectedUnits]);

  const boardSelectUnits = (newUnits: Set<UnitId>, shift: boolean) => {
    setSelectedCommand(undefined);
    if (shift) {
      setSelectedUnits(units => new Set([...units, ...newUnits]));
    } else {
      setSelectedUnits(newUnits);
    }
  };

  // TODO track key down state for stuff like a-move clicks
  const keydown = useCallback((e: React.KeyboardEvent) => {
    if (e.keyCode === 27) { // esc
      setSelectedCommand(undefined);
    }
    else if (e.keyCode === 65) { // a
      setSelectedCommand({ command: 'Attack' })
    }
    else if (e.keyCode === 87) { // w
      props.ctrl.stopCommand(Array.from(selectedUnits));
      setSelectedCommand(undefined);
    }
    else {
      console.log("[MatchController] registered keycode", e.keyCode);
    }
  }, [selectedCommand, selectedUnits]);

  const gameDivStyle = selectedCommand ? { cursor: "pointer"} : { };

  const showGame =
    matchMetadata &&
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

      { /* TODO move to Lobby */ }
      { lastUpdatePacket && 
        lastUpdatePacket.state.id === 'Precount' &&
        <PrecountCounter count={lastUpdatePacket.state.count} />
      }

      { lastUpdatePacket && 
        lastUpdatePacket.state.id === 'Lobby' &&
        matchMetadata &&
        <Lobby
          matchMetadata={matchMetadata}
          leaveMatch={leaveMatch}
        />
      }

      { lastUpdatePacket && 
        lastUpdatePacket.state.id === 'Paused' &&
        <div className="card">
          <span>Game paused</span>
        </div>
      }

      {
        matchMetadata &&
        <>
         <button className="MainMenuButton" onClick={() => setShowMainMenu((smm) => !smm) }>Menu</button>
          { showMainMenu &&
            <div className="MainMenu">
              <h3>Main menu</h3>
              <h4>You are player #{props.ctrl.getPlayerIndex()}</h4>
              { !matchMetadata && <button>Play</button> }
              { matchMetadata && <button onClick={async () => {
                await leaveMatch();
                setShowMainMenu(false);
              }}>Leave game</button> }
              { matchMetadata && <button onClick={() => { console.log(matchMetadata) }}>Dump match metadata</button> }
              { lastUpdatePacket && <button onClick={() => { console.log(lastUpdatePacket) }}>Dump update packet</button> }
            </div>
          }
        </>
      }

      { showGame &&
        <>
          <CommandPalette
            resources={lastUpdatePacket.player.resources}
            selectedUnits={selectedUnits}
            ownerIndex={props.ctrl.getPlayerIndex()}
            units={lastUpdatePacket.units}
            ctrl={props.ctrl}
            selectedCommand={selectedCommand}
            setSelectedCommand={setSelectedCommand}
            notify={(msg) => setMessages(m => [...m, msg]) }
          />
          <BottomUnitView
            selectedUnits={selectedUnits}
            setSelectedUnits={setSelectedUnits}
            units={lastUpdatePacket.units}
            ownerIndex={props.ctrl.getPlayerIndex()}
          />
          <ResourceView
            resources={lastUpdatePacket.player.resources}
            units={lastUpdatePacket.units.filter(u => u.owner === props.ctrl.getPlayerIndex()).length}
          />
          <View3D viewX={300} viewY={150} >
            <Board3D
              board={matchMetadata.board}
              playerIndex={props.ctrl.getPlayerIndex()}
              units={lastUpdatePacket ? lastUpdatePacket.units : []}
              selectedUnits={selectedUnits}
              selectedCommand={selectedCommand}
              select={boardSelectUnits}
              mapClick={mapClick}
              unitClick={unitClick}
            />
          </View3D>
          <Minimap board={matchMetadata.board} units={lastUpdatePacket ? lastUpdatePacket.units : []} />
        </>
      }

      <GameOverCard
        playerIndex={props.ctrl.getPlayerIndex()}
        lastUpdatePacket={lastUpdatePacket}
        leaveMatch={leaveMatch}
      />
  </div>);
}