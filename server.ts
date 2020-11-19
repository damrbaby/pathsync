import Path from './server/Path'
import Item from './server/Item'
import List from './server/List'
import Collection from './server/Collection'

export default class PathSync {

  client: any
  redis: any

  constructor(client: any, redis: any) {
    this.client = client
    this.redis = redis
  }

  install(app: any) {
    app.get('/item/:path*', async (ctx:any) => {
      let sync = new Item('/' + ctx.params.path, this.client, this.redis)
      const item = await sync.get()
      ctx.body = item
    })

    app.get('/list/:path*', async (ctx: any) => {
      let sync = new List('/' + ctx.params.path, this.client, this.redis)
      const items = await sync.getAll()
      ctx.body = items.map(item => item.props)
    })

    app.get('/collection/:path*', async (ctx: any) => {
      let sync = new Collection('/' + ctx.params.path, this.client, this.redis)
      const items = await sync.getAll()
      let data = []
      for (let item of items) {
        data.push({
          key: item.key,
          path: item.path,
          props: item.props
        })
      }
      ctx.body = data
    })
  }

  path<Event>(path: string) {
    return new Path<Event>(path, this.client, this.redis)
  }

  item<Props>(path: string) {
    return new Item<Props>(path, this.client, this.redis)
  }

  list<Props>(path: string) {
    return new List<Props>(path, this.client, this.redis)
  }

  collection<Props>(path: string) {
    return new Collection<Props>(path, this.client, this.redis)
  }

}
