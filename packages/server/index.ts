import geckos, { Data } from '@geckos.io/server'
import http from 'http'
import express from 'express'
import cors from 'cors'

import {Game, newGame, tick} from './game.js';

const app = express()
app.use(cors())
const server = http.createServer(app)
const io = geckos()

type Match = {
    game: Game,
    matchId: string,
}
const matches : Match[] = [];

type IdentificationPacket = {
  playerId: number,
  matchId: string, 
}

io.addServer(server)

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/listMatches', (req, res) => {
    const ids = JSON.stringify(matches.map(m => m.matchId));
    res.send(ids);
})

let lastMatchId = 0;

app.post('/create', (req, res) => {
    // TODO - load or w/e
    const map = { w: 10, h: 10, tiles: [1,2,3] };

    const game = newGame(map);
    const matchId = String(++lastMatchId); // TODO
    matches.push({ game, matchId });

    setInterval(() => {
        tick(100, game)
        io.room(matchId).emit('tick', game.state);
        //io.emit('tick', game.state);
    }, 100);
})

// channel is a new RTC connection (i.e. one browser)
io.onConnection(channel => {
  // first figure out where to join it
  channel.onDisconnect(() => {
    console.log(`${channel.id} got disconnected`)
  })

  channel.on('join', (data: Data) => {
    const p = data as IdentificationPacket;
    console.log(channel.roomId)
    channel.join(String(p.matchId));
    console.log(channel.roomId)
    channel.userData = {
        playerId: p.playerId,
        matchId: p.matchId
    };

    console.log(`Channel ${p.playerId} joined the match ${p.matchId}`);
  });

  channel.on('command', (data: Data) => {
      console.log('got a command');
  });

  channel.on('chat message', (data: Data) => {
    console.log(`got ${data} from "chat message"`)
    // emit the "chat message" data to all channels in the same room
    io.room(channel.roomId).emit('chat message', data)
  })
})

server.listen(9208)