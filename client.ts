import { FayeClient } from 'faye'
import ItemStream from './client/ItemStream'
import ListStream from './client/ListStream'
import CollectionStream from './client/CollectionStream'

export default class PathStream {
  client: FayeClient

  constructor(client: FayeClient) {
    this.client = client
  }

  item<Props>(path: string) {
    return new ItemStream<Props>(this.client, path)
  }

  list<Props>(path: string) {
    return new ListStream<Props>(this.client, path)
  }

  collection<Props>(path: string) {
    return new CollectionStream<Props>(this.client, path)
  }
}
