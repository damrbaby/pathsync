import { pathSync, pathStream, client, sleep } from '../helpers/helper'
import CollectionStream from '../../client/CollectionStream'

describe('CollectionStream', () => {
  let stream: CollectionStream<{ hello: string }>

  beforeEach(function() {
    stream = pathStream.collection('/my/things')
  })

  afterEach(function() {
    stream.destroy()
  })

  it('should add and remove items', async function() {
    let handler = jasmine.createSpy('handler')

    await pathSync.collection('/my/things').set('123', { hello: 'world' })
    let sub = stream.subscribe(handler)
    await sleep(10)
    expect(handler.calls.count()).toEqual(1)
    expect([...handler.calls.argsFor(0)[0].values()]).toEqual([{
      key: '123',
      path: '/my/things/123',
      props: {
        hello: 'world'
      }
    }])

    handler.calls.reset()

    client.publish('/my/things', {
      action: 'added',
      item: {
        key: '456',
        path: '/my/things/456',
        props: {
          hello: 'goodbye'
        }
      }
    })

    await sleep(10)

    expect(handler.calls.count()).toEqual(1)
    expect([...handler.calls.argsFor(0)[0].values()]).toEqual([{
      key: '123',
      path: '/my/things/123',
      props: {
        hello: 'world'
      }
    }, {
      key: '456',
      path: '/my/things/456',
      props: {
        hello: 'goodbye'
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
        hello: 'goodbye'
      }
    }])

    sub.unsubscribe()
  })

  it('should queue items to add and remove', async function() {
    let handler = jasmine.createSpy('handler')

    await pathSync.collection('/my/things').set('123', { hello: 'world' })
    await pathSync.collection('/my/things').set('456', { hello: 'goodbye' })

    let sub = stream.subscribe(handler)

    expect(handler.calls.count()).toEqual(0)

    client.publish('/my/things', {
      action: 'added',
      item: {
        key: '987',
        path: '/my/things/987',
        props: {
          hello: 'moon'
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
          hello: 'mars'
        }
      }
    })

    client.publish('/my/things', {
      action: 'removed',
      key: '123'
    })

    client.publish('/my/things', {
      action: 'added',
      item: {
        key: '456',
        path: '/my/things/456',
        props: {
          hello: 'earth'
        }
      }
    })

    await sleep(10)

    expect(handler.calls.count()).toEqual(1)
    expect([...handler.calls.argsFor(0)[0].values()]).toEqual([{
      key: '456',
      path: '/my/things/456',
      props: {
        hello: 'earth'
      }
    }, {
      key: '789',
      path: '/my/things/789',
      props: {
        hello: 'mars'
      }
    }])

    handler.calls.reset()
    client.publish('/my/things', {
      action: 'added',
      item: {
        key: '456',
        path: '/my/things/456',
        props: {
          hello: 'moon'
        }
      }
    })

    await sleep(10)

    expect(handler.calls.count()).toEqual(1)
    expect([...handler.calls.argsFor(0)[0].values()]).toEqual([{
      key: '456',
      path: '/my/things/456',
      props: {
        hello: 'moon'
      }
    }, {
      key: '789',
      path: '/my/things/789',
      props: {
        hello: 'mars'
      }
    }])

    sub.unsubscribe()
  })
})
