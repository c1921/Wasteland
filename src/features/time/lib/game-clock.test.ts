import { describe, expect, it } from "vitest"

import {
  advanceGameTime,
  deserializeClockState,
  formatGameDateTime,
  isValidTimeSpeed,
  serializeClockState,
} from "@/features/time/lib/game-clock"

describe("game clock utilities", () => {
  it("advances one in-game minute per real second at 1x speed", () => {
    const start = new Date(2059, 0, 1, 8, 0).getTime()
    const next = advanceGameTime(start, 1000, 1)

    expect(next - start).toBe(60_000)
  })

  it("applies fast-forward multiplier", () => {
    const start = new Date(2059, 0, 1, 8, 0).getTime()
    const next = advanceGameTime(start, 1000, 10)

    expect(next - start).toBe(600_000)
  })

  it("formats time using YYYY年MM月DD日 HH:mm", () => {
    const timeMs = new Date(2059, 0, 1, 8, 5).getTime()

    expect(formatGameDateTime(timeMs)).toBe("2059年01月01日 08:05")
  })

  it("follows Gregorian calendar leap-year rules", () => {
    const feb28 = new Date(2060, 1, 28, 23, 59).getTime()
    const nextMinute = advanceGameTime(feb28, 1000, 1)

    expect(formatGameDateTime(nextMinute)).toBe("2060年02月29日 00:00")
  })

  it("hydrates persisted state when payload is valid", () => {
    const state = deserializeClockState(
      JSON.stringify({ currentTimeMs: 123_456, speed: 5, isPaused: true }),
      1000
    )

    expect(state).toEqual({
      currentTimeMs: 123_456,
      speed: 5,
      isPaused: true,
    })
  })

  it("falls back when speed value is invalid", () => {
    const fallback = deserializeClockState(
      JSON.stringify({ currentTimeMs: 123_456, speed: 3 }),
      5000
    )

    expect(fallback).toEqual({
      currentTimeMs: 5000,
      speed: 1,
      isPaused: false,
    })
  })

  it("falls back pause state for legacy payload without isPaused", () => {
    const state = deserializeClockState(
      JSON.stringify({ currentTimeMs: 123_456, speed: 5 }),
      5000
    )

    expect(state).toEqual({
      currentTimeMs: 123_456,
      speed: 5,
      isPaused: false,
    })
  })

  it("serializes state using stable shape", () => {
    const serialized = serializeClockState({
      currentTimeMs: 1000,
      speed: 10,
      isPaused: true,
    })

    expect(serialized).toBe('{"currentTimeMs":1000,"speed":10,"isPaused":true}')
  })

  it("validates allowed speed options", () => {
    expect(isValidTimeSpeed(1)).toBe(true)
    expect(isValidTimeSpeed(5)).toBe(true)
    expect(isValidTimeSpeed(10)).toBe(true)
    expect(isValidTimeSpeed(2)).toBe(false)
  })
})
