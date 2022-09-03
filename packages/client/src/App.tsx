import { useState, useEffect } from 'react'
import './App.css'

import { MatchList } from './MatchList';
import { Minimap } from './Minimap';

import { View3D } from './gfx/View3D';
import { Board3D } from './gfx/Board3D';

import geckos, { Data } from '@geckos.io/client'

import { Game, CommandPacket, IdentificationPacket } from 'server/types'

let channel = geckos({ port: 9208 });
let geckosSetUp = false;

const playerId = 1;

function App() {
  const [msgs, setMsgs] = useState([] as Data[]);
  const [serverState, setServerState] = useState<Game | null>(null);
 
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
        setServerState(() => data as Game);
      })

      channel.on('joined', (data: Data) => {
        console.log("server confirmed match join");
        localStorage.setItem('matchId', String(data));
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
        <span>{serverState ? JSON.stringify(serverState) : ""}</span>

        <ul>
          {lines}
        </ul>
      </div>

      { serverState && 
        <div className="CommandPalette">
          <button onClick={
              () => {
                const cmd : CommandPacket = {
                  action: {
                    typ: 'Move',
                    target: {x: 100, y: 100}
                  },
                  unitId: 1,
                  shift: false,
                };
                channel.emit('command', cmd)
              }}
            >command</button>
        </div>
      }

      { serverState &&
        <View3D>
          <Board3D board={serverState.board} />
        </View3D>
      }

      { serverState &&
          <Minimap board={serverState.board} />
      }
    </div>
  )
}

export default App
