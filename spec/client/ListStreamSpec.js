import fetchMock from 'fetch-mock'
import { pathStream, client, sleep } from '../helpers/helper'

describe('ListStream', () => {
  beforeEach(function() {
    this.stream = pathStream.list('/my/things')
  })

  afterEach(function() {
    this.stream.destroy()
    fetchMock.restore()
  })

  it('should add, remove, and change items', async function() {
    let addedHandler = jasmine.createSpy('addedHandler')
    let removedHandler = jasmine.createSpy('removedHandler')
    let changedHandler = jasmine.createSpy('changedHandler')
    let valueHandler = jasmine.createSpy('valueHandler')

    fetchMock.get('http://example.com/list/my/things', [
      { id: '1' },
      { id: '2' }
    ])

    let subs = []
    subs.push(this.stream.subscribe('value', valueHandler))
    subs.push(this.stream.subscribe('added', addedHandler))
    subs.push(this.stream.subscribe('removed', removedHandler))
    subs.push(this.stream.subscribe('changed', changedHandler))

    await sleep(10)

    expect(addedHandler.calls.count()).toEqual(2)
    expect(valueHandler.calls.count()).toEqual(1)
    expect(removedHandler.calls.count()).toEqual(0)
    expect(changedHandler.calls.count()).toEqual(0)

    expect(addedHandler.calls.allArgs()).toEqual([
      [{ id: '1' }],
      [{ id: '2' }]
    ])

    expect(valueHandler).toHaveBeenCalledWith([
      { id: '1' },
      { id: '2' }
    ])

    addedHandler.calls.reset()
    valueHandler.calls.reset()

    client.publish('/my/things', {
      action: 'added',
      item: { id: '3' }
    })

    client.publish('/my/things', {
      action: 'removed',
      item: { id: '2' }
    })

    client.publish('/my/things', {
      action: 'changed',
      item: { id: '1' },
      newItem: { id: '7' }
    })

    await sleep(10)

    expect(addedHandler.calls.count()).toEqual(1)
    expect(removedHandler.calls.count()).toEqual(1)
    expect(changedHandler.calls.count()).toEqual(1)
    expect(valueHandler.calls.count()).toEqual(3)

    expect(addedHandler.calls.allArgs()).toEqual([
      [{ id: '3' }]
    ])

    expect(removedHandler.calls.allArgs()).toEqual([
      [{ id: '2' }]
    ])

    expect(changedHandler.calls.allArgs()).toEqual([
      [{ id: '7' }]
    ])

    expect(valueHandler.calls.allArgs()).toEqual([
      [[
        { id: '1' },
        { id: '2' },
        { id: '3' }
      ]], [[
        { id: '1' },
        { id: '3' }
      ]], [[
        { id: '7' },
        { id: '3' }
      ]]]
    )

    for (let sub of subs) {
      sub.unsubscribe()
    }
  })

  it('should queue items to add, remove, and change', async function() {
    let addedHandler = jasmine.createSpy('addedHandler')
    let removedHandler = jasmine.createSpy('removedHandler')
    let valueHandler = jasmine.createSpy('valueHandler')

    fetchMock.get('http://example.com/list/my/things', async () => {
      await sleep(50)
      return [
        { id: '1' },
        { id: '2' }
      ]
    })

    let subs = []
    subs.push(this.stream.subscribe('value', valueHandler))
    subs.push(this.stream.subscribe('added', addedHandler))
    subs.push(this.stream.subscribe('removed', removedHandler))

    await sleep(10)

    expect(addedHandler.calls.count()).toEqual(0)
    expect(removedHandler.calls.count()).toEqual(0)
    expect(valueHandler.calls.count()).toEqual(0)

    client.publish('/my/things', {
      action: 'added',
      item: { id: '3' }
    })

    client.publish('/my/things', {
      action: 'removed',
      item: { id: '2' }
    })

    // redundant add
    client.publish('/my/things', {
      action: 'added',
      item: { id: '1' }
    })

    client.publish('/my/things', {
      action: 'changed',
      item: { id: '1' },
      newItem: { id: '7' }
    })

    // was removed
    client.publish('/my/things', {
      action: 'changed',
      item: { id: '2' },
      newItem: { id: '99' }
    })

    // no longer exists
    client.publish('/my/things', {
      action: 'removed',
      item: { id: '100' }
    })

    await sleep(100)

    expect(addedHandler.calls.count()).toEqual(2)
    expect(removedHandler.calls.count()).toEqual(0)
    expect(valueHandler.calls.count()).toEqual(1)

    expect(addedHandler.calls.allArgs()).toEqual([
      [{ id: '7' }],
      [{ id: '3' }]
    ])

    expect(valueHandler).toHaveBeenCalledWith([
      { id: '7' },
      { id: '3' }
    ])

    for (let sub of subs) {
      sub.unsubscribe()
    }
  })

})
