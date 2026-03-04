import {
  DEFAULT_IS_PAUSED,
  DEFAULT_TIME_SPEED,
  TIME_SPEED_OPTIONS,
  type GameClockState,
  type TimeSpeed,
} from "@/features/time/types"

export const REAL_MS_PER_GAME_HOUR = 500
export const GAME_MS_PER_REAL_MS = 3600000 / REAL_MS_PER_GAME_HOUR

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

export function isValidTimeSpeed(value: unknown): value is TimeSpeed {
  if (typeof value !== "number") {
    return false
  }

  return TIME_SPEED_OPTIONS.includes(value as TimeSpeed)
}

export function toGameMsFromRealMs(deltaRealMs: number, speed: TimeSpeed) {
  const safeDeltaRealMs = Number.isFinite(deltaRealMs) ? Math.max(0, deltaRealMs) : 0
  return Math.floor(safeDeltaRealMs * GAME_MS_PER_REAL_MS * speed)
}

export function advanceGameTime(
  currentTimeMs: number,
  deltaRealMs: number,
  speed: TimeSpeed
) {
  return currentTimeMs + toGameMsFromRealMs(deltaRealMs, speed)
}

export function formatGameDurationFromElapsedSec(elapsedSec: number) {
  const safeElapsedSec = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0
  const totalMinutes = Math.floor(safeElapsedSec * (GAME_MS_PER_REAL_MS / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }

  return `${minutes}分钟`
}

export function formatGameDateTime(timeMs: number) {
  const date = new Date(timeMs)

  return `${date.getFullYear()}年${pad2(date.getMonth() + 1)}月${pad2(date.getDate())}日 ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function serializeClockState(state: GameClockState) {
  return JSON.stringify({
    currentTimeMs: Math.floor(state.currentTimeMs),
    speed: state.speed,
    isPaused: state.isPaused,
  })
}

export function deserializeClockState(
  raw: string | null,
  fallbackTimeMs: number,
  fallbackSpeed: TimeSpeed = DEFAULT_TIME_SPEED,
  fallbackPaused: boolean = DEFAULT_IS_PAUSED
): GameClockState {
  if (!raw) {
    return {
      currentTimeMs: fallbackTimeMs,
      speed: fallbackSpeed,
      isPaused: fallbackPaused,
    }
  }

  try {
    const parsed = JSON.parse(raw) as {
      currentTimeMs?: unknown
      speed?: unknown
      isPaused?: unknown
    }

    const currentTimeMs = Number(parsed.currentTimeMs)
    const speed = parsed.speed
    const isPaused =
      typeof parsed.isPaused === "boolean" ? parsed.isPaused : fallbackPaused

    if (!Number.isFinite(currentTimeMs) || !isValidTimeSpeed(speed)) {
      return {
        currentTimeMs: fallbackTimeMs,
        speed: fallbackSpeed,
        isPaused: fallbackPaused,
      }
    }

    return {
      currentTimeMs: Math.floor(currentTimeMs),
      speed,
      isPaused,
    }
  } catch {
    return {
      currentTimeMs: fallbackTimeMs,
      speed: fallbackSpeed,
      isPaused: fallbackPaused,
    }
  }
}

export function resolveStartTimeMs(startIso: string, defaultIso: string) {
  const requested = Date.parse(startIso)

  if (Number.isFinite(requested)) {
    return requested
  }

  const fallback = Date.parse(defaultIso)
  return Number.isFinite(fallback) ? fallback : Date.now()
}
