import { useState, useEffect, useCallback } from 'react'
import { ThreeEvent } from '@react-three/fiber'

import { SelectedCommand } from '../game/SelectedCommand';
import { canPerformSelectedCommand } from '../game/UnitQuery';

import { Minimap } from './Minimap';
import { CommandPalette } from './CommandPalette';
import { BottomUnitView } from './BottomUnitView';
import { ResourceView } from './ResourceView';
import { PrecountCounter } from './PrecountCounter'
import { Chat } from './Chat';

import { View3D } from '../gfx/View3D';
import { Board3D } from '../gfx/Board3D';

import { SpectatorControl } from '../Multiplayer';

import { MatchMetadata, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from '@bananu7-rts/server/src/types'

type SpectateControllerProps = {
  ctrl: SpectatorControl
}

export function SpectateController(props: SpectateControllerProps) {
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [msgs, setMsgs] = useState([] as string[]);

  const [lastUpdatePacket, setLastUpdatePacket] = useState<UpdatePacket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
      // TODO should this be part of ADT because undefined is annoying af
  const [selectedUnits, setSelectedUnits] = useState(new Set<UnitId>());

  const matchMetadata = props.ctrl.getMatchMetadata();

  const stopSpectating = useCallback(async () => {
    await props.ctrl.stopSpectating();
    setLastUpdatePacket(null);
  }, [props.ctrl]);

  const onUpdatePacket = useCallback((p:UpdatePacket) => {
    setLastUpdatePacket(p);
    setSelectedUnits(su => {
      const newSelectedUnits = new Set(
        p.units
        .map(u => u.id)
        .filter(id => su.has(id))
      );
      return newSelectedUnits;
    });
  }, []);

  useEffect(() => {
    console.log("[MatchController] Initializing and setting update handler")
    props.ctrl.setOnUpdatePacket(onUpdatePacket);
  }, []);

  const lines = msgs.map((m: string, i: number) => <li key={i}>{String(m)}</li>);

  const mapClick = useCallback(() => {
    if (selectedUnits.size === 0)
      return;
    setSelectedUnits(new Set());
  }, [selectedUnits]);

  const unitClick = useCallback((originalEvent: ThreeEvent<MouseEvent>, targetId: UnitId, button: number, shift: boolean) => {
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

      if (selectedUnits.size === 0) {
        break;
      }
      break;
    }

    originalEvent.stopPropagation();

  }, [lastUpdatePacket, selectedUnits]);

  const boardSelectUnits = (newUnits: Set<UnitId>, shift: boolean) => {
    if (shift) {
      setSelectedUnits(units => new Set([...units, ...newUnits]));
    } else {
      setSelectedUnits(newUnits);
    }
  };


  const showGame =
    matchMetadata &&
    lastUpdatePacket &&
    ( lastUpdatePacket.state.id === 'Precount'||
      lastUpdatePacket.state.id === 'Play' ||
      lastUpdatePacket.state.id === 'Paused'
    );

  return (
    <div>
      {
        <Chat
          sendMessage={(msg) => {return; }}
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
        matchMetadata &&
        <>
         <button className="MainMenuButton" onClick={() => setShowMainMenu((smm) => !smm) }>Menu</button>
          { showMainMenu &&
            <div className="MainMenu">
              <h3>Main menu</h3>
              { !matchMetadata && <button>Play</button> }
              { matchMetadata && <button onClick={async () => {
                await stopSpectating();
                setShowMainMenu(false);
              }}>Stop spectating</button> }
              { matchMetadata && <button onClick={() => { console.log(matchMetadata) }}>Dump state</button> }
              { lastUpdatePacket && <button onClick={() => { console.log(lastUpdatePacket) }}>Dump update packet</button> }
            </div>
          }
        </>
      }

      { showGame &&
        <>
          <BottomUnitView
            selectedUnits={selectedUnits}
            setSelectedUnits={setSelectedUnits}
            units={lastUpdatePacket.units}
            ownerIndex={0} // TODO - spectator has no player index
          />
          <ResourceView
            resources={lastUpdatePacket.player.resources}
            units={0} // TODO -spectator doesn't receive data about both players
          />
          <View3D
            startPosition={matchMetadata.board.playerStartLocations[0]}
            viewX={matchMetadata.board.map.w}
            viewY={matchMetadata.board.map.h}
          >
            <Board3D
              board={matchMetadata.board}
              playerIndex={0} // TODO - spectator has no player index
              units={lastUpdatePacket ? lastUpdatePacket.units : []}
              selectedUnits={selectedUnits}
              selectedCommand={undefined} // the board needs selected command to show e.g. build preview
              select={boardSelectUnits}
              mapClick={mapClick}
              unitClick={unitClick}
            />
          </View3D>
          <Minimap board={matchMetadata.board} units={lastUpdatePacket ? lastUpdatePacket.units : []} />
        </>
      }

      { lastUpdatePacket &&
        lastUpdatePacket.state.id === "GameEnded" &&
        <div className="card">
          <h2>Game Over</h2>
          <button onClick={stopSpectating}>Return to main menu</button>
        </div>
      }
  </div>);
}
