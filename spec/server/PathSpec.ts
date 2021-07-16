import { pathSync, sleep } from '../helpers/helper'
import Path from '../../server/Path'

describe('Path', function() {
  let path: Path<{ hello: string }>

  beforeEach(function() {
    path = pathSync.path('/hello')
  })

  it('should subscribe and unsubscribe', async function() {
    let handler = jasmine.createSpy('handler')
    let sub = path.subscribe(handler)
    await sub
    await path.publish({ hello: 'world' })
    await sleep()
    expect(handler).toHaveBeenCalledWith({ hello: 'world' })
    expect(path.subs.size).toEqual(1)
    sub.cancel()
    expect(path.subs.size).toEqual(0)

    handler.calls.reset()
    await path.publish({ hello: 'world' })
    await sleep()
    expect(handler).not.toHaveBeenCalled()
  })

  it('should destroy subs', async function() {
    let handler = jasmine.createSpy('handler')
    let sub1 = path.subscribe(handler)
    let sub2 = path.subscribe(handler)
    spyOn(sub1, 'cancel').and.callThrough()
    spyOn(sub2, 'cancel').and.callThrough()
    expect(path.subs.size).toEqual(2)
    path.destroy()
    expect(path.subs.size).toEqual(0)
    expect(sub1.cancel).toHaveBeenCalled()
    expect(sub2.cancel).toHaveBeenCalled()
  })
})
