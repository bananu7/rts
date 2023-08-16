import geckos, { Data, ServerChannel } from '@geckos.io/server'
import http from 'http'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

import {newGame, startGame, tick, command} from './game.js';
import {Game, MatchInfo, IdentificationPacket, CommandPacket, UpdatePacket, UserId, MatchId, MatchMetadata } from './types.js';
import {getMap} from './map.js';
import {readFileSync} from 'fs';
import { getVersion, getConfig, printConfig } from './config.js'

const version = getVersion();
console.log(`[index] Starting RTS server - ${version}`);

const config = getConfig();
printConfig(config);

type PlayerEntry = {
    index: number,
    user: UserId,
    channel?: ServerChannel,
    color: number,
}

type SpectatorEntry = {
    user: UserId,
    channel: ServerChannel,
}

type Match = {
    game: Game,
    matchId: MatchId,
    players: PlayerEntry[],
    spectators: SpectatorEntry[],
}

function getMatchMetadata(m: Match): MatchMetadata {
    return {
        matchId: m.matchId,
        board: m.game.board,
        players: m.players.map(p => ({
            index: p.index,
            userId: p.user,
            color: p.color
        })),
    };
}

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
const server = http.createServer(app)

const io = geckos({
  iceServers: config.iceServers
})

const matches : Match[] = [];

io.addServer(server)

app.get('/listMatches', (req, res) => {
    const matchInfos : MatchInfo[] = matches.map(m => { return {
        matchId: m.matchId,
        playerCount: m.players.length,
        status: m.game.state,
    }});

    res.send(JSON.stringify(matchInfos));
});

app.get('/version', (req, res) => {
    res.send(version);
});

app.get('/iceServers', (req, res) => {
    res.send(JSON.stringify(config.clientIceServers));
});

app.get('/getMatchMetadata', (req, res) => {
    const match = matches.find(m => m.matchId === req.query.matchId);
    if (match) {
        res.send(JSON.stringify(getMatchMetadata(match)));
    }
    else {
        res.sendStatus(404);
    }
});

// TODO debug apis should require a secret
app.get('/debugGetPath', (req, res) => {
    // TODO: pull the pathfinding path of a given unit
    res.sendStatus(500);
});

app.get('/debugGetMatchState', (req, res) => {
    const match = matches.find(m => m.matchId === req.query.matchId);
    if (match) {
        res.send(JSON.stringify(match.game));
    }
    else {
        res.sendStatus(404);
    }
});

let lastMatchId = 0;

app.post('/create', async (req, res) => {
    // TODO - load or w/e
    const map = await getMap('assets/map.png');
    const matchId = String(++lastMatchId); // TODO
    const game = newGame(matchId, map);
    matches.push({ game, matchId, players: [], spectators: [] });

    setInterval(() => {
        const updatePackets = tick(config.tickMs, game);
        const match = matches.find(m => m.matchId === matchId);

        if (!match)
            throw new Error("[index] Match scheduled for update doesn't exist");

        match.players.forEach((p, i) => {
            // TODO: handle players without channels better?
            if (!p.channel)
                return;

            p.channel.emit('tick', updatePackets[i]);
        });

        match.spectators.forEach((s, i) =>
            // TODO spectators should get a separate packet
            s.channel.emit('tick', updatePackets[0])
        );
        // io.room(matchId).emit('tick', updatePackets[0]);
    }, config.tickMs);

    console.log(`[index] Match ${matchId} created`);
})

// register a particular user as a player in a match
app.post('/join', async (req, res) => {
    try {
        const userId = req.body.userId as string;
        const matchId = req.body.matchId;

        const match = matches.find(m => m.matchId === matchId);
        if (!match) {
            res.status(400);
            res.send("Match doesn't exist");
            console.warn(`[index] Join attempt to a match that doesn't exist (${matchId})`);
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
            if (!match.players.find(p => p.index === index))
                break;
        }
        console.log(`[index] Adding user ${userId} as player number ${index} in match ${matchId}`);
        // TODO - assign colors
        match.players.push({ user: userId, index, color: 0 });

        res.send(JSON.stringify({
            playerIndex: index
        }));
    }
    catch(e) {
        res.sendStatus(500);
        console.error(e);
    }
});

app.post('/leave', async (req, res) => {
    try {
        const userId = req.body.userId as string;
        const matchId = req.body.matchId;

        const match = matches.find(m => m.matchId === matchId);
        if (!match) {
            res.send('OK');
            return;
        }

        if (match.players.find(p => p.user === userId)) {
            match.players = match.players.filter(p => p.user !== userId);
            res.send('OK');
            return;
        }
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
        console.log(`[index] ${channel.id} got disconnected`)
    })

    channel.on('spectate', (data: Data) => {
        const packet = data as IdentificationPacket;

        const m = matches.find(m => m.matchId === packet.matchId);
        if (!m) {
            console.warn("[index] Received a spectate request to a match that doesn't exist");
            channel.emit('spectate failure', packet.matchId, {reliable: true});
            return;
        }

        const spectatorEntry = {
            channel,
            user: packet.userId,
        }

        m.spectators.push(spectatorEntry);

        channel.userData = {
            matchId: packet.matchId
        };

        channel.join(String(packet.matchId));
        channel.emit('spectating', {matchId: packet.matchId}, {reliable: true});

        console.log(`[index] Channel of user ${packet.userId} spectating match ${packet.matchId}`);
    });

    channel.on('connect', (data: Data) => {
        // TODO properly validate data format
        const packet = data as IdentificationPacket;

        const m = matches.find(m => m.matchId === packet.matchId);
        if (!m) {
            console.warn("[index] Received a connect request to a match that doesn't exist");
            channel.emit('connection failure', packet.matchId, {reliable: true});
            return;
        }

        const playerEntry = m.players.find(p => p.user === packet.userId);
        if (!playerEntry) {
            console.warn(`[index] Received a connect request to a match(${packet.matchId}) that the user(${packet.userId}) hasn't joined`);
            channel.emit('connection failure', packet.matchId, {reliable: true});
            return;
        }

        playerEntry.channel = channel;

        channel.join(String(packet.matchId));

        channel.userData = {
            playerIndex: playerEntry.index,
            matchId: packet.matchId
        };

        console.log(`[index] Channel of user ${packet.userId} connected to the match ${packet.matchId}`);

        channel.emit('connected', playerEntry.index, {reliable: true});
        channel.emit('chat message', `Successfully connected to the match ${packet.matchId}!`);

        // check if the game can start
        // TODO - wait for all players, not just one
        if (m.players.length >= 2) {
            console.log(`[index] Enough players joined, starting ${packet.matchId}`)
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
            command(data as CommandPacket, m.game, channel.userData.playerIndex);
        }
        catch(e) {
            console.error(e);
            console.error('userdata:', channel.userData)
        }
    });

    channel.on('chat message', (data: Data) => {
        console.log(`[index] got ${data} from "chat message"`)
        // emit the "chat message" data to all channels in the same room
        io.room(channel.roomId).emit('chat message', data)
    })
})

// Serve client files
app.use(express.static('client'));
server.listen(config.httpPort)
