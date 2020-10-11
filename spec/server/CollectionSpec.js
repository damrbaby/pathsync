import fetch from 'node-fetch'
import Collection from '../../server/Collection'
import { pathSync, server } from '../helpers/helper'

describe('Collection', function() {

  beforeEach(function() {
    Collection.__Rewire__('pushid', () => 'x123')
    this.sync = pathSync.collection('/my/stuff')
  })

  afterEach(function() {
    Collection.__ResetDependency__('pushid')
  })

  it('should add item', async function() {
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise((resolve, reject) => {
      handler.and.callFake(resolve)
    })
    let sub = this.sync.subscribe(handler)
    await sub
    expect(await this.sync.getCount()).toEqual(0)
    await this.sync.add({ foo: 'bar' })
    expect(await this.sync.getCount()).toEqual(1)
    await this.sync.getAll().then((items) => {
      expect(items.map(item => item.props)).toEqual([{
        foo: 'bar'
      }])
    })
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({
      action: 'added',
      item: {
        key: 'x123',
        path: '/my/stuff/x123',
        props: { foo: 'bar' }
      }
    })
    sub.cancel()
    Collection.__Rewire__('pushid', () => 'z987')
    await this.sync.add({ bing: 'bong' })
    await this.sync.getAll().then((items) => {
      expect(items.map(item => item.props)).toEqual([{
        foo: 'bar'
      }, {
        bing: 'bong'
      }])
    })
  })

  it('should remove item', async function() {
    let item = await this.sync.add({ foo: 'bar' })
    expect((await this.sync.getAll()).map(item => item.props)).toEqual([{ foo: 'bar' }])
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise((resolve, reject) => {
      handler.and.callFake(resolve)
    })
    let sub = this.sync.subscribe(handler)
    await sub
    expect(await this.sync.getCount()).toEqual(1)
    await item.remove()
    expect(await this.sync.getCount()).toEqual(0)
    expect(await this.sync.getAll()).toEqual([])
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({
      action: 'removed',
      key: 'x123'
    })
    sub.cancel()
  })

  it('should update item', async function() {
    let item = await this.sync.add({ foo: 'bar' })
    expect((await this.sync.getAll()).map(item => item.props)).toEqual([{ foo: 'bar' }])
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise((resolve, reject) => {
      handler.and.callFake(resolve)
    })
    let sub = this.sync.subscribe(handler)
    await sub
    item = await item.update({ hello: 'world' })
    expect(item.props).toEqual({ foo: 'bar', hello: 'world' })
    expect((await this.sync.getAll()).map(item => item.props)).toEqual([{
      foo: 'bar',
      hello: 'world'
    }])
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({
      action: 'added',
      item: {
        key: 'x123',
        path: '/my/stuff/x123',
        props: {
          foo: 'bar',
          hello: 'world'
        }
      }
    })
    sub.cancel()
  })

  it('should get and subscribe to item', async function() {
    await this.sync.add({ hello: 'world' })
    let item = await this.sync.get('x123')
    expect(item.props).toEqual({ hello: 'world' })
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise((resolve, reject) => {
      handler.and.callFake(resolve)
    })
    let sub = item.subscribe(handler)
    await sub
    await item.update({ foo: 'bar' })
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({
      hello: 'world', foo: 'bar'
    })
    sub.cancel()
  })

  it('should GET items sorted by key', async function() {
    await this.sync.add({ foo: 'bar' })
    Collection.__Rewire__('pushid', () => 'y987')
    await this.sync.add({ hello: 'world' })
    let json = await fetch(`http://localhost:${server.address().port}/collection/my/stuff`).then(res => res.json())
    expect(json).toEqual([
      {
        key: 'x123',
        path: '/my/stuff/x123',
        props: {
          foo: 'bar'
        }
      }, {
        key: 'y987',
        path: '/my/stuff/y987',
        props: {
          hello: 'world'
        }
      }
    ])
  })

  it('should GET items when empty', async function() {
    let json = await fetch(`http://localhost:${server.address().port}/collection/my/stuff`).then(res => res.json())
    expect(json).toEqual([])
  })

})
