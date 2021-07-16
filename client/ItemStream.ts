import { ReplaySubject } from 'rxjs'
import { nanoid } from 'nanoid'
import { FayeClient, FayeSubscription } from 'faye'

export default class Item<Props> {
  client: FayeClient
  path: string
  stream: ReplaySubject<Props>
  subscription: FayeSubscription | null
  item?: Props

  constructor(client: FayeClient, path: string) {
    this.client = client
    this.path = path
    this.stream = new ReplaySubject(1)
    this.subscription = null
  }

  async initSubscription() {
    if (this.subscription) return

    this.subscription = this.client.subscribe(this.path, (item: Props) => {
      this.setItem(item)
    })

    await this.subscription

    const channel = this.path + '/' + nanoid()

    const initSub = this.client.subscribe(channel, (item: Props) => {
      initSub.cancel()
      if (this.item === undefined) {
        this.setItem(item)
      }
    })

    await initSub

    this.client.publish('/subscribe', {
      type: 'Item',
      path: this.path,
      channel
    })
  }

  subscribe(handler: (item: Props) => void) {
    this.initSubscription()
    return this.stream.subscribe(handler)
  }

  publish(item: Props) {
    return this.client.publish(this.path, item)
  }

  setItem(item: Props) {
    this.item = item
    this.stream.next(item)
  }

  destroy() {
    this.stream.unsubscribe()
    if (this.subscription) {
      this.subscription.cancel()
    }
  }
}
