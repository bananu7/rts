import { useState, useEffect } from 'react'
import './App.css'

import { MatchList } from './MatchList';
import { Minimap } from './Minimap';

import { View3D } from './gfx/View3D';
import { Board3D } from './gfx/Board3D';

import geckos, { Data } from '@geckos.io/client'

import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from 'server/types'

let channel = geckos({ port: 9208 });
let geckosSetUp = false;

const playerId = 1;

function App() {
  const [msgs, setMsgs] = useState([] as Data[]);
  const [serverState, setServerState] = useState<Game | null>(null);

  const [lastUpdatePacket, setLastUpdatePacket] = useState<UpdatePacket | null>(null);
 
  const getMatchState = (matchId: string) => {
    fetch('http://localhost:9208/getMatchState?' + new URLSearchParams({ matchId }))
      .then(r => r.json())
      .then(s => setServerState(s));
  }

  useEffect(() => {
    if (geckosSetUp)
      return;
    geckosSetUp = true;

    channel.onConnect((error: any) => {
      if (error) {
        console.error(error.message)
        return
      }

      console.log('Channel set up correctly')

      // rejoin
      const matchId = localStorage.getItem('matchId');
      if (matchId) {
        console.log(`Rejoining match ${matchId}`)
        channel.emit('rejoin', { matchId, playerId });
      }

      // set up handlers
      channel.on('chat message', (data: Data) => {
        msgs.push(data);
        setMsgs(msgs);
      })

      channel.on('tick', (data: Data) => {
        const u = data as UpdatePacket;
        setLastUpdatePacket(u);
      })

      channel.on('joined', (data: Data) => {
        const matchId = String(data);
        console.log(`server confirmed match join to match ${matchId}`);
        localStorage.setItem('matchId', matchId);
        getMatchState(matchId);
      });

      channel.on('join failure', (data: Data) => {
        console.log("server refused join or rejoin, clearing match association");
        localStorage.removeItem('matchId');
      });
    })
  }, []);

  const lines = msgs.map((m: Data, i: number) => <li key={i}>{String(m)}</li>);

  const joinMatch = (matchId: string) => {
    const data : IdentificationPacket = {
      playerId,
      matchId
    };

    channel.emit('join', data);
  };

  const moveCommand = (target: Position, unitId: UnitId) => {
    const cmd : CommandPacket = {
      action: {
        typ: 'Move',
        target
      },
      unitId: unitId,
      shift: false,
    };
    channel.emit('command', cmd)
  };

  const [selectedUnits, setSelectedUnits] = useState(new Set<UnitId>());
  const mapClick = (p: Position) => {
    selectedUnits.forEach(u => {
      moveCommand(p, u);
    });
  };

  return (
    <div className="App">
      <div className="card">
        <button onClick={
          () => {
            channel.emit('chat message', 'a short message sent to the server')
          }}
        >Chat</button>

        <MatchList joinMatch={joinMatch} />

        <button onClick={ () => {
          fetch('http://localhost:9208/create', {
            method: 'POST',
          });
        }}>Create</button>

        <br />
        <span>{lastUpdatePacket ? JSON.stringify(lastUpdatePacket) : ""}</span>

        <ul>
          {lines}
        </ul>
      </div>

      { serverState && 
        <div className="CommandPalette">
          <button onClick={() => moveCommand({x:50, y:50}, 1)}>Move</button>
        </div>
      }

      { serverState &&
        <View3D>
          <Board3D
            board={serverState.board}
            unitStates={lastUpdatePacket ? lastUpdatePacket.units : []}
            selectedUnits={selectedUnits}
            select={setSelectedUnits}
            mapClick={mapClick}
          />
        </View3D>
      }

      { serverState &&
          <Minimap board={serverState.board} units={lastUpdatePacket ? lastUpdatePacket.units : []} />
      }
    </div>
  )
}

export default App
