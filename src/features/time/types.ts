export const TIME_SPEED_OPTIONS = [1, 5, 10] as const

export type TimeSpeed = (typeof TIME_SPEED_OPTIONS)[number]

export type GameClockState = {
  currentTimeMs: number
  speed: TimeSpeed
}

export const DEFAULT_TIME_SPEED: TimeSpeed = 1
export const GAME_START_ISO = "2059-01-01T08:00:00"
export const CLOCK_STORAGE_KEY = "wasteland.gameClock.v1"
