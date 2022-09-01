import geckos, { Data } from '@geckos.io/server'

const io = geckos()

io.listen(9208) // default port is 9208

io.onConnection(channel => {
  channel.onDisconnect(() => {
    console.log(`${channel.id} got disconnected`)
  })

  channel.on('chat message', (data: Data) => {
    console.log(`got ${data} from "chat message"`)
    // emit the "chat message" data to all channels in the same room
    io.room(channel.roomId).emit('chat message', data)
  })
})