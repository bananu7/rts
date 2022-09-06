import geckos, { Data, ClientChannel } from '@geckos.io/client'
import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from 'server/types'

export type OnChatMessage = (msg: string) => void;
export type OnUpdatePacket = (p: UpdatePacket) => void;
export type OnMatchConnected = (matchId: string) => void;

export type MultiplayerConfig = {
    onChatMessage?: OnChatMessage,
    onUpdatePacket: OnUpdatePacket,
    onMatchConnected: OnMatchConnected,
}

const FETCH_URL = `http://${window.location.hostname}:9208`;

export class Multiplayer {
    channel: ClientChannel;
    geckosSetUp: boolean;
    userId: string;

    matchId?: string;
    playerIndex?: number;

    onChatMessage?: OnChatMessage;
    onUpdatePacket?: OnUpdatePacket;
    onMatchConnected?: OnMatchConnected;

    constructor(userId: string) {
        this.channel = geckos({ port: 9208 });
        this.geckosSetUp = false;

        this.userId = userId;
    }

    setup(config: MultiplayerConfig) {
        if (this.geckosSetUp)
            return;
        this.geckosSetUp = true;

        this.onChatMessage = config.onChatMessage;
        this.onUpdatePacket = config.onUpdatePacket;
        this.onMatchConnected = config.onMatchConnected;

        this.matchId = localStorage.getItem('matchId') || undefined;

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

            this.channel.on('tick', (data: Data) => {
                const u = data as UpdatePacket;
                // TODO - detect dying units for visualisation purposes
                this.onUpdatePacket && this.onUpdatePacket(u);
            })

            this.channel.on('connected', (data: Data) => {
                if (!this.matchId) {
                    throw "Server responded with connection but the multiplayer isn't initialized to a match";
                }
                console.log("[Multiplayer] RTC connected to match")
                this.onMatchConnected && this.onMatchConnected(this.matchId);
            });

            this.channel.on('connection failure', (data: Data) => {
                console.log("[Multiplayer] server refused join or rejoin, clearing match association");
                localStorage.removeItem('matchId');
            });

            this.reconnect();
        });
    }

    protected reconnect() {
        if (this.matchId) {
            console.log(`[Multiplayer] Reconnecting to match ${this.matchId}`)
            this.channel.emit('connect', { matchId: this.matchId, userId: this.userId });
        }
    }

    // TODO - make this async, make backend return id
    createMatch() {
        fetch(FETCH_URL+'/create', {
            method: 'POST',
        });
    }

    joinMatch(matchId: string) {
        console.log(`[Multiplayer] joining match ${matchId}`)
        const joinData = {
            matchId,
            userId: this.userId
        };

        fetch(FETCH_URL+'/join', {
            method: 'POST',
            body: JSON.stringify(joinData),
            headers: {
                'Content-Type': 'application/json'
            },
        })
        // connect RTC automatically after joining
        .then(res => res.json())
        .then(res => {
            this.playerIndex = res.playerIndex;
            console.log(`[Multiplayer] server confirmed match join`);

            this.matchId = matchId;
            localStorage.setItem('matchId', this.matchId);

            const data : IdentificationPacket = {
                userId: this.userId,
                matchId
            };

            this.channel.emit('connect', data);
        })
    };

    sendChatMessage(msg: string) {
        this.channel.emit('chat message', 'msg')
    }

    moveCommand(target: Position, unitId: UnitId) {
        const cmd : CommandPacket = {
            action: {
                typ: 'Move',
                target
            },
            unitId: unitId,
            shift: false,
        };
        this.channel.emit('command', cmd)
    };

    followCommand(unitId: UnitId, target: UnitId) {
        const cmd : CommandPacket = {
            action: {
                typ: 'Follow',
                target
            },
            unitId,
            shift: false,
        };
        this.channel.emit('command', cmd)
    };

    attackCommand(unitId: UnitId, target: UnitId) {
        const cmd : CommandPacket = {
            action: {
            typ: 'Attack',
            target
        },
            unitId,
            shift: false,
        };
        this.channel.emit('command', cmd)
    }
}
