import { useState, useEffect, useCallback } from 'react'

import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from 'server/types'
import { Multiplayer } from './Multiplayer';
const multiplayer = new Multiplayer("bananu7");

export function DebugApp() {
    const [lastUpdatePacket, setLastUpdatePacket] = useState<UpdatePacket | null>(null);
    return (
        <div className="debug">
          <h2>Debug view</h2>
          <span>{lastUpdatePacket ? JSON.stringify(lastUpdatePacket) : ""}</span>
        </div>
    );
}