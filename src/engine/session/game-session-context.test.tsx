import { useEffect } from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import {
  GameSessionProvider,
} from "@/engine/session/game-session-context"
import {
  getGameSessionStore,
  InMemoryGameSessionStore,
} from "@/engine/session/game-session-store"
import { useGameSession } from "@/engine/session/use-game-session"

function Probe({ onStoreResolved }: { onStoreResolved: (store: unknown) => void }) {
  const store = useGameSession()

  useEffect(() => {
    onStoreResolved(store)
  }, [onStoreResolved, store])

  return null
}

describe("game session context", () => {
  afterEach(() => {
    cleanup()
  })

  it("uses global active store when provider is missing", () => {
    let resolved: unknown = null
    const current = getGameSessionStore()

    render(
      <Probe
        onStoreResolved={(store) => {
          resolved = store
        }}
      />
    )

    expect(resolved).toBe(current)
  })

  it("binds injected store while provider is mounted", () => {
    let resolved: unknown = null
    const previous = getGameSessionStore()
    const injected = new InMemoryGameSessionStore()

    const view = render(
      <GameSessionProvider store={injected}>
        <Probe
          onStoreResolved={(store) => {
            resolved = store
          }}
        />
      </GameSessionProvider>
    )

    expect(resolved).toBe(injected)
    expect(getGameSessionStore()).toBe(injected)

    view.unmount()
    expect(getGameSessionStore()).toBe(previous)
  })
})
