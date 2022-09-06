import geckos, { Data } from '@geckos.io/server'
import http from 'http'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

import {newGame, startGame, tick, command} from './game.js';
import {Game, MatchInfo, IdentificationPacket, CommandPacket, UpdatePacket, PlayerEntry } from './types.js';
import {getMap} from './map.js';

type Match = {
    game: Game,
    matchId: string,
    players: PlayerEntry[],
}

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
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
});

app.get('/getMatchState', (req, res) => {
    const match = matches.find(m => m.matchId === req.query.matchId);
    if (match) {
        res.send(JSON.stringify(match.game));
    }
    else {
        res.sendStatus(404);
    }
});

app.get('/debugGetPath', (req, res) => {
    // TODO: pull the pathfinding path of a given unit
    res.sendStatus(500);
});

let lastMatchId = 0;

app.post('/create', async (req, res) => {
    // TODO - load or w/e
    const map = await getMap('assets/map.png');
    const game = newGame(map);
    const matchId = String(++lastMatchId); // TODO
    matches.push({ game, matchId, players: [] });

    setInterval(() => {
        const updatePacket = tick(100, game);
        // TODO - fog of war
        io.room(matchId).emit('tick', updatePacket);
    }, 100);

    console.log(`Match ${matchId} created`);
})

// register a particular user as a player in a match
app.post('/join', async (req, res) => {
    try {
        const userId = req.body.userId as string;
        const matchId = req.body.matchId;
        console.log(req.body);

        const match = matches.find(m => m.matchId === matchId);
        if (!match) {
            res.status(400);
            res.send("Match doesn't exist");
            console.warn(`Join attempt to a match that doesn't exist (${matchId})`);
            return;
        }

        // TODO - allow more than two players
        if (match.players.length >= 2) {
            res.status(400);
            res.send("This match is full");
            return;
        }

        if (match.game.state.id !== 'Lobby') {
            res.status(400);
            res.send("This match has already started");
            return;
        }

        if (match.players.find(p => p.user === userId)) {
            res.status(400);
            res.send("User is already in this match");
            return;
        }

        // TODO - find a better way to find next free slot
        // it makes sense to not just use array to leave slots open when someone leaves
        // and slot order might matter
        let index = 1;
        for (;index < 10; index++) {
            if (match.players.find(p => p.index === index))
                continue;
        }
        match.players.push({ user: userId, index });

        res.send(JSON.stringify({
            playerIndex: index
        }));
    }
    catch(e) {
        res.sendStatus(500);
        console.error(e);
    }
});

// channel is a new RTC connection (i.e. one browser)
io.onConnection(channel => {
    // first figure out where to join it
    channel.onDisconnect(() => {
        console.log(`${channel.id} got disconnected`)
    })

    channel.on('connect', (data: Data) => {
        // TODO properly validate data format
        const packet = data as IdentificationPacket;
        
        const m = matches.find(m => m.matchId === packet.matchId);
        if (!m) {
            console.warn("Received a connect request to a match that doesn't exist");
            channel.emit('connection failure', packet.matchId, {reliable: true});
            return;
        }

        const playerEntry = m.players.find(p => p.user === packet.userId);
        if (!playerEntry) {
            console.warn(`Received a connect request to a match(${packet.matchId}) that the user(${packet.userId}) hasn't joined`);
            channel.emit('connection failure', packet.matchId, {reliable: true});
            return;
        }

        channel.join(String(packet.matchId));

        channel.userData = {
            playerIndex: playerEntry.index,
            matchId: packet.matchId
        };

        console.log(`Channel of user ${packet.userId} connected to the match ${packet.matchId}`);

        channel.emit('connected', playerEntry.index, {reliable: true});
        channel.emit('chat message', `Successfully connected to the match ${packet.matchId}!`);

        // check if the game can start
        // TODO - wait for all players, not just one
        if (m.players.length >= 1) {
            startGame(m.game);
            io.room(m.matchId).emit('chat message', "Game starting")
        }
    });

    channel.on('command', (data: Data) => {
        try {
            if (!channel.userData.playerIndex) {
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