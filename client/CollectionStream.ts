import { ReplaySubject } from 'rxjs'

type Payload = {
  action: 'added' | 'removed'
  item: {
    key: string
    [x: string]: any
  }
  key: string
}

export default class CollectionStream {

  host: string
  client: any
  path: string
  stream: any
  items: Map<String, Object>
  subscription: any

  constructor(host: string, client: any, path: string) {
    this.host = host
    this.client = client
    this.path = path
    this.stream = new ReplaySubject(1)
    this.items = new Map()
    this.subscription = null
  }

  async initSubscription() {
    if (this.subscription) return

    let loaded = false
    let queue: Array<Function> = []

    this.subscription = this.client.subscribe(this.path, (data: Payload) => {
      let operation
      if (data.action === 'added') {
        operation = () => this.items.set(data.item.key, data.item)
      } else if (data.action === 'removed') {
        operation = () => this.items.delete(data.key)
      }

      if (!operation) {
        return
      }

      if (loaded) {
        operation()
        this.stream.next(this.items)
      } else {
        queue.push(operation)
      }
    })

    await this.subscription

    let data = await fetch(this.host + '/collection' + this.path).then((res: any) => res.json())

    for (let item of data) {
      this.items.set(item.key, item)
    }

    for (let operation of queue) {
      if (operation) {
        operation()
      }
    }

    this.stream.next(this.items)

    loaded = true
  }

  subscribe(handler: Function) {
    this.initSubscription()
    return this.stream.subscribe(handler)
  }

  destroy() {
    this.stream.unsubscribe()
    if (this.subscription) {
      this.subscription.cancel()
    }
  }

}
