import http from 'http'
import Koa from 'koa'
import Router from '@koa/router'
import json from 'koa-json'
import Redis from 'ioredis'
import faye from 'faye'
import PathSync from '../../server'
import PathStream from '../../client'

const app = new Koa()
const router = new Router()

const redis = new Redis()

const bayeux = new faye.NodeAdapter({
  mount: '/faye',
  timeout: 45
})

export const server = http.createServer(app.callback())

bayeux.attach(server)

export const client = bayeux.getClient()
export const pathSync = new PathSync(client, redis)
export const pathStream = new PathStream('http://example.com', client)

pathSync.install(router)

app.use(router.routes())
app.use(json())

export const sleep = (ms) => {
  return new Promise((resolve, reject) => {
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
