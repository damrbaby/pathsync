import { nanoid } from 'nanoid'
import Item from './Item'
import Path from './Path'

export type Event<Props> = {
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
  key: string
  path: string
  props: Props | null

  constructor(sync: Collection<Props>, key: string, props: Props | null) {
    this.sync = sync
    this.key = key
    this.path = sync.path + '/' + key
    this.props = props
  }

  async get() {
    const item = await this.sync.get(this.key)
    return this.props = item.props
  }

  async remove() {
    await this.sync.remove(this.key)
    this.props = null
  }

  async update(props: Partial<Props>) {
    const item = await this.sync.update(this.key, props)
    return this.props = item.props
  }

  subscribe(handler: Function) {
    return this.sync.subscribe(data => {
      if (data.item?.key === this.key) {
        handler(data.item.props)
      }
    })
  }
}

export default class Collection<Props> extends Path<Event<Props | null>> {

  keyPath: string = ''

  newItem(key: string) {
    return new Item<Props | null>(this.path + '/' + key, this.sync)
  }

  add(props: Props) {
    return this.set(nanoid(), props)
  }

  async set(key: string, props: Props) {
    let item: CollectionItem<Props> = new CollectionItem(this, key, props)
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

  async update(key: string, props: Partial<Props>) {
    let newProps = await this.newItem(key).update(props)
    let item: CollectionItem<Props | null> = new CollectionItem(this, key, newProps)
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

  async get(key: string) {
    let value = await this.newItem(key).get()
    return new CollectionItem<Props>(this, key, value)
  }

  async has(key: string) {
    const keys = await this.redis.lrange(this.keyPath, 0, -1)
    return keys.indexOf(key) >= 0
  }

  async getAll(): Promise<CollectionItem<Props>[]> {
    let keys:Array<string> = await this.redis.lrange(this.keyPath, 0, -1)
    return Promise.all(keys.map(key => this.get(key)))
  }

  async getAllProps() {
    const items = await this.getAll()
    return items.map(item => item.props)
  }

  getCount() {
    return this.redis.llen(this.keyPath)
  }
}
