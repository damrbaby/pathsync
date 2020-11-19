export default class Path<Event> {

  path: string
  client: any
  redis: any
  subs: Set<any>

  constructor(path: string, client: any, redis: any) {
    this.path = path
    this.client = client
    this.redis = redis
    this.subs = new Set()
  }

  subscribe(handler: (event: Event) => void) {
    let sub = this.client.subscribe(this.path, handler)
    let cancel = sub.cancel.bind(sub)
    sub.cancel = () => {
      this.subs.delete(sub)
      cancel()
    }
    this.subs.add(sub)
    return sub
  }

  publish(event: Event) {
    return this.client.publish(this.path, event)
  }

  destroy() {
    for (let sub of this.subs) {
      sub.cancel()
    }
  }
}
