import { nanoid } from 'nanoid'
import Item from './Item'
import Path from './Path'

type Event<Props> = {
  action: 'added' | 'removed'
  key?: string
  item?: {
    key: string
    path: string
    props: Props
  }
}

export class CollectionItem<Props> {

  sync: Collection<Props>
  props: Props
  key: string
  path: string

  constructor(sync: Collection<Props>, props: Props, key: string) {
    this.sync = sync
    this.props = props
    this.key = key
    this.path = sync.path + '/' + key
  }

  get() {
    return this.sync.get(this.key)
  }

  remove() {
    return this.sync.remove(this.key)
  }

  update(props: Partial<Props>) {
    return this.sync.update(this.key, props)
  }

  subscribe(handler: Function) {
    return this.sync.subscribe(data => {
      if (data.item?.key === this.key) {
        handler(data.item.props)
      }
    })
  }
}

export default class Collection<Props> extends Path<Event<Props>> {

  keyPath: string = ''

  newItem(key: string): Item<Props> {
    return new Item(this.path + '/' + key, this.sync)
  }

  add(props: Props): Promise<CollectionItem<Props>> {
    return this.set(nanoid(), props)
  }

  async set(key: string, props: Props): Promise<CollectionItem<Props>> {
    let item = new CollectionItem(this, props, key)
    await this.newItem(key).set(props)
    await this.redis.rpush(this.keyPath, key)
    await this.publish({
      action: 'added',
      item: {
        key: item.key,
        path: item.path,
        props: item.props
      }
    })
    return item
  }

  async remove(key: string) {
    await this.newItem(key).remove()
    await this.redis.lrem(this.keyPath, -1, key)
    await this.publish({
      action: 'removed',
      key
    })
  }

  async update(key: string, props: Partial<Props>): Promise<CollectionItem<Props>> {
    let newProps = await this.newItem(key).update(props)
    let item = new CollectionItem(this, newProps, key)
    await this.publish({
      action: 'added',
      item: {
        key: item.key,
        path: item.path,
        props: item.props
      }
    })
    return item
  }

  async get(key: string): Promise<CollectionItem<Props>> {
    let value = await this.newItem(key).get()
    return new CollectionItem(this, value, key)
  }

  async has(key: string) {
    const keys = await this.redis.lrange(this.keyPath, 0, -1)
    return keys.indexOf(key) >= 0
  }

  async getAll(): Promise<Array<CollectionItem<Props>>> {
    let keys:Array<string> = await this.redis.lrange(this.keyPath, 0, -1)
    return Promise.all(keys.map(key => this.get(key)))
  }

  getCount() {
    return this.redis.llen(this.keyPath)
  }
}
