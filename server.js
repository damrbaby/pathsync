// @flow
import faye from 'faye'
import express from 'express'

import Path from './server/Path'
import Item from './server/Item'
import List from './server/List'
import Collection from './server/Collection'

export default class PathSync {

  client: any
  redis: any

  constructor(client: any, redis: any) {
    this.client = client
    this.redis = redis
  }

  install(app: any) {
    app.get('/item/*', (req, res) => {
      let sync = new Item(req.path.replace('/item', ''), this.client, this.redis)
      sync.get().then((item) => {
        res.json(item)
      }, () => {
        res.status(500).send()
      })
    })

    app.get('/list/*', (req, res) => {
      let sync = new List(req.path.replace('/list', ''), this.client, this.redis)
      sync.getAll().then((items) => {
        res.json(items.map(item => item.props))
      }, () => {
        res.status(500).send()
      })
    })

    app.get('/collection/*', (req, res) => {
      let sync = new Collection(req.path.replace('/collection', ''), this.client, this.redis)
      sync.getAll().then((items) => {
        let data = []
        for (let item of items) {
          data.push({
            key: item.key,
            path: item.path,
            props: item.props
          })
        }
        res.json(data)
      }, () => {
        res.status(500).send()
      })
    })
  }

  path(path: string) {
    return new Path(path, this.client)
  }

  item(path: string) {
    return new Item(path, this.client, this.redis)
  }

  list(path: string) {
    return new List(path, this.client, this.redis)
  }

  collection(path: string) {
    return new Collection(path, this.client, this.redis)
  }

}
