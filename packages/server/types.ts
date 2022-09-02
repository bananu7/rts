import {Game } from './game.js';

export type MatchInfo = {
    matchId: string,
    playerCount: number
}

export type IdentificationPacket = {
    playerId: number,
    matchId: string, 
}
