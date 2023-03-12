import geckos, { Data, ClientChannel } from '@geckos.io/client'
import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from 'server/src/types'
import { HTTP_API_URL, GECKOS_URL, GECKOS_PORT } from './config'

export type OnChatMessage = (msg: string) => void;
export type OnUpdatePacket = (p: UpdatePacket) => void;
export type OnMatchConnected = (matchId: string) => void;

export type MultiplayerConfig = {
    onChatMessage?: OnChatMessage,
}

export class Multiplayer {
    channel: ClientChannel;
    geckosSetUp: boolean;
    userId: string;

    onChatMessage?: OnChatMessage;

    constructor(userId: string) {
        console.log("[Multiplayer] First-time init");
        console.log(`[Multiplayer] GECKOS_URL = ${GECKOS_URL}`);
        console.log(`[Multiplayer] GECKOS_PORT = ${GECKOS_PORT}`);

        this.channel = geckos({
          url: GECKOS_URL,
          port: GECKOS_PORT
        });
        this.geckosSetUp = false;

        this.userId = userId;
    }

    // TODO: Spectator rejoin
    async setup(config: MultiplayerConfig): Promise<MatchControl | undefined>{
        if (this.geckosSetUp)
            return;
        this.geckosSetUp = true;

        this.onChatMessage = config.onChatMessage;

        return new Promise(resolve => {
            this.channel.onConnect((error: any) => {
                if (error) {
                    console.error(error.message)
                    return
                }

                console.log('[Multiplayer] Channel set up correctly')

                // set up handlers
                this.channel.on('chat message', (data: Data) => {
                    this.onChatMessage && this.onChatMessage(data as string);
                })

                this.channel.on('connection failure', (data: Data) => {
                    console.log("[Multiplayer] server refused join or rejoin, clearing match association");
                    localStorage.removeItem('matchId');
                });

                resolve(this.reconnect());
            });
        });
    }

    protected async reconnect(): Promise<MatchControl | undefined> {
        const matchId = localStorage.getItem('matchId') || undefined;
        if (!matchId) {
            console.log(`[Multiplayer] No stored matchId found for reconnect.`)
            return undefined;
        }

        console.log(`[Multiplayer] Reconnecting to match ${matchId}`)
        this.channel.emit('connect', { matchId: matchId, userId: this.userId }, { reliable: true });
    
        return new Promise((resolve) => {
            this.channel.on('connected', (data: Data) => {
                console.log("[Multiplayer] RTC connected to match")
                const playerIndex = data as number;
                console.log(`[Multiplayer] Client is player ${playerIndex}`)

                resolve(new MatchControl(this.userId, this.channel, matchId, playerIndex));
            });
        });
    }

    // TODO - make this async, make backend return id
    createMatch() {
        fetch(HTTP_API_URL+'/create', {
            method: 'POST',
        });
    }

    async joinMatch(matchId: string): Promise<MatchControl> {
        console.log(`[Multiplayer] joining match ${matchId}`)
        const joinData = {
            matchId,
            userId: this.userId
        };

        const res = await fetch(HTTP_API_URL+'/join', {
            method: 'POST',
            body: JSON.stringify(joinData),
            headers: {
                'Content-Type': 'application/json'
            },
        });

        // connect RTC automatically after joining
        if (res.status !== 200) {
            throw new Error("Match join failed")
        }

        const resj = await res.json();
        console.log(`[Multiplayer] server confirmed match join`);

        localStorage.setItem('matchId', matchId);

        const data : IdentificationPacket = {
            userId: this.userId,
            matchId
        };

        this.channel.emit('connect', data);

        return new Promise((resolve) => {
            this.channel.on('connected', (data: Data) => {
                console.log("[Multiplayer] RTC connected to match")
                const playerIndex = data as number;
                console.log(`[Multiplayer] Client is player ${playerIndex}`)

                resolve(new MatchControl(this.userId, this.channel, matchId, resj.playerIndex));
            });
        });
    }


