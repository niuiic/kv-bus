export interface WrappedValue<T> {
  value: T
  expiryTime?: number
}

export class KVBus {
  private cleanTask: undefined | number
  private persistenceAdapter: IPersistenceAdapter | undefined

  constructor(
    {
      clearInterval,
      persistenceAdapter
    }: { clearInterval?: number; persistenceAdapter?: IPersistenceAdapter } = {
      clearInterval: 6e4
    }
  ) {
    this.persistenceAdapter = persistenceAdapter
    this.cleanTask = setInterval(() => this.clean(), clearInterval)
  }

  private data = new Map<string, WrappedValue<unknown>>()

  set<T>(
    key: string,
    value: T,
    { override, lifetime }: { override?: boolean; lifetime?: number } = {}
  ) {
    if (this.has(key) && !override) {
      throw new Error(`Key ${key} already exists`)
    }
    this.data.set(
      key,
      this.wrapValue(value, {
        expiryTime: lifetime ? Date.now() + lifetime : undefined
      })
    )
  }

  get<T>(key: string): T {
    const wrappedValue = this.data.get(key)

    if (!wrappedValue) {
      throw new Error(`Key ${key} does not exist`)
    }

    try {
      this.validateKey(key, wrappedValue)
    } catch (e) {
      this.data.delete(key)
      throw e
    }

    return this.unwrapValue(wrappedValue) as T
  }

  has(key: string) {
    const wrappedValue = this.data.get(key)

    if (!wrappedValue) {
      return false
    }

    try {
      this.validateKey(key, wrappedValue)
    } catch {
      this.data.delete(key)
      return false
    }

    return true
  }

  delete(key: string) {
    this.data.delete(key)
  }

  transaction(fn: () => void) {
    const backup = new Map(this.data)
    try {
      fn()
    } catch (e) {
      this.data = backup
      throw e
    }
  }

  persist() {
    if (!this.persistenceAdapter) {
      throw new Error('No persistence adapter provided')
    }

    const data = Array.from(this.data.entries())
    this.persistenceAdapter.persist(data)
  }

  restore() {
    if (!this.persistenceAdapter) {
      throw new Error('No persistence adapter provided')
    }

    const data = this.persistenceAdapter.restore()
    this.data = new Map(data)
  }

  dispose() {
    this.data = new Map()
    this.persistenceAdapter = undefined
    clearInterval(this.cleanTask)
  }

  private wrapValue<T>(
    value: T,
    options: Omit<WrappedValue<T>, 'value'>
  ): WrappedValue<T> {
    return {
      value,
      ...options
    }
  }

  private unwrapValue<T>(wrappedValue: WrappedValue<T>) {
    return wrappedValue.value
  }

  private validateKey(key: string, wrappedValue: WrappedValue<any>) {
    if (wrappedValue.expiryTime && wrappedValue.expiryTime < Date.now()) {
      throw new Error(`Key ${key} has expired`)
    }
  }

  private clean() {
    this.data.entries().forEach(([k, v]) => {
      try {
        this.validateKey(k, v)
      } catch {
        this.data.delete(k)
      }
    })
  }
}

export interface IPersistenceAdapter {
  persist(data: [string, WrappedValue<unknown>][]): void
  restore(): [string, WrappedValue<unknown>][]
}
