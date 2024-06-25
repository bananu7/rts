import geckos, { Data, ClientChannel } from '@geckos.io/client'
import { Game, MatchMetadata, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position, MatchCreateResponse, MatchJoinResponse } from '@bananu7-rts/server/src/types'
import { HTTP_API_URL, GECKOS_URL } from './config'

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

    private constructor(channel: ClientChannel, userId: string) {
        console.log("[Multiplayer] First-time init");
        console.log(`[Multiplayer] GECKOS_URL = ${GECKOS_URL}`);

        this.channel = channel;
        this.userId = userId;
        this.geckosSetUp = false;
    }

    static async new(userId: string): Promise<Multiplayer> {
        console.log('[Multiplayer] Getting server public address for WebRTC connection');
        const iceResponse = await fetch(HTTP_API_URL + '/iceServers');
        const iceServers = await iceResponse.json();

        console.log("[Multiplayer] Received the iceServers configuration from server:")
        console.dir(iceServers, {colors: true});

        const channel = geckos({
            url: GECKOS_URL,
            port: null as unknown as undefined, // see https://github.com/geckosio/geckos.io#new-in-version-171
            iceServers
        });

        return new Multiplayer(channel, userId);
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
        const matchMetadata = await Multiplayer._fetchMatchMetadata(matchId);

        return new Promise((resolve) => {
            this._onConnected = (data: Data) => {
                console.log("[Multiplayer] RTC connected to match")
                const playerIndex = data as number;
                console.log(`[Multiplayer] Client is player ${playerIndex}`)

                resolve(new MatchControl(this.userId, this.channel, playerIndex, matchMetadata));
            };
            this.channel.emit('connect', { matchId: matchId, userId: this.userId }, { reliable: true });
        });
    }

    public disconnect() {
        console.log(`[Multiplayer] disconnecting channel`)
        this.channel.close();
    }

    async createMatch(): Promise<MatchCreateResponse> {
        const response = await fetch(HTTP_API_URL+'/create', {
            method: 'POST',
        });

        if (response.status !== 200)
            throw new Error("Create match failed");

        const resj = await response.json();
        console.log(`[Multiplayer] server confirmed match create, matchId: ${resj.matchId}`);

        return resj.matchId;
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

        const resj = await res.json() as MatchJoinResponse;
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

                resolve(new MatchControl(this.userId, this.channel, resj.playerIndex, resj.matchMetadata));
            };
            this.channel.emit('connect', data);
        });
    }


    async spectateMatch(matchId: string): Promise<SpectatorControl> {
        console.log(`[Multiplayer] spectating match ${matchId}`)
        const matchMetadata = await Multiplayer._fetchMatchMetadata(matchId);

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

                resolve(new SpectatorControl(matchMetadata, this.channel));
            };
            this.channel.emit('spectate', data);
        });
    }

    private static async _fetchMatchMetadata(matchId: string): Promise<MatchMetadata> {
        const getMMres = await fetch(`${HTTP_API_URL}/getMatchMetadata?` + new URLSearchParams({ matchId }));
        if (getMMres.status !== 200)
            throw new Error(`Couldn't get match metadata for match ${matchId}`);
        const matchMetadata = await getMMres.json();
        return matchMetadata;
    }
}

class AbstractControl {
    protected matchMetadata: MatchMetadata;
    protected channel?: ClientChannel;
    protected leaveMatchHandler?: () => void;

    protected constructor(channel: ClientChannel, matchMetadata: MatchMetadata) {
        this.channel = channel;
        this.matchMetadata = matchMetadata;
    }

    async debugGetMatchState() {
        console.log("[multiplayer] Getting debug match state");
        return fetch(`${HTTP_API_URL}/debugGetMatchState?` + new URLSearchParams({ matchId: this.matchMetadata.matchId })).then(r => r.json());
    }

    protected _getChannel(): ClientChannel {
        if (!this.channel)
            throw new Error("Trying to use a channel that's been closed");
        return this.channel;
    }

    public getMatchMetadata(): MatchMetadata {
        return this.matchMetadata;
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

    constructor(userId: string, channel: ClientChannel, playerIndex: number, matchMetadata: MatchMetadata) {
        super(channel, matchMetadata);
        this.userId = userId;
        this.playerIndex = playerIndex;
    }

    async leaveMatch() {
        const body = JSON.stringify({
            matchId: this.matchMetadata.matchId,
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
            command: {
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
            command: {
                typ: 'Stop',
            },
            unitIds,
            shift: false,
        };
        this._getChannel().emit('command', cmd)
    }

    followCommand(unitIds: UnitId[], target: UnitId, shift: boolean) {
        const cmd : CommandPacket = {
            command: {
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
            command: {
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
            command: {
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
            command: {
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
            command: {
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
            command: {
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
    constructor(matchMetadata: MatchMetadata, channel: ClientChannel) {
        super(channel, matchMetadata);
    }

    getMatchId() {
        return this.matchMetadata.matchId;
    }

    async stopSpectating() {
        if (this.leaveMatchHandler)
            this.leaveMatchHandler();
    }
}
