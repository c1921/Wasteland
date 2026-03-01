import { createContext } from "react"

import type { GameSessionStore } from "@/engine/session/game-session-store"

export const GameSessionContext = createContext<GameSessionStore | null>(null)
