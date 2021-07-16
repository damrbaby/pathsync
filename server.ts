import { Redis } from 'ioredis'
import { FayeClient } from 'faye'
import Path from './server/Path'
import Item from './server/Item'
import List from './server/List'
import Collection from './server/Collection'

export type SubscriptionPayload = {
  type: 'Item' | 'List' | 'Collection'
  path: string
  channel: string
}

export default class PathSync {
  client: FayeClient
  redis: Redis

  constructor(client: FayeClient, redis: Redis) {
    this.client = client
    this.redis = redis
  }

  async start() {
    const sub = await this.client.subscribe('/subscribe', async (data: SubscriptionPayload) => {
      const result = await (async () => {
        switch (data.type) {
          case 'Item':
            return new Item(data.path, this).get()
          case 'List':
            return new List(data.path, this).getAllProps()
          case 'Collection':
            const items = await new Collection(data.path, this).getAll()
            return items.map(item => {
              const { key, path, props } = item
              return { key, path, props }
            })
        }
      })()

      this.client.publish(data.channel, result)
    })

    return () => sub.cancel()
  }

  path<Event>(path: string) {
    return new Path<Event>(path, this)
  }

  item<Props>(path: string, props: Props | null = null) {
    return new Item<Props>(path, this, props)
  }

  list<Props>(path: string) {
    return new List<Props>(path, this)
  }

  collection<Props>(path: string) {
    return new Collection<Props>(path, this)
  }
}
