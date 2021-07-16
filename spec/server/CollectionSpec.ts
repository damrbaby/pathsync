import Collection from '../../server/Collection'
import { pathSync } from '../helpers/helper'

describe('Collection', function() {
  let sync: Collection<{ hello: string }>

  beforeEach(function() {
    // @ts-ignore
    Collection.__Rewire__('nanoid', () => 'x123')
    sync = pathSync.collection('/my/stuff')
  })

  afterEach(function() {
    // @ts-ignore
    Collection.__ResetDependency__('nanoid')
  })

  it('should add item', async function() {
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise(resolve => {
      handler.and.callFake(resolve)
    })
    let sub = sync.subscribe(handler)
    await sub
    expect(await sync.getCount()).toEqual(0)
    expect(await sync.has('x123')).toEqual(false)
    await sync.add({ hello: 'world' })
    expect(await sync.has('x123')).toEqual(true)
    expect(await sync.getCount()).toEqual(1)
    await sync.getAll().then((items) => {
      expect(items.map(item => item.props)).toEqual([{
        hello: 'world'
      }])
    })
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({
      action: 'added',
      item: {
        key: 'x123',
        path: '/my/stuff/x123',
        props: { hello: 'world' }
      }
    })
    sub.cancel()
    // @ts-ignore
    Collection.__Rewire__('nanoid', () => 'z987')
    await sync.add({ hello: 'moon' })
    await sync.getAll().then((items) => {
      expect(items.map(item => item.props)).toEqual([{
        hello: 'world'
      }, {
        hello: 'moon'
      }])
    })
  })

  it('should remove item', async function() {
    let item = await sync.add({ hello: 'world' })
    expect(await sync.getAllProps()).toEqual([{ hello: 'world' }])
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise(resolve => {
      handler.and.callFake(resolve)
    })
    let sub = sync.subscribe(handler)
    await sub
    expect(await sync.getCount()).toEqual(1)
    await item.remove()
    expect(await sync.getCount()).toEqual(0)
    expect(await sync.getAll()).toEqual([])
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({
      action: 'removed',
      key: 'x123'
    })
    sub.cancel()
  })

  it('should update item', async function() {
    let item = await sync.add({ hello: 'world' })
    expect(await sync.getAllProps()).toEqual([{ hello: 'world' }])
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise(resolve => {
      handler.and.callFake(resolve)
    })
    let sub = sync.subscribe(handler)
    await sub
    await item.update({ hello: 'earth' })

    expect(item.props).toEqual({ hello: 'earth' })
    expect(await sync.getAllProps()).toEqual([{
      hello: 'earth'
    }])
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({
      action: 'added',
      item: {
        key: 'x123',
        path: '/my/stuff/x123',
        props: {
          hello: 'earth'
        }
      }
    })
    sub.cancel()
  })

  it('should get and subscribe to item', async function() {
    await sync.add({ hello: 'world' })
    let item = await sync.get('x123')
    expect(item.props).toEqual({ hello: 'world' })
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise(resolve => {
      handler.and.callFake(resolve)
    })
    let sub = item.subscribe(handler)
    await sub
    await item.update({ hello: 'earth' })
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({
      hello: 'earth'
    })
    sub.cancel()
  })

  it('should initialize items sorted by key', async function(done) {
    await sync.add({ hello: 'world' })
    // @ts-ignore
    Collection.__Rewire__('nanoid', () => 'y987')
    await sync.add({ hello: 'moon' })

    const sub = sync.client.subscribe('/my/stuff/1234', (result) => {
      expect(result).toEqual([
        {
          key: 'x123',
          path: '/my/stuff/x123',
          props: {
            hello: 'world'
          }
        },
        {
          key: 'y987',
          path: '/my/stuff/y987',
          props: {
            hello: 'moon'
          }
        }
      ])
      sub.cancel()
      done()
    })

    sync.client.publish('/subscribe', {
      type: 'Collection',
      path: '/my/stuff',
      channel: '/my/stuff/1234'
    })
  })

  it('should initialize items when empty', async function(done) {
    const sub = sync.client.subscribe('/my/stuff/1234', (result) => {
      expect(result).toEqual([])
      sub.cancel()
      done()
    })

    sync.client.publish('/subscribe', {
      type: 'Collection',
      path: '/my/stuff',
      channel: '/my/stuff/1234'
    })
  })
})
