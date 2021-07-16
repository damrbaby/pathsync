import { pathSync, pathStream, client, sleep } from '../helpers/helper'
import ItemStream from '../../client/ItemStream'

describe('ItemStream', () => {
  let stream: ItemStream<{ hello: 'world' }>

  beforeEach(function() {
    stream = pathStream.item('/my/thing')
  })

  afterEach(function() {
    stream.destroy()
  })

  it('should subscribe to item', async function() {
    let handler = jasmine.createSpy('handler')
    let sub = stream.subscribe(handler)
    await sleep(10)
    client.publish('/my/thing', { hello: 'world' })
    await sleep(10)
    expect(handler.calls.count()).toEqual(2)
    expect(handler.calls.allArgs()).toEqual([
      [null],
      [{ hello: 'world' }]
    ])
    sub.unsubscribe()
  })

  it('should pull from server then push update', async function() {
    let handler = jasmine.createSpy('handler')

    await pathSync.item('/my/thing').set({ hello: 'world' })
    let sub = stream.subscribe(handler)
    await sleep(10)
    expect(handler.calls.count()).toEqual(1)
    expect(handler).toHaveBeenCalledWith({ hello: 'world' })

    handler.calls.reset()
    client.publish('/my/thing', { hello: 'moon' })
    await sleep(10)
    expect(handler.calls.count()).toEqual(1)
    expect(handler).toHaveBeenCalledWith({ hello: 'moon' })
    sub.unsubscribe()
  })

  it('should use newer item over server response', async function() {
    let handler = jasmine.createSpy('handler')
    let sub = stream.subscribe(handler)

    client.publish('/my/thing', { hello: 'world' })
    await sleep(10)

    client.publish('/my/thing', { hello: 'earth' })
    await sleep(10)

    expect(handler.calls.count()).toEqual(2)
    expect(handler.calls.allArgs()).toEqual([
      [{ hello: 'world' }],
      [{ hello: 'earth' }]
    ])
    sub.unsubscribe()
  })
})
