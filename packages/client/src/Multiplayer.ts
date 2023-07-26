import geckos, { Data, ClientChannel } from '@geckos.io/client'
import { Game, MatchMetadata, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from '@bananu7-rts/server/src/types'
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

    _onConnected?: (data: Data) => void;
    _onSpectating?: (data: Data) => void;

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

        console.log('[Multiplayer] Setting up for for the first time')
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

                // TODO ? - Bind to events via proxy because geckos doesn't rebind
                this.channel.on('spectating', (data: Data) => {
                    if (this._onSpectating)
                        this._onSpectating(data);
                });

                // TODO change strings to enums because i just made a typo here
                this.channel.on('connected', (data: Data) => {
                    if (this._onConnected)
                        this._onConnected(data);
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

        return new Promise((resolve) => {
            this._onConnected = (data: Data) => {
                console.log("[Multiplayer] RTC connected to match")
                const playerIndex = data as number;
                console.log(`[Multiplayer] Client is player ${playerIndex}`)

                resolve(new MatchControl(this.userId, this.channel, matchId, playerIndex));
            };
            this.channel.emit('connect', { matchId: matchId, userId: this.userId }, { reliable: true });
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

        return new Promise((resolve) => {
            this._onConnected = (data: Data) => {
                console.log("[Multiplayer] RTC connected to match")
                const playerIndex = data as number;
                console.log(`[Multiplayer] Client is player ${playerIndex}`)

                resolve(new MatchControl(this.userId, this.channel, matchId, resj.playerIndex));
            };
            this.channel.emit('connect', data);
        });
    }


    spectateMatch(matchId: string): Promise<SpectatorControl> {
        console.log(`[Multiplayer] spectating match ${matchId}`)
        const data : IdentificationPacket = {
            userId: this.userId,
            matchId
        };

        return new Promise ((resolve) => {
            this._onSpectating = (data: Data) => {
                console.log("[Multiplayer] Received spectate confirmation from server");
                matchId = (data as {matchId: string}).matchId;
                localStorage.setItem('matchId', matchId);
                localStorage.setItem('spectate', 'true');

                resolve(new SpectatorControl(matchId, this.channel));
            };
            this.channel.emit('spectate', data);
        });
    }
}

class AbstractControl {
    protected matchId: string;
    protected channel?: ClientChannel;
    protected leaveMatchHandler?: () => void;

    async debugGetMatchState() {
        console.log("[multiplayer] Getting debug match state");
        return fetch(`${HTTP_API_URL}/debugGetMatchState?` + new URLSearchParams({ matchId: this.matchId })).then(r => r.json());
    }

    async getMatchMetadata(): Promise<MatchMetadata> {
        console.log("[multiplayer] Getting match metadata");
        // TODO - API urls should be in shared constants
        return fetch(`${HTTP_API_URL}/getMatchMetadata?` + new URLSearchParams({ matchId: this.matchId })).then(r => r.json());
    }

    protected _getChannel(): ClientChannel {
        if (!this.channel)
            throw new Error("Trying to use a channel that's been closed");
        return this.channel;
    }

    protected constructor(channel: ClientChannel, matchId: string) {
        this.channel = channel;
        this.matchId = matchId;
    }

    setOnLeaveMatch(handler: () => void) {
        this.leaveMatchHandler = handler;
    }

    setOnUpdatePacket(handler: (p: UpdatePacket) => void) {
        this._getChannel().on('tick', (data: Data) => {
            const u = data as UpdatePacket;
            handler(u);
        })
    } 
}

export class MatchControl extends AbstractControl {
    // this gets set to null if a leave connection is issued
    userId: string;
    playerIndex: number;

    constructor(userId: string, channel: ClientChannel, matchId: string, playerIndex: number) {
        super(channel, matchId);
        this.userId = userId;
        this.playerIndex = playerIndex;
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
            if (this.leaveMatchHandler)
                this.leaveMatchHandler();
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

export class SpectatorControl extends AbstractControl {
    constructor(matchId: string, channel: ClientChannel) {
        super(channel, matchId);
        this.matchId = matchId;
    }

    getMatchId() {
        return this.matchId;
    }

    async stopSpectating() {
        if (this.leaveMatchHandler)
            this.leaveMatchHandler();
    }
}
