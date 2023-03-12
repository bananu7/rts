import { useState, useEffect, useCallback } from 'react'
import './App.css'

import { MatchList } from './components/MatchList';

import { MatchController } from './components/MatchController';
import { Multiplayer, MatchControl, SpectatorControl } from './Multiplayer';
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
  const [controller, setController] = useState<MatchControl | SpectatorControl | null>(null);

  useEffect(() => {
    multiplayer.setup({});

    console.log("[App] Bartek RTS starting");
    console.log(`[App] HTTP_API_URL = ${HTTP_API_URL}`);
    fetch(HTTP_API_URL + '/version')
    .then(res => res.text())
    .then(res => console.log("[App] Server version: " + res));
  }, []);

  const joinMatch = async (matchId: string) => {
    const ctrl = await multiplayer.joinMatch(matchId);
    console.log(`[App] Connected to a match ${matchId}`);
    setController(ctrl);
  };

  const spectateMatch = async (matchId: string) => {
    const ctrl = await multiplayer.spectateMatch(matchId);
    console.log(`[App] Spectating match ${matchId}`);
    setController(ctrl);
  };
  
  const matchList = (
    <div className="App" tabIndex={0}>
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
          joinMatch={joinMatch}
          spectateMatch={spectateMatch}
        />
        <div style={{textAlign:"center"}}>
          <button onClick={() => multiplayer.createMatch()}>Create</button>
        </div>
      </div>
    </div>
  );

  const screen = (() => {    
    if (controller instanceof MatchControl) {
      return <MatchController ctrl={controller} />
    } if (controller instanceof SpectatorControl) {
      return <span>You'd be in spectator view right now</span>;
    } else {
      return matchList;
    }
  })();

  return screen;
}

export default App
