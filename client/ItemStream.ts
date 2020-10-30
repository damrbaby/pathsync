import { ReplaySubject } from 'rxjs'

export default class Item {

  host: string
  client: any
  path: string
  stream: any
  item: Object | null
  subscription: any

  constructor(host: string, client: any, path: string) {
    this.host = host
    this.client = client
    this.path = path
    this.stream = new ReplaySubject(1)
    this.item = null
    this.subscription = null
  }

  async initSubscription() {
    if (this.subscription) return

    this.subscription = this.client.subscribe(this.path, (item: Object) => {
      this.setItem(item)
    })

    await this.subscription

    let item = await fetch(this.host + '/item' + this.path).then((res: any) => res.json())

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
    this.stream.next(item)
  }

  destroy() {
    this.stream.unsubscribe()
    if (this.subscription) {
      this.subscription.cancel()
    }
  }

}
