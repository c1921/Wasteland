import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useAutoBattle } from "@/features/battle/hooks/use-auto-battle"

const useGameClockMock = vi.fn()

vi.mock("@/features/time/game-clock-store", () => ({
  useGameClock: () => useGameClockMock(),
}))

type ClockState = {
  speed: number
  isPaused: boolean
}

function AutoBattleHarness() {
  const { state, isRunning, startBattle, stopBattle, resetBattle } = useAutoBattle()

  return (
    <div>
      <p data-testid="tick">{state.tickCount}</p>
      <p data-testid="phase">{state.phase}</p>
      <p data-testid="running">{String(isRunning)}</p>
      <button type="button" onClick={startBattle}>
        start
      </button>
      <button type="button" onClick={stopBattle}>
        stop
      </button>
      <button type="button" onClick={resetBattle}>
        reset
      </button>
    </div>
  )
}

describe("useAutoBattle", () => {
  let rafNow = 0
  let rafId = 1
  let clockState: ClockState
  let callbacks = new Map<number, FrameRequestCallback>()

  function setupClockState(speed = 1, isPaused = false) {
    clockState = { speed, isPaused }
    useGameClockMock.mockImplementation(() => clockState)
  }

  function stepRaf(deltaMs: number) {
    act(() => {
      const snapshot = Array.from(callbacks.entries())
      callbacks = new Map()
      rafNow += deltaMs

      for (const [, callback] of snapshot) {
        callback(rafNow)
      }
    })
  }

  beforeEach(() => {
    useGameClockMock.mockReset()
    setupClockState()
    rafNow = 0
    rafId = 1
    callbacks = new Map()

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        const id = rafId
        rafId += 1
        callbacks.set(id, callback)
        return id
      })
    )
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((id: number) => {
        callbacks.delete(id)
      })
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("does not advance ticks while paused", () => {
    setupClockState(10, true)
    render(<AutoBattleHarness />)

    fireEvent.click(screen.getByRole("button", { name: "start" }))
    stepRaf(0)
    stepRaf(1000)
    stepRaf(1000)

    expect(screen.getByTestId("running").textContent).toBe("true")
    expect(screen.getByTestId("tick").textContent).toBe("0")
  })

  it("advances faster when speed is increased", () => {
    const { rerender } = render(<AutoBattleHarness />)
    fireEvent.click(screen.getByRole("button", { name: "start" }))

    stepRaf(0)
    stepRaf(1000)
    expect(screen.getByTestId("tick").textContent).toBe("1")

    clockState = { ...clockState, speed: 10 }
    rerender(<AutoBattleHarness />)
    stepRaf(100)

    expect(screen.getByTestId("tick").textContent).toBe("2")
  })

  it("supports stop and reset controls", () => {
    render(<AutoBattleHarness />)
    fireEvent.click(screen.getByRole("button", { name: "start" }))

    stepRaf(0)
    stepRaf(1000)
    expect(screen.getByTestId("tick").textContent).toBe("1")

    fireEvent.click(screen.getByRole("button", { name: "stop" }))
    stepRaf(2000)
    expect(screen.getByTestId("running").textContent).toBe("false")
    expect(screen.getByTestId("tick").textContent).toBe("1")

    fireEvent.click(screen.getByRole("button", { name: "reset" }))
    expect(screen.getByTestId("tick").textContent).toBe("0")
    expect(screen.getByTestId("phase").textContent).toBe("contact")
  })

  it("limits processed ticks per animation frame", () => {
    setupClockState(10, false)
    render(<AutoBattleHarness />)
    fireEvent.click(screen.getByRole("button", { name: "start" }))

    stepRaf(0)
    stepRaf(10000)

    const tick = Number(screen.getByTestId("tick").textContent)
    expect(tick).toBeGreaterThan(0)
    expect(tick).toBeLessThanOrEqual(10)
  })
})
