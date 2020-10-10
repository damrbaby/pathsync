import fetchMock from 'fetch-mock'
import { pathStream, client, sleep } from '../helpers/helper'

describe('ItemStream', () => {

  beforeEach(function() {
    this.stream = pathStream.item('/my/thing')
  })

  afterEach(function() {
    this.stream.destroy()
    fetchMock.restore()
  })

  it('should subscribe to item', async function() {
    let handler = jasmine.createSpy('handler')
    fetchMock.get('http://example.com/item/my/thing', {})
    let sub = this.stream.subscribe(handler)
    await sleep()
    client.publish('/my/thing', { foo: 'bar' })
    await sleep(10)
    expect(handler.calls.count()).toEqual(2)
    expect(handler.calls.allArgs()).toEqual([
      [{}],
      [{ foo: 'bar' }]
    ])
    sub.unsubscribe()
  })

  it('should pull from server then push update', async function() {
    let handler = jasmine.createSpy('handler')
    fetchMock.get('http://example.com/item/my/thing', { foo: 'bar' })
    let sub = this.stream.subscribe(handler)
    await sleep(10)
    expect(handler.calls.count()).toEqual(1)
    expect(handler).toHaveBeenCalledWith({ foo: 'bar' })

    handler.calls.reset()
    client.publish('/my/thing', { hello: 'world' })
    await sleep(10)
    expect(handler.calls.count()).toEqual(1)
    expect(handler).toHaveBeenCalledWith({ hello: 'world' })
    sub.unsubscribe()
  })

  it('should use newer item over server response', async function() {
    let handler = jasmine.createSpy('handler')
    fetchMock.get('http://example.com/item/my/thing', async () => {
      await sleep(50)
      return { foo: 'bar' }
    })
    let sub = this.stream.subscribe(handler)
    await sleep(10)
    client.publish('/my/thing', { hello: 'world' })
    await sleep(20)
    client.publish('/my/thing', { latest: 'update' })
    await sleep(100)
    expect(handler.calls.count()).toEqual(2)
    expect(handler.calls.allArgs()).toEqual([
      [{ hello: 'world' }],
      [{ latest: 'update' }]
    ])
    sub.unsubscribe()
  })

})
