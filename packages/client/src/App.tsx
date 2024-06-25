import { useState, useEffect, useCallback } from 'react'
import './App.css'

import { MatchList } from './components/MatchList';

import { MatchController } from './components/MatchController';
import { SpectateController } from './components/SpectateController';
import { LoginForm } from './components/LoginForm'
import { Multiplayer, MatchControl, SpectatorControl } from './Multiplayer';
import { HTTP_API_URL } from './config';

function useLocalStorage(key: string, defaultValue: string | null): [string | null, (v: string) => void] {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved || defaultValue;
  });

  useEffect(() => {
    if (value)
      localStorage.setItem(key, value);
  }, [key, value]);

  return [value, setValue];
};

function App() {
  const [username, setUsername] = useLocalStorage("userId", null);

  const [multiplayer, setMultiplayer] = useState<Multiplayer | null>(null);
  const [controller, setController] = useState<MatchControl | SpectatorControl | null>(null);

  const cleanupOnLeave = () => {
    console.log(`[App] Leaving match`);
    setController(null);
  };

  useEffect(() => {
    if (!username)
      return;

    let abort = false;

    const setupMultiplayer = async () => {
      console.log("[App] Setup multiplayer start");
      const multiplayer = await Multiplayer.new(username);

      if (abort) {
        console.log("[App] Setup multiplayer aborted");
        return;
      }

      setMultiplayer(multiplayer);
      const rejoinedCtrl = await multiplayer.setup({});

      if (abort) {
        console.log("[App] Setup multiplayer aborted");
        return;
      }
     
      if (rejoinedCtrl) {
        rejoinedCtrl.setOnLeaveMatch(cleanupOnLeave);
        setController(rejoinedCtrl);
      }
      console.log("[App] Setup multiplayer end");
    }

    setupMultiplayer()
    .catch(console.error);

    console.log("[App] Bartek RTS starting");
    console.log(`[App] HTTP_API_URL = ${HTTP_API_URL}`);
    fetch(HTTP_API_URL + '/version')
    .then(res => res.text())
    .then(res => console.log("[App] Server version: " + res));

    return () => {
      if (multiplayer)
        multiplayer.disconnect();
      abort = true;
      setController(null);
    }
  }, []);

  const joinMatch = async (matchId: string) => {
    if (!multiplayer) {
      console.warn("[App] Ignoring joinMatch because multiplayer isn't initialized yet")
      return;
    }

    const ctrl = await multiplayer.joinMatch(matchId);
    console.log(`[App] Connected to a match ${matchId}`);
    ctrl.setOnLeaveMatch(cleanupOnLeave);
    setController(ctrl);
  };

  const spectateMatch = async (matchId: string) => {
    if (!multiplayer) {
      console.warn("[App] Ignoring spectateMatch because multiplayer isn't initialized yet")
      return;
    }

    const ctrl = await multiplayer.spectateMatch(matchId);
    console.log(`[App] Spectating match ${matchId}`);
    ctrl.setOnLeaveMatch(cleanupOnLeave);
    setController(ctrl);
  };

  const createMatch = async () => {
    if (!multiplayer) {
      console.warn("[App] Ignoring createMatch because multiplayer isn't initialized yet")
      return;
    }
    const response = await multiplayer.createMatch();
    return await joinMatch(response.matchId);
  }
  
  const createMatchButton = 
    multiplayer
      ? <button onClick={createMatch}>Create</button>
      : <button disabled={true}>Create</button>;

  const matchList = (
    <div className="App" tabIndex={0}>
      <div className="card">
        <h1>Welcome to (for the lack of a better name) BartekRTS</h1>
        <p>To play, either join an existing match, or create a new one. You will
        need two people to play; the game won't start until two people join. You can
        only join matches in the "lobby" state, you can't join matches that have already started.
        </p>
        <p>The game is designed to be able to be refreshed at any time. If you experience any
        weird behavior or crashes, refreshing the page should help and will reconnect you
        back to your game.</p>
        <p><strong>GLHF, {username}!</strong></p>
        <br />
        <MatchList
          joinMatch={joinMatch}
          spectateMatch={spectateMatch}
        />
        <div style={{textAlign:"center"}}>
          { createMatchButton }
        </div>
      </div>
    </div>
  );

  const screen = (() => {    
    if (!username) {
      return <LoginForm saveName={setUsername} />;
    }

    if (controller instanceof MatchControl) {
      return <MatchController ctrl={controller} />
    } if (controller instanceof SpectatorControl) {
      return <SpectateController ctrl={controller} />
    } else {
      return matchList;
    }
  })();

  return screen;
}

export default App
