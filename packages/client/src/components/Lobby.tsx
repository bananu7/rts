import { MatchMetadata, PlayerMetadata } from '@bananu7-rts/server/src/types'
import './Lobby.css'

function playerMetadataToDisplay(pm: PlayerMetadata | null) {
  if (!pm)
    return "empty slot";
  return `${pm.index}: ${pm.userId}(${pm.color})`;
}

type LobbyProps = {
  matchMetadata: MatchMetadata
}
export function Lobby(props: LobbyProps) {
  const p1meta = props.matchMetadata.players.length > 0 ? props.matchMetadata.players[0] : null;
  const p2meta = props.matchMetadata.players.length > 1 ? props.matchMetadata.players[1] : null;

  const map = props.matchMetadata.board.map;

  return (
    <div className="Lobby">
      <h2>Lobby</h2>
      <span>Match id: {props.matchMetadata.matchId}</span><br/>
      <span>Map size: {map.w}x{map.h}</span>
      <table className="PlayerList">
        <thead>
          <tr>
            <th>Player A</th>
            <th>Player B</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{playerMetadataToDisplay(p1meta)}</td>
            <td>{playerMetadataToDisplay(p2meta)}</td>
          </tr>
        </tbody>
      </table>
      <button>Leave match</button>
    </div>
  );
}
