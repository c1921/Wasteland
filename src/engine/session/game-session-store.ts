export type GameSessionSnapshot = ReadonlyMap<string, unknown>

export interface GameSessionStore {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  delete(key: string): void
  clear(): void
  snapshot(): GameSessionSnapshot
  restore(snapshot: GameSessionSnapshot): void
}

export class InMemoryGameSessionStore implements GameSessionStore {
  private state = new Map<string, unknown>()

  get<T>(key: string): T | undefined {
    return this.state.get(key) as T | undefined
  }

  set<T>(key: string, value: T) {
    this.state.set(key, value)
  }

  delete(key: string) {
    this.state.delete(key)
  }

  clear() {
    this.state.clear()
  }

  snapshot(): GameSessionSnapshot {
    return new Map(this.state)
  }

  restore(snapshot: GameSessionSnapshot) {
    this.state = new Map(snapshot)
  }
}

const defaultStore = new InMemoryGameSessionStore()
let activeStore: GameSessionStore = defaultStore

export function getGameSessionStore() {
  return activeStore
}

export function setGameSessionStore(nextStore: GameSessionStore) {
  activeStore = nextStore
}

export function resetGameSessionStore() {
  defaultStore.clear()
  activeStore = defaultStore
}

export function clearGameSession() {
  activeStore.clear()
}

export function snapshotGameSession() {
  return activeStore.snapshot()
}

export function restoreGameSession(snapshot: GameSessionSnapshot) {
  activeStore.restore(snapshot)
}
