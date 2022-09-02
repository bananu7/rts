import geckos, { Data } from '@geckos.io/server'
import http from 'http'
import express from 'express'
import cors from 'cors'

import {newGame, startGame, tick, command} from './game.js';
import {Game, MatchInfo, IdentificationPacket, CommandPacket} from './types.js';

type Match = {
    game: Game,
    matchId: string,
    players: number[],
}

const app = express()
app.use(cors())
const server = http.createServer(app)
const io = geckos()

const matches : Match[] = [];

io.addServer(server)

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/listMatches', (req, res) => {
    const matchInfos : MatchInfo[] = matches.map(m => { return {
        matchId: m.matchId,
        playerCount: m.players.length,
    }});

    res.send(JSON.stringify(matchInfos));
})

let lastMatchId = 0;

app.post('/create', (req, res) => {
    // TODO - load or w/e
    const map = { w: 10, h: 10, tiles: [1,2,3] };

    const game = newGame(map);
    const matchId = String(++lastMatchId); // TODO
    matches.push({ game, matchId, players: [] });

    setInterval(() => {
        tick(100, game)
        // TODO - fog of war
        io.room(matchId).emit('tick', game);
    }, 100);

    console.log(`Match ${matchId} created`);
})

// channel is a new RTC connection (i.e. one browser)
io.onConnection(channel => {
    // first figure out where to join it
    channel.onDisconnect(() => {
        console.log(`${channel.id} got disconnected`)
    })

    channel.on('join', (data: Data) => {
        // TODO properly validate data format
        const packet = data as IdentificationPacket;

        const m = matches.find(m => m.matchId === packet.matchId);
        if (!m) {
            console.error("Received a join request to a match that doesn't exist");
            return;
        }

        m.players.push(packet.playerId);

        channel.join(String(packet.matchId));

        channel.userData = {
            playerId: packet.playerId,
            matchId: packet.matchId
        };

        console.log(`Channel of player ${packet.playerId} joined the match ${packet.matchId}`);

        channel.emit('joined', packet.matchId);
        channel.emit('chat message', `Successfully joined the match ${packet.matchId}!`);

        // check if the game can start
        // TODO - wait for all players, not just two
        if (m.players.length === 2) {
            startGame(m.game);
            io.room(m.matchId).emit('chat message', "Game starting")
        }
    });

    channel.on('rejoin', (data: Data) => {
        try {
            const packet = data as IdentificationPacket;
            packet.matchId = String(packet.matchId);

            const m = matches.find(m => m.matchId === packet.matchId);
            if (!m) {
                throw "Received a rejoin request to a match that doesn't exist";
            }

            if (!m.players.find(p => p === packet.playerId)) {
                throw "Received a rejoin request but player isn't in this match";
            }

            channel.join(packet.matchId);

            channel.userData = {
                playerId: packet.playerId,
                matchId: packet.matchId
            };
            console.log(`Channel of player ${packet.playerId} rejoined the match ${packet.matchId}`);
        }
        catch (e) {
            console.error(e);
        }
    });

    channel.on('command', (data: Data) => {
        try {
            if (!channel.userData.playerId) {
                throw "Received a command from an unidentified channel";
            }

            if (!channel.userData.matchId) {
                throw "Received a command from a channel that's not in a match";
            }

            let m = matches.find(m => m.matchId === channel.userData.matchId)
            if (!m) {
                throw "Match associated with this channel doesn't exist";
            }

            // TODO - validate
            command(data as CommandPacket, m.game);
        }
        catch(e) {
            console.error(e);
            console.error('userdata:', channel.userData)
        }
    });

    channel.on('chat message', (data: Data) => {
        console.log(`got ${data} from "chat message"`)
        // emit the "chat message" data to all channels in the same room
        io.room(channel.roomId).emit('chat message', data)
    })
})

server.listen(9208)