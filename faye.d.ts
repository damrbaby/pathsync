class FayeClient {
  publish<Payload>(path: string, payload: Payload): Promise<void>
  subscribe<Payload>(path: string, handler: (payload: Payload) => void): Subscription
}

interface FayeSubscription extends Promise<void> {
  cancel(): void
}

module 'faye' {
  export { FayeClient, FayeSubscription }

  export class NodeAdapter {
    constructor({ mount: string, timeout: number })
    getClient(): FayeClient
    attach(server: import('http').Server)
  }
}

module 'faye/src/faye_browser' {
  export class Client extends FayeClient {
    constructor(path: string, options: { timeout?: number, retry?: number })
  }
}
