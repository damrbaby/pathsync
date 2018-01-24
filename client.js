// @flow
import ItemStream from './client/ItemStream'
import ListStream from './client/ListStream'
import CollectionStream from './client/CollectionStream'

export default class PathStream {

  host: string
  client: any

  constructor(host: string, client: any) {
    this.host = host
    this.client = client
  }

  item(path: string) {
    return new ItemStream(this.host, this.client, path)
  }

  list(path: string) {
    return new ListStream(this.host, this.client, path)
  }

  collection(path: string) {
    return new CollectionStream(this.host, this.client, path)
  }

}
