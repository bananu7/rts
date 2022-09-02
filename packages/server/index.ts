import geckos, { Data } from '@geckos.io/server'
import http from 'http'
import express from 'express'

import {Game, newGame, tick} from './game';

const app = express()
const server = http.createServer(app)
const io = geckos()

const games : Game[] = [];

type IdentificationPacket = {
  player: number,
  gameId: string, 
}

io.addServer(server)

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/create', (req, res) => {
    // TODO - load or w/e
    const map = { w: 10, h: 10, tiles: [1,2,3] };

    games.push(newGame(map));
})

// channel is a new RTC connection (i.e. one browser)
io.onConnection(channel => {
  // first figure out where to join it
  channel.onDisconnect(() => {
    console.log(`${channel.id} got disconnected`)
  })

  channel.on('join', (data: Data) => {
    const p = data as IdentificationPacket;
    channel.join(p.gameId)
  });

  channel.on('chat message', (data: Data) => {
    console.log(`got ${data} from "chat message"`)
    // emit the "chat message" data to all channels in the same room
    io.room(channel.roomId).emit('chat message', data)
  })
})

server.listen(9208)