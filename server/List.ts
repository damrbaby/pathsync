import stringify from 'json-stable-stringify'
import Path from './Path'

type Event<Props> = {
  action: 'added' | 'removed' | 'changed'
  item: Props
  newItem?: Props
}

export class ListItem<Props> {

  sync: List<Props>
  props: Props
  path: string

  constructor(sync: List<Props>, props: Props) {
    this.sync = sync
    this.props = props
    this.path = this.sync.path
  }

  add() {
    return this.sync.add(this.props)
  }

  remove() {
    return this.sync.remove(this.props)
  }

  replace(props: Props) {
    return this.sync.replace(this, props)
  }

  subscribe(handler: (event: Event<Props>) => void) {
    return this.sync.subscribe(handler)
  }
}

export default class List<Props> extends Path<Event<Props>> {

  async add(item: Props): Promise<ListItem<Props>> {
    await this.redis.rpush(this.path, stringify(item)),
    await this.publish({
      action: 'added',
      item
    })
    return new ListItem(this, item)
  }

  async remove(item: Props): Promise<void> {
    await this.redis.lrem(this.path, -1, stringify(item)),
    await this.publish({
      action: 'removed',
      item
    })
  }

  async replace(item: ListItem<Props>, props: Props): Promise<void> {
    let transaction = this.redis.multi()
    transaction.linsert(this.path, 'after', stringify(item.props), stringify(props))
    transaction.lrem(this.path, -1, stringify(item.props))
    await transaction.exec()
    await this.publish({
      action: 'changed',
      item: item.props,
      newItem: props
    })
  }

  async get(props: Props): Promise<ListItem<Props>> {
    let items = await this.getAll()
    for (let item of items) {
      if (stringify(item.props) === stringify(props)) {
        return item
      }
    }
    throw new Error('item not found')
  }

  async has(props: Props): Promise<boolean> {
    let items = await this.getAll()
    for (let item of items) {
      if (stringify(item.props) === stringify(props)) {
        return true
      }
    }

    return false
  }

  async set(items: Array<Props>): Promise<void> {
    await this.redis.rpush(this.path, items.map(item => stringify(item)))
  }

  async getAll(): Promise<Array<ListItem<Props>>> {
    const data:Array<string> = await this.redis.lrange(this.path, 0, -1)
    return data.map(d => new ListItem(this, JSON.parse(d)))
  }

  async getAllProps(): Promise<Array<Props>> {
    return this.getAll().then(items => items.map(item => item.props))
  }

  getCount(): Promise<number> {
    return this.redis.llen(this.path)
  }

  async getLast(): Promise<ListItem<Props> | null> {
    let data = await this.redis.lindex(this.path, -1)
    let item = JSON.parse(data)
    return item ? new ListItem(this, item) : null
  }

}
