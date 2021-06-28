import Path from './Path'

export default class Item<Props> extends Path<Props | {}> {

  async get(): Promise<Props> {
    const data = await this.redis.get(this.path)
    return JSON.parse(data) || {}
  }

  async getProp(prop: keyof Props) {
    return this.get().then(props => props[prop])
  }

  set(props: Props) {
    return Promise.all([
      this.redis.set(this.path, JSON.stringify(props)),
      this.publish(props || {})
    ])
  }

  async update(props: Partial<Props>): Promise<Props> {
    let currentProps = await this.get()
    let newProps = Object.assign(currentProps, props)
    await this.set(newProps)
    return newProps
  }

  remove() {
    return Promise.all([
      this.redis.del(this.path),
      this.publish({})
    ])
  }
}
