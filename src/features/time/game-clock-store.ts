import { createContext, useContext } from "react"

import type { TimeSpeed } from "@/features/time/types"

export type GameClockContextValue = {
  currentTime: Date
  speed: TimeSpeed
  setSpeed: (nextSpeed: TimeSpeed) => void
  formattedDateTime: string
}

export const GameClockContext = createContext<GameClockContextValue | undefined>(undefined)

export function useGameClock() {
  const context = useContext(GameClockContext)

  if (context === undefined) {
    throw new Error("useGameClock must be used within a GameClockProvider")
  }

  return context
}
