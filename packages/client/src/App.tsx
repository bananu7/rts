import { useState, useEffect } from 'react'
import './App.css'

import { MatchList } from './MatchList';
import { Minimap } from './Minimap';

import geckos, { Data } from '@geckos.io/client'

import { Game, CommandPacket, IdentificationPacket } from 'server/types'

// or add a minified version to your index.html file
// https://github.com/geckosio/geckos.io/tree/master/bundles

let channel = geckos({ port: 9208 });
let geckosSetUp = false;

function App() {
  const [msgs, setMsgs] = useState([] as Data[]);
  const [serverState, setServerState] = useState<Game | null>(null);
 
  useEffect(() => {
    if (geckosSetUp)
      return;
    geckosSetUp = true;

    console.log("setting onconnect")

    channel.onConnect((error: any) => {
      if (error) {
        console.error(error.message)
        return
      }

      channel.on('chat message', (data: Data) => {
        msgs.push(data);
        setMsgs(msgs);
      })

      channel.on('tick', (data: Data) => {
        setServerState(() => data as Game);
      })

      channel.emit('chat message', 'a short message sent to the server')
    })
  }, []);

  const lines = msgs.map((m: Data, i: number) => <li key={i}>{String(m)}</li>);

  return (
    <div className="App">
      <h1>RTS</h1>
      <div className="card">

        <button onClick={
          () => {
            channel.emit('chat message', 'a short message sent to the server')
          }}
        >Chat</button>

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

        <MatchList />

        <button onClick={ () => {
          const data : IdentificationPacket = {
            playerId: 1,
            matchId: '1'
          };

          channel.emit('join', data);
        }}>Join</button>

        <button onClick={ () => {
          fetch('http://localhost:9208/create', {
            method: 'POST',
          });
        }}>Create</button>

        <span>{serverState ? JSON.stringify(serverState) : ""}</span>

        <ul>
          {lines}
        </ul>
      </div>

      { serverState &&
          <Minimap board={serverState.board} />
      }
    </div>
  )
}

export default App
