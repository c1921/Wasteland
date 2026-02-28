import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  advanceGameTime,
  deserializeClockState,
  formatGameDateTime,
  resolveStartTimeMs,
  serializeClockState,
} from "@/features/time/lib/game-clock"
import {
  CLOCK_STORAGE_KEY,
  DEFAULT_TIME_SPEED,
  GAME_START_ISO,
  type GameClockState,
  type TimeSpeed,
} from "@/features/time/types"
import { GameClockContext, type GameClockContextValue } from "@/features/time/game-clock-store"

type GameClockProviderProps = {
  children: React.ReactNode
  storageKey?: string
  startIso?: string
}

const FRAME_DELTA_CAP_MS = 1000
const PERSIST_INTERVAL_MS = 1000

function readInitialClockState(storageKey: string, startTimeMs: number): GameClockState {
  if (typeof window === "undefined") {
    return {
      currentTimeMs: startTimeMs,
      speed: DEFAULT_TIME_SPEED,
    }
  }

  return deserializeClockState(
    window.localStorage.getItem(storageKey),
    startTimeMs,
    DEFAULT_TIME_SPEED
  )
}

export function GameClockProvider({
  children,
  storageKey = CLOCK_STORAGE_KEY,
  startIso = GAME_START_ISO,
}: GameClockProviderProps) {
  const startTimeMs = useMemo(() => resolveStartTimeMs(startIso, GAME_START_ISO), [startIso])
  const [clockState, setClockState] = useState<GameClockState>(
    () => readInitialClockState(storageKey, startTimeMs)
  )
  const rafIdRef = useRef<number | null>(null)
  const lastFrameTimestampRef = useRef<number | null>(null)
  const lastPersistTimestampRef = useRef(0)
  const lastPublishedMinuteRef = useRef(Math.floor(clockState.currentTimeMs / 60000))
  const currentTimeMsRef = useRef(clockState.currentTimeMs)
  const speedRef = useRef(clockState.speed)

  const persistClock = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }

    window.localStorage.setItem(
      storageKey,
      serializeClockState({
        currentTimeMs: currentTimeMsRef.current,
        speed: speedRef.current,
      })
    )
  }, [storageKey])

  const publishClockState = useCallback(() => {
    setClockState({
      currentTimeMs: Math.floor(currentTimeMsRef.current),
      speed: speedRef.current,
    })
  }, [])

  const setSpeed = useCallback((nextSpeed: TimeSpeed) => {
    if (speedRef.current === nextSpeed) {
      return
    }

    speedRef.current = nextSpeed
    lastPublishedMinuteRef.current = Math.floor(currentTimeMsRef.current / 60000)
    publishClockState()
    persistClock()
  }, [persistClock, publishClockState])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const tick = (timestamp: number) => {
      if (lastFrameTimestampRef.current !== null) {
        const deltaRealMs = Math.min(
          Math.max(0, timestamp - lastFrameTimestampRef.current),
          FRAME_DELTA_CAP_MS
        )

        if (deltaRealMs > 0) {
          currentTimeMsRef.current = advanceGameTime(
            currentTimeMsRef.current,
            deltaRealMs,
            speedRef.current
          )

          const nextMinute = Math.floor(currentTimeMsRef.current / 60000)

          if (nextMinute !== lastPublishedMinuteRef.current) {
            lastPublishedMinuteRef.current = nextMinute
            publishClockState()
          }
        }

        if (timestamp - lastPersistTimestampRef.current >= PERSIST_INTERVAL_MS) {
          persistClock()
          lastPersistTimestampRef.current = timestamp
        }
      } else {
        lastPersistTimestampRef.current = timestamp
      }

      lastFrameTimestampRef.current = timestamp
      rafIdRef.current = window.requestAnimationFrame(tick)
    }

    rafIdRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }

      persistClock()
    }
  }, [persistClock, publishClockState])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    window.addEventListener("beforeunload", persistClock)

    return () => {
      window.removeEventListener("beforeunload", persistClock)
    }
  }, [persistClock])

  const value = useMemo<GameClockContextValue>(() => {
    const currentTime = new Date(clockState.currentTimeMs)

    return {
      currentTime,
      speed: clockState.speed,
      setSpeed,
      formattedDateTime: formatGameDateTime(clockState.currentTimeMs),
    }
  }, [clockState.currentTimeMs, clockState.speed, setSpeed])

  return (
    <GameClockContext.Provider value={value}>
      {children}
    </GameClockContext.Provider>
  )
}
