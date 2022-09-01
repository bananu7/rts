import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'

import geckos, { Data } from '@geckos.io/client'

// or add a minified version to your index.html file
// https://github.com/geckosio/geckos.io/tree/master/bundles

let channel = geckos({ port: 9208 });
let geckosSetUp = false;

function App() {
  const [count, setCount] = useState(0)
  const [msgs, setMsgs] = useState([] as Data[]);

 
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

      channel.emit('chat message', 'a short message sent to the server')
    })
  }, []);

  const lines = msgs.map((m: Data, i: number) => <li key={i}>{String(m)}</li>);

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={
          () => {
            setCount((count) => count + 1)
            channel.emit('chat message', 'a short message sent to the server')
          }}
        >
          count is {count}
        </button>
        <ul>
          {lines}
        </ul>
      </div>
    </div>
  )
}

export default App
