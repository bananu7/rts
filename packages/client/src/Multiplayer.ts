import geckos, { Data, ClientChannel } from '@geckos.io/client'
import { Game, CommandPacket, IdentificationPacket, UpdatePacket, UnitId, Position } from 'server/types'

export type OnChatMessage = (msg: string) => void;
export type OnUpdatePacket = (p: UpdatePacket) => void;
export type OnMatchJoin = (matchId: string) => void;

export type MultiplayerConfig = {
    onChatMessage?: OnChatMessage,
    onUpdatePacket: OnUpdatePacket,
    onMatchJoin: OnMatchJoin,
}

export class Multiplayer {
    channel: ClientChannel;
    geckosSetUp: boolean;
    playerId: number;

    onChatMessage?: OnChatMessage;
    onUpdatePacket?: OnUpdatePacket;
    onMatchJoin?: OnMatchJoin;

    constructor() {
        this.channel = geckos({ port: 9208 });
        this.geckosSetUp = false;

        this.playerId = 1;
    }

    setup(config: MultiplayerConfig) {
        if (this.geckosSetUp)
            return;
        this.geckosSetUp = true;

        this.onChatMessage = config.onChatMessage;
        this.onUpdatePacket = config.onUpdatePacket;
        this.onMatchJoin = config.onMatchJoin;

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

            this.channel.on('joined', (data: Data) => {
                const matchId = String(data);
                console.log(`[Multiplayer] server confirmed match join to match ${matchId}`);
                localStorage.setItem('matchId', matchId);
                this.onMatchJoin && this.onMatchJoin(matchId);
            });

            this.channel.on('join failure', (data: Data) => {
                console.log("[Multiplayer] server refused join or rejoin, clearing match association");
                localStorage.removeItem('matchId');
            });

            this.rejoin();
        });
    }

    rejoin() {
        const matchId = localStorage.getItem('matchId');
        if (matchId) {
            console.log(`[Multiplayer] Rejoining match ${matchId}`)
            this.channel.emit('rejoin', { matchId, playerId: this.playerId });
        }
    }

    // TODO - make this async, make backend return id
    createMatch() {
        fetch('http://localhost:9208/create', {
            method: 'POST',
        });
    }

    joinMatch(matchId: string) {
        const data : IdentificationPacket = {
            playerId: this.playerId,
            matchId
        };

        console.log(this)
        this.channel.emit('join', data);
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
