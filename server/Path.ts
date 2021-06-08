import PathSync from '../server'

export default class Path<Event> {
  path: string
  sync: PathSync
  client: any
  redis: any
  subs: Set<any>

  constructor(path: string, sync: PathSync) {
    this.path = path
    this.sync = sync
    this.client = sync.client
    this.redis = sync.redis
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
