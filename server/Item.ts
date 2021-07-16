import Path from './Path'
import PathSync from '../server'

export default class Item<Props> extends Path<Props | null> {

  props: Props | null

  constructor(path: string, sync: PathSync, props: Props | null = null) {
    super(path, sync)
    this.props = props
  }

  async get() {
    const data = await this.redis.get(this.path)
    if (data) {
      this.props = JSON.parse(data)
      return this.props
    }

    return null
  }

  async set(props: Props) {
    this.props = props
    await Promise.all([
      this.redis.set(this.path, JSON.stringify(props)),
      this.publish(props)
    ])
  }

  async update(props: Partial<Props>) {
    await this.get()
    if (this.props) {
      Object.assign(this.props, props)
      await this.save()
    }

    return this.props
  }

  async remove() {
    await Promise.all([
      this.redis.del(this.path),
      this.publish(null)
    ])
    this.props = null
  }

  async save() {
    if (this.props) {
      await this.set(this.props)
    } else {
      await this.remove()
    }
  }
}
