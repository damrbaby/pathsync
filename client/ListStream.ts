import { ReplaySubject } from 'rxjs'
import { findLastIndex } from 'lodash'
import { nanoid } from 'nanoid'
import { FayeClient, FayeSubscription } from 'faye'

type Events = 'value' | 'added' | 'removed' | 'changed'

type Payload<Props> = {
  action: 'added' | 'changed' | 'removed'
  item: Props
  newItem: Props
}

type Value<Props> = Partial<{
 value: Props[]
 added: Props
 removed: Props
 changed: Props
}>

export default class ListStream<Props> {
  client: FayeClient
  path: string
  stream: ReplaySubject<Value<Props>>
  items: Array<Props>
  subscription: FayeSubscription | null

  constructor(client: FayeClient, path: string) {
    this.client = client
    this.path = path
    this.stream = new ReplaySubject(1)
    this.items = []
    this.subscription = null
  }

  async initSubscription() {
    if (this.subscription) return

    let loading = true
    let operations:Array<Function> = []

    this.subscription = this.client.subscribe<Payload<Props>>(this.path, data => {
      let operation = (updateStream: boolean) => {
        let index = findLastIndex(this.items, data.item)
        if (data.action === 'added' && index < 0) {
          this.items.push(data.item)
          if (updateStream) {
            this.stream.next({ added: data.item })
          }
        } else if (data.action === 'removed' && index >=0) {
          this.items.splice(index, 1)
          if (updateStream) {
            this.stream.next({ removed: data.item })
          }
        } else if (data.action === 'changed' && index >= 0) {
          this.items.splice(index, 1, data.newItem)
          if (updateStream) {
            this.stream.next({ changed: data.newItem })
          }
        }
        if (updateStream) {
          this.stream.next({ value: this.items.slice() })
        }
      }

      if (loading) {
        operations.push(operation)
      } else {
        operation(true)
      }
    })

    await this.subscription

    const channel = this.path + '/' + nanoid()

    const initSub = this.client.subscribe(channel, (items: Props[]) => {
      initSub.cancel()
      for (const item of items) {
        this.items.push(item)
      }
      for (let operation of operations) {
        operation(false)
      }

      for (let item of this.items) {
        this.stream.next({ added: item })
      }
      this.stream.next({ value: this.items })

      loading = false
    })

    await initSub

    this.client.publish('/subscribe', {
      type: 'List',
      path: this.path,
      channel
    })
  }

  subscribe(event: Events, handler: Function) {
    this.initSubscription()
    return this.stream.subscribe(data => {
      if (data[event]) {
        handler(data[event])
      }
    })
  }

  getAll() {
    return this.items
  }

  destroy() {
    this.stream.unsubscribe()
    if (this.subscription) {
      this.subscription.cancel()
    }
  }
}
