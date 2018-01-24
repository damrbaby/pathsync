// @flow
import Rx from 'rx'

export default class Item {

  host: string
  client: any
  path: string
  stream: any
  item: ?Object
  subscription: ?Object

  constructor(host: string, client: any, path: string) {
    this.host = host
    this.client = client
    this.path = path
    this.stream = new Rx.ReplaySubject(1)
    this.item = null
    this.subscription = null
  }

  async initSubscription() {
    if (this.subscription) return

    this.subscription = this.client.subscribe(this.path, item => {
      this.setItem(item)
    })

    await this.subscription

    let item = await fetch(this.host + '/item' + this.path).then(res => res.json())

    if (this.item === null) {
      this.setItem(item)
    }
  }

  subscribe(handler: Function) {
    this.initSubscription()
    return this.stream.subscribe(handler)
  }

  publish(item: Object) {
    return this.client.publish(this.path, item)
  }

  setItem(item: Object) {
    this.item = item
    this.stream.onNext(item)
  }

  destroy() {
    delete this.stream
    if (this.subscription) {
      this.subscription.cancel()
    }
  }

}
