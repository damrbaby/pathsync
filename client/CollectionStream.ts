import { FayeClient, FayeSubscription } from 'faye'
import { ReplaySubject } from 'rxjs'
import { nanoid } from 'nanoid'

type Item<Props> = {
  key: string
} & Props

type Payload<Props> = {
  action: 'added' | 'removed'
  item: Item<Props>
  key: string
}

export default class CollectionStream<Props> {
  client: FayeClient
  path: string
  stream: ReplaySubject<Map<String, Item<Props>>>
  items: Map<String, Item<Props>>
  subscription: FayeSubscription | null

  constructor(client: FayeClient, path: string) {
    this.client = client
    this.path = path
    this.stream = new ReplaySubject(1)
    this.items = new Map()
    this.subscription = null
  }

  async initSubscription() {
    if (this.subscription) return

    let loading = true
    let queue: Array<Function> = []

    this.subscription = this.client.subscribe(this.path, (data: Payload<Props>) => {
      let operation
      if (data.action === 'added') {
        operation = () => this.items.set(data.item.key, data.item)
      } else if (data.action === 'removed') {
        operation = () => this.items.delete(data.key)
      }

      if (!operation) {
        return
      }

      if (loading) {
        queue.push(operation)
      } else {
        operation()
        this.stream.next(this.items)
      }
    })

    await this.subscription

    const channel = this.path + '/' + nanoid()

    const initSub = this.client.subscribe(channel, (items: Item<Props>[]) => {
      initSub.cancel()
      for (const item of items) {
        this.items.set(item.key, item)
      }

      for (let operation of queue) {
        if (operation) {
          operation()
        }
      }

      this.stream.next(this.items)

      loading = false
    })

    await initSub

    this.client.publish('/subscribe', {
      type: 'Collection',
      path: this.path,
      channel
    })
  }

  subscribe(handler: (payload: Object) => void) {
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
