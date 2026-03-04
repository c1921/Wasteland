import { createContext, useContext } from "react"

import type { TimeSpeed } from "@/features/time/types"

export type GameClockControlsValue = {
  speed: TimeSpeed
  isPaused: boolean
  setSpeed: (nextSpeed: TimeSpeed) => void
  setPaused: (nextPaused: boolean) => void
  togglePause: () => void
}

export type GameClockContextValue = GameClockControlsValue & {
  currentTime: Date
  formattedDateTime: string
}

export const GameClockContext = createContext<GameClockContextValue | undefined>(undefined)
export const GameClockControlsContext =
  createContext<GameClockControlsValue | undefined>(undefined)

export function useGameClock() {
  const context = useContext(GameClockContext)

  if (context === undefined) {
    throw new Error("useGameClock must be used within a GameClockProvider")
  }

  return context
}

export function useGameClockControls() {
  const context = useContext(GameClockControlsContext)

  if (context === undefined) {
    throw new Error("useGameClockControls must be used within a GameClockProvider")
  }

  return context
}
