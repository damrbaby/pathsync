// @flow

export default class Path {

  path: string
  client: any
  redis: any
  subs: Set<*>

  constructor(path: string, client: any, redis: any) {
    this.path = path
    this.client = client
    this.redis = redis
    this.subs = new Set()
  }

  subscribe(handler: Function) {
    let sub = this.client.subscribe(this.path, handler)
    let cancel = sub.cancel.bind(sub)
    sub.cancel = () => {
      this.subs.delete(sub)
      cancel()
    }
    this.subs.add(sub)
    return sub
  }

  publish(value: any) {
    return this.client.publish(this.path, value)
  }

  destroy() {
    for (let sub of this.subs) {
      sub.cancel()
    }
  }

}
