import { useState, useEffect } from 'react'
import { MatchInfo } from 'server/types'

type Props = {
    joinMatch: (matchId: string) => void;
}

export function MatchList(props: Props) {
    const [matches, setMatches] = useState([] as MatchInfo[]);

    const refresh = () => {
        fetch('http://localhost:9208/listMatches')
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

    const matchRows = matches.map(m => 
        <tr key={m.matchId}>
            <td>{m.matchId}</td>
            <td>{m.playerCount}</td>
            <td>{m.status.id}</td>
            <td><button onClick={() => props.joinMatch(m.matchId)}>Join</button></td>
        </tr>
    );

    return (
        <table>
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