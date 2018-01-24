import fetch from 'node-fetch'
import { pathSync, server } from '../helpers/helper'

describe('Item', function() {

  beforeEach(function() {
    this.sync = pathSync.item('/thing')
  })

  it('should get and set item', async function() {
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise((resolve, reject) => {
      handler.and.callFake(resolve)
    })
    let sub = this.sync.subscribe(handler)
    await sub
    await this.sync.set({ foo: 'bar' })
    await this.sync.get().then((item) => {
      expect(item).toEqual({ foo: 'bar' })
    })
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({ foo: 'bar' })
    sub.cancel()
  })

  it('should default null item to empty object', async function() {
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise((resolve, reject) => {
      handler.and.callFake(resolve)
    })
    await this.sync.get().then((item) => {
      expect(item).toEqual({})
    })
    let sub = this.sync.subscribe(handler)
    await sub
    await this.sync.set(null)
    await this.sync.get().then((item) => {
      expect(item).toEqual({})
    })
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({})
    sub.cancel()
  })

  it('should remove item', async function() {
    await this.sync.set({ foo: 'bar' })
    await this.sync.get().then((item) => {
      expect(item).toEqual({ foo: 'bar' })
    })
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise((resolve, reject) => {
      handler.and.callFake(resolve)
    })
    let sub = this.sync.subscribe(handler)
    await sub
    await this.sync.remove()
    await this.sync.get().then((item) => {
      expect(item).toEqual({})
    })
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({})
    sub.cancel()
  })

  it('should update item', async function() {
    await this.sync.set({ foo: 'bar' })
    let handler = jasmine.createSpy('handler')
    let handlerPromise = new Promise((resolve, reject) => {
      handler.and.callFake(resolve)
    })
    let sub = this.sync.subscribe(handler)
    await sub
    let item = await this.sync.update({ bing: 'bong' })
    expect(item).toEqual({ foo: 'bar', bing: 'bong' })
    await this.sync.get().then((item) => {
      expect(item).toEqual({ foo: 'bar', bing: 'bong' })
    })
    await handlerPromise
    expect(handler).toHaveBeenCalledWith({ foo: 'bar', bing: 'bong' })
    sub.cancel()
  })

  it('should GET item that exists', async function() {
    await this.sync.set({ foo: 'bar' })
    let json = await fetch(`http://localhost:${server.address().port}/item/thing`).then(res => res.json())
    expect(json).toEqual({ foo: 'bar' })
  })

  it('should GET item that does not exist', async function() {
    let json = await fetch(`http://localhost:${server.address().port}/item/thing`).then(res => res.json())
    expect(json).toEqual({})
  })

})
