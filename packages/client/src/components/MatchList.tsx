import { useState, useEffect } from 'react'
import { MatchInfo } from 'server/types'
import { HTTP_API_URL } from '../config'

type Props = {
    joinMatch: (matchId: string) => void;
    spectateMatch: (matchId: string) => void;
}

export function MatchList(props: Props) {
    const [matches, setMatches] = useState([] as MatchInfo[]);

    const refresh = () => {
        fetch(HTTP_API_URL+'/listMatches')
            .then(d => { return d.json() })
            .then(d => setMatches(d));
    };

    useEffect(() => {
        refresh();
        // TODO - only do when open?
        // TODO - move match create button here
        const i = setInterval(refresh, 1000);
        return () => {
            clearInterval(i);
        };
    }, []);

    const matchRows = matches.map(m => {
        const joinable = m.status.id == "Lobby";

        return (<tr key={m.matchId}>
            <td>{m.matchId}</td>
            <td>{m.playerCount}</td>
            <td>{m.status.id}</td>
            <td>
                <button disabled={!joinable} onClick={() => props.joinMatch(m.matchId)}>Join</button>
            </td>
            <td>
                <button onClick={() => props.spectateMatch(m.matchId)}>Spectate</button>
            </td>
        </tr>);
    });

    return (
        <table className="MatchTable">
            <thead>
                <tr>
                    <th>Match id</th>
                    <th>Players</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {matchRows}
            </tbody>
        </table>
    );
}