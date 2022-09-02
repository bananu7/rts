import { useState, useEffect } from 'react'
import './App.css'

import { MatchList } from './MatchList';

import geckos, { Data } from '@geckos.io/client'

// or add a minified version to your index.html file
// https://github.com/geckosio/geckos.io/tree/master/bundles

let channel = geckos({ port: 9208 });
let geckosSetUp = false;

function App() {
  const [msgs, setMsgs] = useState([] as Data[]);
  const [serverState, setServerState] = useState("");
 
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
        setServerState(JSON.stringify(data));
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

        <MatchList />

        <button onClick={ () => {
          const data = {
            playerId: 0,
            matchId: 1
          };

          channel.emit('join', data);
        }}>join</button>

        <button onClick={ () => {
          fetch('http://localhost:9208/create', {
            method: 'POST',
          });
        }}>create</button>

        <pre>{serverState}</pre>

        <ul>
          {lines}
        </ul>
      </div>
    </div>
  )
}

export default App
