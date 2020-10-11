import fetch from 'node-fetch'
import { pathSync, server } from '../helpers/helper'

describe('List', function() {

  beforeEach(function() {
    this.sync = pathSync.list('/my/stuff')
  })

  it('should add item', async function() {
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise((resolve, reject) => {
      handler.and.callFake(resolve)
    })
    let sub = this.sync.subscribe(handler)
    await sub
    let item = await this.sync.add({
      foo: 'bar'
    })
    expect(item.props).toEqual({ foo: 'bar' })
    await this.sync.getAll().then((data) => {
      expect(data.map(item => item.props)).toEqual([
        { foo: 'bar' },
      ])
    })
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({
      action: 'added',
      item: { foo: 'bar' }
    })
    sub.cancel()
  })

  it('should remove item', async function() {
    await this.sync.add({ foo: 'bar' })
    await this.sync.add({ hello: 'world' })
    await this.sync.getAll().then((data) => {
      expect(data.map(item => item.props)).toEqual([
        { foo: 'bar' },
        { hello: 'world' }
      ])
    })
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise((resolve, reject) => {
      handler.and.callFake(resolve)
    })
    let sub = this.sync.subscribe(handler)
    await sub
    await this.sync.remove({ hello: 'world' })
    await handlerPromise
    await this.sync.getAll().then((data) => {
      expect(data.map(item => item.props)).toEqual([
        { foo: 'bar' }
      ])
    })
    expect(handler).toHaveBeenCalledWith({
      action: 'removed',
      item: {
        hello: 'world'
      }
    })
    sub.cancel()
  })

  it('should get item', async function() {
    await this.sync.add({ foo: 'bar' })

    await this.sync.get({ foo: 'bar' }).then((item) => {
      expect(item.props).toEqual({ foo: 'bar' })
    })

    await this.sync.get({ not: 'found' }).catch((error) => {
      expect(error).toEqual(new Error('item not found'))
    })
  })

  it('should get last item', async function() {
    await this.sync.getLast().then((item) => {
      expect(item).toEqual(null)
    })
    await this.sync.add({ foo: 'bar' })
    await this.sync.getLast().then((item) => {
      expect(item.props).toEqual({ foo: 'bar' })
    })
    await this.sync.add({ hello: 'world' })
    await this.sync.getLast().then((item) => {
      expect(item.props).toEqual({ hello: 'world' })
    })
  })

  it('should set items and get count', async function() {
    expect(await this.sync.getCount()).toEqual(0)
    await this.sync.set([
      { foo: 'bar' },
      { hello: 'world' }
    ])
    expect(await this.sync.getCount()).toEqual(2)
    await this.sync.getAll().then((data) => {
      expect(data.map(item => item.props)).toEqual([
        { foo: 'bar' },
        { hello: 'world' }
      ])
    })
  })

  it('should replace items', async function() {
    await this.sync.add({ foo: 'bar' })
    let item = await this.sync.add({ hello: 'world' })
    await this.sync.add({ baz: 'bing' })

    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise((resolve, reject) => {
      handler.and.callFake(resolve)
    })
    let sub = this.sync.subscribe(handler)
    await sub
    await item.replace({ goodbye: 'earth' })
    expect((await this.sync.getAll()).map(item => item.props)).toEqual([
      { foo: 'bar' },
      { goodbye: 'earth' },
      { baz: 'bing' }
    ])
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({
      action: 'changed',
      item: { hello: 'world' },
      newItem: { goodbye: 'earth' }
    })
  })

  it('should have consistent json order', async function() {
    expect(await this.sync.getCount()).toEqual(0)
    await this.sync.add({ foo: 'bar', x: 'abc' })
    expect(await this.sync.getCount()).toEqual(1)
    await this.sync.remove({ x: 'abc', foo: 'bar' })
    expect(await this.sync.getCount()).toEqual(0)
  });

  it('should GET items', async function() {
    await this.sync.add({ foo: 'bar' })
    await this.sync.add({ hello: 'world' })
    let json = await fetch(`http://localhost:${server.address().port}/list/my/stuff`).then(res => res.json())
    expect(json).toEqual([
      { foo: 'bar' },
      { hello: 'world' }
    ])
  })

  it('should GET items when empty', async function() {
    let json = await fetch(`http://localhost:${server.address().port}/list/my/stuff`).then(res => res.json())
    expect(json).toEqual([])
  })

})
