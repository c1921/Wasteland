import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GameClockProvider } from "@/features/time/game-clock-context"
import { useGameClock } from "@/features/time/game-clock-store"

const TEST_STORAGE_KEY = "test.gameClock"
const TEST_START_ISO = "2059-01-01T08:00:00"

function GameClockHarness() {
  const { formattedDateTime, speed, setSpeed } = useGameClock()

  return (
    <div>
      <p data-testid="time-value">{formattedDateTime}</p>
      <p data-testid="speed-value">{speed}x</p>
      <button type="button" onClick={() => setSpeed(5)}>
        set-5x
      </button>
    </div>
  )
}

describe("GameClockProvider", () => {
  beforeEach(() => {
    localStorage.clear()

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1)
    )
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn()
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("hydrates time and speed from localStorage", () => {
    const storedTime = new Date(2059, 0, 2, 9, 30).getTime()
    localStorage.setItem(
      TEST_STORAGE_KEY,
      JSON.stringify({ currentTimeMs: storedTime, speed: 10 })
    )

    render(
      <GameClockProvider storageKey={TEST_STORAGE_KEY} startIso={TEST_START_ISO}>
        <GameClockHarness />
      </GameClockProvider>
    )

    expect(screen.getByTestId("time-value").textContent).toBe("2059年01月02日 09:30")
    expect(screen.getByTestId("speed-value").textContent).toBe("10x")
  })

  it("persists speed changes to localStorage", () => {
    render(
      <GameClockProvider storageKey={TEST_STORAGE_KEY} startIso={TEST_START_ISO}>
        <GameClockHarness />
      </GameClockProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "set-5x" }))

    expect(screen.getByTestId("speed-value").textContent).toBe("5x")

    const savedRaw = localStorage.getItem(TEST_STORAGE_KEY)
    expect(savedRaw).toBeTruthy()

    const saved = JSON.parse(savedRaw as string) as {
      currentTimeMs: number
      speed: number
    }

    expect(saved.speed).toBe(5)
    expect(Number.isFinite(saved.currentTimeMs)).toBe(true)
  })
})
