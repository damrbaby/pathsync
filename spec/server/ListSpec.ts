import { pathSync } from '../helpers/helper'
import List from '../../server/List'

describe('List', function() {
  let sync: List<{ hello: string, goodbye?: string }>

  beforeEach(function() {
    sync = pathSync.list('/my/stuff')
  })

  it('should add item', async function() {
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise(resolve => {
      handler.and.callFake(resolve)
    })
    expect (await sync.has({ hello: 'world' })).toEqual(false)

    let sub = sync.subscribe(handler)
    await sub
    let item = await sync.add({
      hello: 'world'
    })

    expect(item.props).toEqual({ hello: 'world' })
    await sync.getAll().then((data) => {
      expect(data.map(item => item.props)).toEqual([
        { hello: 'world' },
      ])
    })

    expect (await sync.has({ hello: 'world' })).toEqual(true)

    await handlerPromise
    expect(handler).toHaveBeenCalledWith({
      action: 'added',
      item: { hello: 'world' }
    })
    sub.cancel()
  })

  it('should remove item', async function() {
    await sync.add({ hello: 'world' })
    await sync.add({ hello: 'earth' })

    expect (await sync.has({ hello: 'earth' })).toEqual(true)

    await sync.getAll().then((data) => {
      expect(data.map(item => item.props)).toEqual([
        { hello: 'world' },
        { hello: 'earth' }
      ])
    })
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise(resolve => {
      handler.and.callFake(resolve)
    })
    let sub = sync.subscribe(handler)
    await sub
    await sync.remove({ hello: 'earth' })
    await handlerPromise
    await sync.getAll().then((data) => {
      expect(data.map(item => item.props)).toEqual([
        { hello: 'world' }
      ])
    })
    expect (await sync.has({ hello: 'earth' })).toEqual(false)
    expect(handler).toHaveBeenCalledWith({
      action: 'removed',
      item: {
        hello: 'earth'
      }
    })
    sub.cancel()
  })

  it('should get item', async function() {
    await sync.add({ hello: 'world' })

    await sync.get({ hello: 'world' }).then((item) => {
      expect(item.props).toEqual({ hello: 'world' })
    })

    await sync.get({ hello: 'earth' }).catch((error) => {
      expect(error).toEqual(new Error('item not found'))
    })
  })

  it('should get last item', async function() {
    await sync.getLast().then((item) => {
      expect(item).toEqual(null)
    })
    await sync.add({ hello: 'world' })
    await sync.getLast().then((item) => {
      expect(item!.props).toEqual({ hello: 'world' })
    })
    await sync.add({ hello: 'earth' })
    await sync.getLast().then((item) => {
      expect(item!.props).toEqual({ hello: 'earth' })
    })
  })

  it('should set items and get count', async function() {
    expect(await sync.getCount()).toEqual(0)
    await sync.set([
      { hello: 'world' },
      { hello: 'earth' }
    ])
    expect(await sync.getCount()).toEqual(2)
    await sync.getAll().then((data) => {
      expect(data.map(item => item.props)).toEqual([
        { hello: 'world' },
        { hello: 'earth' }
      ])
    })
  })

  it('should replace items', async function() {
    await sync.add({ hello: 'world' })
    let item = await sync.add({ hello: 'earth' })
    await sync.add({ hello: 'mars' })

    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise(resolve => {
      handler.and.callFake(resolve)
    })
    let sub = sync.subscribe(handler)
    await sub
    await item.replace({ hello: 'moon' })
    expect((await sync.getAll()).map(item => item.props)).toEqual([
      { hello: 'world' },
      { hello: 'moon' },
      { hello: 'mars' }
    ])
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({
      action: 'changed',
      item: { hello: 'earth' },
      newItem: { hello: 'moon' }
    })
  })

  it('should have consistent json order', async function() {
    expect(await sync.getCount()).toEqual(0)
    await sync.add({ hello: 'world', goodbye: 'earth' })
    expect(await sync.getCount()).toEqual(1)
    await sync.remove({ goodbye: 'earth', hello: 'world' })
    expect(await sync.getCount()).toEqual(0)
  });

  it('should initialize items', async function(done) {
    await sync.add({ hello: 'world' })
    await sync.add({ hello: 'earth' })

    const sub = sync.client.subscribe('/my/stuff/1234', result => {
      expect(result).toEqual([
        { hello: 'world' },
        { hello: 'earth' }
      ])
      sub.cancel()
      done()
    })

    sync.client.publish('/subscribe', {
      type: 'List',
      path: '/my/stuff',
      channel: '/my/stuff/1234'
    })
  })

  it('should initialize items when empty', async function(done) {
    const sub = sync.client.subscribe('/my/stuff/1234', result => {
      expect(result).toEqual([])
      sub.cancel()
      done()
    })

    sync.client.publish('/subscribe', {
      type: 'List',
      path: '/my/stuff',
      channel: '/my/stuff/1234'
    })
  })
})
