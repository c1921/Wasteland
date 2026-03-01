import { beforeEach, describe, expect, it } from "vitest"

import {
  clearGameSession,
  getGameSessionStore,
  InMemoryGameSessionStore,
  resetGameSessionStore,
  restoreGameSession,
  setGameSessionStore,
  snapshotGameSession,
} from "@/engine/session/game-session-store"

describe("game session store", () => {
  beforeEach(() => {
    resetGameSessionStore()
  })

  it("stores and reads values from the active store", () => {
    const store = getGameSessionStore()

    store.set("test.key", { value: 1 })
    expect(store.get<{ value: number }>("test.key")?.value).toBe(1)

    clearGameSession()
    expect(store.get("test.key")).toBeUndefined()
  })

  it("supports snapshot and restore", () => {
    const store = getGameSessionStore()
    store.set("k1", 1)
    store.set("k2", "x")

    const snapshot = snapshotGameSession()
    store.set("k1", 2)
    store.delete("k2")

    restoreGameSession(snapshot)
    expect(store.get<number>("k1")).toBe(1)
    expect(store.get<string>("k2")).toBe("x")
  })

  it("allows replacing active store and resetting back to default", () => {
    const custom = new InMemoryGameSessionStore()
    setGameSessionStore(custom)

    getGameSessionStore().set("custom", true)
    expect(custom.get<boolean>("custom")).toBe(true)

    resetGameSessionStore()
    expect(getGameSessionStore()).not.toBe(custom)
  })
})
