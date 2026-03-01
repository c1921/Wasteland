import { useContext } from "react"

import { GameSessionContext } from "@/engine/session/game-session-context-value"
import { getGameSessionStore } from "@/engine/session/game-session-store"

export function useGameSession() {
  return useContext(GameSessionContext) ?? getGameSessionStore()
}
