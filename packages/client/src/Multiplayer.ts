import geckos, { Data, ClientChannel } from '@geckos.io/client'
import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from 'server/types'
import { HTTP_API_URL, GECKOS_URL, GECKOS_PORT } from './config'

export type OnChatMessage = (msg: string) => void;
export type OnUpdatePacket = (p: UpdatePacket) => void;
export type OnMatchConnected = (matchId: string) => void;

export type MultiplayerConfig = {
    onChatMessage?: OnChatMessage,
    onUpdatePacket: OnUpdatePacket,
    onMatchConnected: OnMatchConnected,
}

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
        this.channel = geckos({
          url: GECKOS_URL,
          port: GECKOS_PORT
        });
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
            this.channel.emit('connect', { matchId: this.matchId, userId: this.userId }, { reliable: true });
        }
    }

    // TODO - make this async, make backend return id
    createMatch() {
        fetch(HTTP_API_URL+'/create', {
            method: 'POST',
        });
    }

    async joinMatch(matchId: string) {
        console.log(`[Multiplayer] joining match ${matchId}`)
        const joinData = {
            matchId,
            userId: this.userId
        };

        return fetch(HTTP_API_URL+'/join', {
            method: 'POST',
            body: JSON.stringify(joinData),
            headers: {
                'Content-Type': 'application/json'
            },
        })
        // connect RTC automatically after joining
        .then(res => {
            if (res.status === 200) {
                return res.json();
            }
            else {
                throw new Error("Match join failed")
            }
        })
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
        });
    };
    
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
            this.matchId = undefined;
            localStorage.removeItem('matchId');
        });
    }

    // TODO - pull those out to a separate MatchControl object
    sendChatMessage(msg: string) {
        this.channel.emit('chat message', 'msg')
    }

    moveCommand(unitIds: UnitId[], target: Position) {
        const cmd : CommandPacket = {
            action: {
                typ: 'Move',
                target
            },
            unitIds,
            shift: false,
        };
        this.channel.emit('command', cmd)
    };

    followCommand(unitIds: UnitId[], target: UnitId) {
        const cmd : CommandPacket = {
            action: {
                typ: 'Follow',
                target
            },
            unitIds,
            shift: false,
        };
        this.channel.emit('command', cmd);
    };

    attackCommand(unitIds: UnitId[], target: UnitId) {
        const cmd : CommandPacket = {
            action: {
            typ: 'Attack',
            target
        },
            unitIds,
            shift: false,
        };
        this.channel.emit('command', cmd);
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
        this.channel.emit('command', cmd);
    }
}
