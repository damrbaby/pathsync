import { pathSync } from '../helpers/helper'
import Item from '../../server/Item'

describe('Item', function() {
  let sync: Item<{ foo: string, bing?: string }>

  beforeEach(function() {
    sync = pathSync.item('/thing')
  })

  afterEach(function() {
    sync.destroy()
  })

  it('should get and set item', async function() {
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise(resolve => {
      handler.and.callFake(resolve)
    })
    let sub = sync.subscribe(handler)
    await sub
    await sync.set({ foo: 'bar' })
    await sync.get().then((item) => {
      expect(item).toEqual({ foo: 'bar' })
    })
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({ foo: 'bar' })
    sub.cancel()
  })

  it('should default item to null', async function() {
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise(resolve => {
      handler.and.callFake(resolve)
    })
    await sync.get().then((item) => {
      expect(item).toEqual(null)
    })
    let sub = sync.subscribe(handler)
    await sub
    await sync.save()
    await handlerPromise
    expect(handler).toHaveBeenCalledWith(null)
    sub.cancel()
  })

  it('should remove item', async function() {
    await sync.set({ foo: 'bar' })
    await sync.get().then((item) => {
      expect(item).toEqual({ foo: 'bar' })
    })
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise(resolve => {
      handler.and.callFake(resolve)
    })
    let sub = sync.subscribe(handler)
    await sub
    await sync.remove()
    await sync.get().then((item) => {
      expect(item).toEqual(null)
    })
    await handlerPromise
    expect(handler).toHaveBeenCalledWith(null)
    sub.cancel()
  })

  it('should update item', async function() {
    await sync.set({ foo: 'bar' })
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise(resolve => {
      handler.and.callFake(resolve)
    })
    let sub = sync.subscribe(handler)
    await sub
    let item = await sync.update({ bing: 'bong' })
    expect(item).toEqual({ foo: 'bar', bing: 'bong' })
    await sync.get().then((item) => {
      expect(item).toEqual({ foo: 'bar', bing: 'bong' })
    })
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({ foo: 'bar', bing: 'bong' })

    await sync.remove()
    expect(await sync.update({ bing: 'bong' })).toEqual(null)
    expect(await sync.get()).toEqual(null)

    sub.cancel()
  })

  it('should save item', async function() {
    await sync.set({ foo: 'bar' })
    expect(sync.props!.foo).toEqual('bar')

    sync.props!.foo = 'fum'

    await sync.save()
    expect(await sync.get()).toEqual({ foo: 'fum' })

    sync.props = null
    await sync.save()
    expect(await sync.get()).toEqual(null)
  })

  it('should initialize item that exists', async function(done) {
    await sync.set({ foo: 'bar' })

    const sub = sync.client.subscribe('/thing/1234', (result) => {
      expect(result).toEqual({ foo: 'bar' })
      sub.cancel()
      done()
    })

    sync.client.publish('/subscribe', {
      type: 'Item',
      path: '/thing',
      channel: '/thing/1234'
    })
  })

  it('should initialize item that does not exist', async function(done) {
    const sub = sync.client.subscribe('/thing/1234', (result) => {
      expect(result).toEqual(null)
      sub.cancel()
      done()
    })

    sync.client.publish('/subscribe', {
      type: 'Item',
      path: '/thing',
      channel: '/thing/1234'
    })
  })
})
