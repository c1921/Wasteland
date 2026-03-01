import { useEffect, useMemo, useState } from "react"

import { GameSessionContext } from "@/engine/session/game-session-context-value"
import {
  getGameSessionStore,
  InMemoryGameSessionStore,
  setGameSessionStore,
  type GameSessionStore,
} from "@/engine/session/game-session-store"

type GameSessionProviderProps = {
  children: React.ReactNode
  store?: GameSessionStore
}

export function GameSessionProvider({ children, store }: GameSessionProviderProps) {
  const [localStore] = useState<GameSessionStore>(() => {
    return store ?? new InMemoryGameSessionStore()
  })
  const activeStore = store ?? localStore

  useEffect(() => {
    const previousStore = getGameSessionStore()
    setGameSessionStore(activeStore)

    return () => {
      setGameSessionStore(previousStore)
    }
  }, [activeStore])

  const value = useMemo(() => activeStore, [activeStore])

  return (
    <GameSessionContext.Provider value={value}>
      {children}
    </GameSessionContext.Provider>
  )
}