    spectateMatch(matchId: string): Promise<SpectatorControl> {
        console.log(`[Multiplayer] spectating match ${matchId}`)
        const data : IdentificationPacket = {
            userId: this.userId,
            matchId
        };

        this.channel.emit('spectate', data);

        return new Promise ((resolve) => {
            this.channel.on('spectating', (data: Data) => {
                matchId = (data as {matchId: string}).matchId;
                localStorage.setItem('matchId', matchId);

                resolve(new SpectatorControl(matchId));
            });
        });
    }
}

export class MatchControl {
    // this gets set to null if a leave connection is issued
    userId: string;
    channel?: ClientChannel;
    matchId: string;
    playerIndex: number;
    constructor(userId: string, channel: ClientChannel, matchId: string, playerIndex: number) {
        this.userId = userId;
        this.channel = channel;
        this.matchId = matchId;
        this.playerIndex = playerIndex;
    }

    protected _getChannel(): ClientChannel {
        if (!this.channel)
            throw new Error("Trying to use a channel that's been closed");
        return this.channel;
    }

    setOnUpdatePacket(handler: (p: UpdatePacket) => void) {
        this._getChannel().on('tick', (data: Data) => {
            const u = data as UpdatePacket;
            handler(u);
        })
    }

    async getMatchState() {
        console.log("[multiplayer] Getting match state");
        return fetch(`${HTTP_API_URL}/getMatchState?` + new URLSearchParams({ matchId: this.matchId })).then(r => r.json());
    }

    async leaveMatch() {
        if (!this.matchId)
            return;

        const body = JSON.stringify({
            matchId: this.matchId,
            userId: this.userId,
        });

        return fetch(HTTP_API_URL+'/leave', {
            method: 'POST',
            body,
            headers: {
                'Content-Type': 'application/json'
            },
        })
        .then(res => {
            this.channel = undefined;
            localStorage.removeItem('matchId');
        });
    }

    getPlayerIndex() {
        return this.playerIndex;
    }

    sendChatMessage(msg: string) {
        this._getChannel().emit('chat message', 'msg')
    }

    moveCommand(unitIds: UnitId[], target: Position, shift: boolean) {
        const cmd : CommandPacket = {
            action: {
                typ: 'Move',
                target
            },
            unitIds,
            shift,
        };
        this._getChannel().emit('command', cmd)
    }

    stopCommand(unitIds: UnitId[]) {
        const cmd : CommandPacket = {
            action: {
                typ: 'Stop',
            },
            unitIds,
            shift: false,
        };
        this._getChannel().emit('command', cmd)
    }

    followCommand(unitIds: UnitId[], target: UnitId, shift: boolean) {
        const cmd : CommandPacket = {
            action: {
                typ: 'Follow',
                target
            },
            unitIds,
            shift,
        };
        this._getChannel().emit('command', cmd);
    }

    attackCommand(unitIds: UnitId[], target: UnitId, shift: boolean) {
        const cmd : CommandPacket = {
            action: {
            typ: 'Attack',
            target
        },
            unitIds,
            shift,
        };
        this._getChannel().emit('command', cmd);
    }

    attackMoveCommand(unitIds: UnitId[], target: Position, shift: boolean) {
        const cmd : CommandPacket = {
            action: {
            typ: 'AttackMove',
            target
        },
            unitIds,
            shift,
        };
        this._getChannel().emit('command', cmd);
    }

    produceCommand(unitIds: UnitId[], unitToProduce: string) {
        const cmd : CommandPacket = {
            action: {
            typ: 'Produce',
            unitToProduce
        },
            unitIds,
            shift: false,
        };
        this._getChannel().emit('command', cmd);
    }

    buildCommand(unitIds: UnitId[], building: string, position: Position, shift: boolean) {
        const cmd : CommandPacket = {
            action: {
            typ: 'Build',
            building,
            position
        },
            unitIds,
            shift,
        };
        this._getChannel().emit('command', cmd);
    }

    harvestCommand(unitIds: UnitId[], target: UnitId, shift: boolean) {
        const cmd : CommandPacket = {
            action: {
            typ: 'Harvest',
            target,
        },
            unitIds,
            shift,
        };
        this._getChannel().emit('command', cmd);
    }
}

export class SpectatorControl {
    matchId: string;

    constructor(matchId: string) {
        this.matchId = matchId;
    }

    getMatchId() {
        return this.matchId;
    }

    async stopSpectating() {

    }
}
