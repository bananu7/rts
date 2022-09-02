import { useState, useEffect } from 'react'
import { MatchInfo } from 'server/types'

export function MatchList() {
    const [matches, setMatches] = useState([] as MatchInfo[]);

    useEffect(() => {
        fetch('http://localhost:9208/listMatches')
            .then(d => { return d.json() })
            .then(d => setMatches(d));
    }, []);

    const matchRows = matches.map(m => 
        <tr key={m.matchId}>
            <td>{m.matchId}</td>
            <td>{m.playerCount}</td>
        </tr>
    );

    return (
        <table>
            <thead>
                <tr>
                    <th>Match id</th>
                    <th>Players</th>
                </tr>
            </thead>
            <tbody>
                {matchRows}
            </tbody>
        </table>
    );
}