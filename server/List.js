// @flow
import stringify from 'json-stable-stringify'
import Path from './Path'

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

  subscribe(handler: Function) {
    return this.sync.subscribe(handler)
  }
}

export default class List<Props> extends Path {

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

  async get(props: Props): ListItem<Props> {
    let items = await this.getAll()
    for (let item of items) {
      if (stringify(item.props) === stringify(props)) {
        return item
      }
    }
    throw new Error('item not found')
  }

  async set(items: Array<Props>): Promise<void> {
    await this.redis.rpush(this.path, items.map(item => stringify(item)))
  }

  getAll(): Promise<Array<ListItem<Props>>> {
    return this.redis.lrange(this.path, 0, -1).then((data) => {
      return data.map(d => new ListItem(this, JSON.parse(d)))
    })
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
