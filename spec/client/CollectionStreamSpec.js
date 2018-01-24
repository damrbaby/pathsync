import fetchMock from 'fetch-mock'
import { pathStream, client, sleep } from '../helpers/helper'

describe('CollectionStream', () => {
  beforeEach(function() {
    this.stream = pathStream.collection('/my/things')
  })

  afterEach(function() {
    this.stream.destroy()
    fetchMock.restore()
  })

  it('should add and remove items', async function() {
    let handler = jasmine.createSpy('handler')
    fetchMock.get('http://example.com/collection/my/things', [{
        key: '123',
        path: '/my/things/123',
        props: {
          foo: 'bar'
        }
      }]
    )
    let sub = this.stream.subscribe(handler)
    await sleep(10)
    expect(handler.calls.count()).toEqual(1)
    expect([...handler.calls.argsFor(0)[0].values()]).toEqual([{
      key: '123',
      path: '/my/things/123',
      props: {
        foo: 'bar'
      }
    }])

    handler.calls.reset()

    client.publish('/my/things', {
      action: 'added',
      item: {
        key: '456',
        path: '/my/things/456',
        props: {
          hello: 'world'
        }
      }
    })

    await sleep(10)

    expect(handler.calls.count()).toEqual(1)
    expect([...handler.calls.argsFor(0)[0].values()]).toEqual([{
      key: '123',
      path: '/my/things/123',
      props: {
        foo: 'bar'
      }
    }, {
      key: '456',
      path: '/my/things/456',
      props: {
        hello: 'world'
      }
    }])

    handler.calls.reset()

    client.publish('/my/things', {
      action: 'removed',
      key: '123'
    })

    await sleep(10)

    expect(handler.calls.count()).toEqual(1)
    expect([...handler.calls.argsFor(0)[0].values()]).toEqual([{
      key: '456',
      path: '/my/things/456',
      props: {
        hello: 'world'
      }
    }])

    sub.dispose()
  })

  it('should queue items to add and remove', async function() {
    let handler = jasmine.createSpy('handler')
    fetchMock.get('http://example.com/collection/my/things', async () => {
      await sleep(50)
      return [{
        key: '123',
        path: '/my/things/123',
        props: {
          foo: 'bar'
        }
      }, {
        key: '456',
        path: '/my/things/456',
        props: {
          hello: 'world'
        }
      }]
    })

    let sub = this.stream.subscribe(handler)
    await sleep(10)

    expect(handler.calls.count()).toEqual(0)

    client.publish('/my/things', {
      action: 'added',
      item: {
        key: '987',
        path: '/my/things/987',
        props: {
          hello: 'world'
        }
      }
    })

    client.publish('/my/things', {
      action: 'removed',
      key: '987'
    })

    client.publish('/my/things', {
      action: 'added',
      item: {
        key: '789',
        path: '/my/things/789',
        props: {
          bing: 'bong'
        }
      }
    })

    client.publish('/my/things', {
      action: 'removed',
      key: '123'
    })

    await sleep(100)

    expect(handler.calls.count()).toEqual(1)
    expect([...handler.calls.argsFor(0)[0].values()]).toEqual([{
      key: '456',
      path: '/my/things/456',
      props: {
        hello: 'world'
      }
    }, {
      key: '789',
      path: '/my/things/789',
      props: {
        bing: 'bong'
      }
    }])

    sub.dispose()
  })
})
