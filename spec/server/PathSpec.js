import { pathSync, sleep } from '../helpers/helper'

describe('Path', function() {
  beforeEach(function() {
    this.path = pathSync.path('/hello')
  })

  it('should subscribe and unsubscribe', async function() {
    let handler = jasmine.createSpy('handler')
    let sub = this.path.subscribe(handler)
    await sub
    await this.path.publish('ding')
    await sleep()
    expect(handler).toHaveBeenCalledWith('ding')
    expect(this.path.subs.size).toEqual(1)
    sub.cancel()
    expect(this.path.subs.size).toEqual(0)

    handler.calls.reset()
    await this.path.publish('ding')
    await sleep()
    expect(handler).not.toHaveBeenCalled()
  })

  it('should destroy subs', async function() {
    let handler = jasmine.createSpy('handler')
    let sub1 = this.path.subscribe(handler)
    let sub2 = this.path.subscribe(handler)
    spyOn(sub1, 'cancel').and.callThrough()
    spyOn(sub2, 'cancel').and.callThrough()
    expect(this.path.subs.size).toEqual(2)
    this.path.destroy()
    expect(this.path.subs.size).toEqual(0)
    expect(sub1.cancel).toHaveBeenCalled()
    expect(sub2.cancel).toHaveBeenCalled()
  })

})
