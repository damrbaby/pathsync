// @flow
import Rx from 'rx'
import _ from 'lodash'

type Events = 'value' | 'added' | 'removed'

export default class ListStream {

  host: string
  client: any
  path: string
  stream: any
  items: Array<Object>
  subscription: ?Object

  constructor(host: string, client: any, path: string) {
    this.host = host
    this.client = client
    this.path = path
    this.stream = new Rx.ReplaySubject(1)
    this.items = []
  }

  async initSubscription() {
    if (this.subscription) return

    let loaded = false
    let operations = []

    this.subscription = this.client.subscribe(this.path, (data) => {
      let operation = (updateStream) => {
        let index = _.findLastIndex(this.items, data.item)
        if (data.action === 'added' && index < 0) {
          this.items.push(data.item)
          if (updateStream) {
            this.stream.onNext({ added: data.item })
          }
        } else if (data.action === 'removed' && index >=0) {
          this.items.splice(index, 1)
          if (updateStream) {
            this.stream.onNext({ removed: data.item })
          }
        } else if (data.action === 'changed' && index >= 0) {
          this.items.splice(index, 1, data.newItem)
          if (updateStream) {
            this.stream.onNext({ removed: data.item })
            this.stream.onNext({ added: data.newItem })
          }
        }
        if (updateStream) {
          this.stream.onNext({ value: this.items.slice() })
        }
      }

      if (loaded) {
        operation(true)
      } else {
        operations.push(operation)
      }
    })

    await this.subscription

    let data = await fetch(this.host + '/list' + this.path).then(res => res.json())

    for (let item of data) {
      this.items.push(item)
    }

    for (let operation of operations) {
      operation(false)
    }

    for (let item of this.items) {
      this.stream.onNext({ added: item })
    }
    this.stream.onNext({ value: this.items })

    loaded = true
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
    delete this.stream
    if (this.subscription) {
      this.subscription.cancel()
    }
  }

}
