import { ReplaySubject } from 'rxjs'
import { findLastIndex } from 'lodash'

type Events = 'value' | 'added' | 'removed'

type Payload = {
  action: 'added' | 'changed' | 'removed'
  item: Object
  newItem: Object
}

export default class ListStream {

  host: string
  client: any
  path: string
  stream: any
  items: Array<Object>
  subscription: any

  constructor(host: string, client: any, path: string) {
    this.host = host
    this.client = client
    this.path = path
    this.stream = new ReplaySubject(1)
    this.items = []
  }

  async initSubscription() {
    if (this.subscription) return

    let loaded = false
    let operations:Array<Function> = []

    this.subscription = this.client.subscribe(this.path, (data: Payload) => {
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
            this.stream.next({ removed: data.item })
            this.stream.next({ added: data.newItem })
          }
        }
        if (updateStream) {
          this.stream.next({ value: this.items.slice() })
        }
      }

      if (loaded) {
        operation(true)
      } else {
        operations.push(operation)
      }
    })

    await this.subscription

    let data = await fetch(this.host + '/list' + this.path).then((res:any) => res.json())

    for (let item of data) {
      this.items.push(item)
    }

    for (let operation of operations) {
      operation(false)
    }

    for (let item of this.items) {
      this.stream.next({ added: item })
    }
    this.stream.next({ value: this.items })

    loaded = true
  }

  subscribe(event: Events, handler: Function) {
    this.initSubscription()
    return this.stream.subscribe((data: { added: Object, removed: Object, value: Object }) => {
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
