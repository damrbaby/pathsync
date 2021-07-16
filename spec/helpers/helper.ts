import http from 'http'
import Redis from 'ioredis'
import faye from 'faye'
import PathSync from '../../server'
import PathStream from '../../client'

const redis = new Redis()
const bayeux = new faye.NodeAdapter({
  mount: '/faye',
  timeout: 45
})

export const server = http.createServer()

bayeux.attach(server)

export const client = bayeux.getClient()
export const pathSync = new PathSync(client, redis)
export const pathStream = new PathStream(client)

pathSync.start()

export const sleep = (ms: number = 0) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

beforeEach(async function() {
  await redis.flushdb()
})

beforeAll(function(done) {
  server.listen(done)
})

afterAll(function(done) {
  server.close(done)
})
