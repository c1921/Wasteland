import { useCallback, useEffect, useRef, useState } from "react"

import {
  BATTLE_TICK_MS,
  MAX_TICKS_PER_FRAME,
  createSampleBattleState,
  engineTick,
} from "@/features/battle/lib/engine"
import { useGameClock } from "@/features/time/game-clock-store"

export function useAutoBattle() {
  const { speed, isPaused = false } = useGameClock()
  const [state, setState] = useState(() => createSampleBattleState())
  const [isRunning, setIsRunning] = useState(false)
  const rafIdRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const accumulatorRef = useRef(0)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const stopBattle = useCallback(() => {
    setIsRunning(false)
  }, [])

  const startBattle = useCallback(() => {
    if (stateRef.current.phase === "ended") {
      return
    }

    setIsRunning(true)
  }, [])

  const resetBattle = useCallback(() => {
    setIsRunning(false)
    accumulatorRef.current = 0
    lastTimestampRef.current = null
    const nextState = createSampleBattleState()
    stateRef.current = nextState
    setState(nextState)
  }, [])

  useEffect(() => {
    if (!isRunning) {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      lastTimestampRef.current = null
      return
    }

    const step = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp
        rafIdRef.current = window.requestAnimationFrame(step)
        return
      }

      const deltaRealMs = Math.max(0, timestamp - lastTimestampRef.current)
      lastTimestampRef.current = timestamp

      if (!isPaused && speed > 0) {
        accumulatorRef.current += deltaRealMs * speed
        const ticksToProcess = Math.min(
          MAX_TICKS_PER_FRAME,
          Math.floor(accumulatorRef.current / BATTLE_TICK_MS)
        )

        if (ticksToProcess > 0) {
          accumulatorRef.current -= ticksToProcess * BATTLE_TICK_MS
          let nextState = stateRef.current

          for (let i = 0; i < ticksToProcess; i += 1) {
            if (nextState.phase === "ended") {
              break
            }

            nextState = engineTick(nextState)
          }

          if (nextState !== stateRef.current) {
            stateRef.current = nextState
            setState(nextState)
          }

          if (nextState.phase === "ended") {
            setIsRunning(false)
            accumulatorRef.current = 0
            return
          }
        }
      }

      rafIdRef.current = window.requestAnimationFrame(step)
    }

    rafIdRef.current = window.requestAnimationFrame(step)

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isPaused, isRunning, speed])

  return {
    state,
    isRunning,
    startBattle,
    stopBattle,
    resetBattle,
  }
}
