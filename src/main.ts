interface WrappedValue<T> {
  value: T
  expiryTime?: number
}

export class KVBus {
  constructor(private persistenceAdapter?: IPersistenceAdapter) {}

  private data = new Map<string, any>()

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

    return this.unwrapValue(wrappedValue)
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

  persist() {
    if (!this.persistenceAdapter) {
      throw new Error('No persistence adapter provided')
    }

    const data = Array.from(this.data.entries())
    this.persistenceAdapter.persist(
      data.map(([k, v]) => [k, this.wrapValue(v, {})])
    )
  }

  restore() {
    if (!this.persistenceAdapter) {
      throw new Error('No persistence adapter provided')
    }

    const data = this.persistenceAdapter.restore()
    this.data = new Map(data)
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
}

export interface IPersistenceAdapter {
  persist(data: [string, any][]): void
  restore(): [string, any][]
}
