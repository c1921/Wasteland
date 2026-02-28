import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GameClockProvider } from "@/features/time/game-clock-context"
import { useGameClock } from "@/features/time/game-clock-store"

const TEST_STORAGE_KEY = "test.gameClock"
const TEST_START_ISO = "2059-01-01T08:00:00"

function GameClockHarness() {
  const { formattedDateTime, isPaused, speed, setSpeed, togglePause } = useGameClock()

  return (
    <div>
      <p data-testid="time-value">{formattedDateTime}</p>
      <p data-testid="speed-value">{speed}x</p>
      <p data-testid="pause-value">{String(isPaused)}</p>
      <button type="button" onClick={() => setSpeed(5)}>
        set-5x
      </button>
      <button type="button" onClick={togglePause}>
        toggle-pause
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
      JSON.stringify({ currentTimeMs: storedTime, speed: 10, isPaused: true })
    )

    render(
      <GameClockProvider storageKey={TEST_STORAGE_KEY} startIso={TEST_START_ISO}>
        <GameClockHarness />
      </GameClockProvider>
    )

    expect(screen.getByTestId("time-value").textContent).toBe("2059年01月02日 09:30")
    expect(screen.getByTestId("speed-value").textContent).toBe("10x")
    expect(screen.getByTestId("pause-value").textContent).toBe("true")
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
      isPaused: boolean
    }

    expect(saved.speed).toBe(5)
    expect(saved.isPaused).toBe(false)
    expect(Number.isFinite(saved.currentTimeMs)).toBe(true)
  })

  it("persists pause toggles to localStorage", () => {
    render(
      <GameClockProvider storageKey={TEST_STORAGE_KEY} startIso={TEST_START_ISO}>
        <GameClockHarness />
      </GameClockProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "toggle-pause" }))

    expect(screen.getByTestId("pause-value").textContent).toBe("true")

    const savedRaw = localStorage.getItem(TEST_STORAGE_KEY)
    expect(savedRaw).toBeTruthy()

    const saved = JSON.parse(savedRaw as string) as {
      currentTimeMs: number
      speed: number
      isPaused: boolean
    }

    expect(saved.isPaused).toBe(true)
    expect(saved.speed).toBe(1)
    expect(Number.isFinite(saved.currentTimeMs)).toBe(true)
  })
})
