import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { TopTimeBar } from "@/components/layout/top-time-bar"

const setSpeedMock = vi.fn()
const useGameClockMock = vi.fn()

vi.mock("@/features/time/game-clock-store", () => ({
  useGameClock: () => useGameClockMock(),
}))

describe("TopTimeBar", () => {
  beforeEach(() => {
    setSpeedMock.mockReset()
    useGameClockMock.mockReset()
    useGameClockMock.mockReturnValue({
      currentTime: new Date(2059, 0, 1, 8, 0),
      formattedDateTime: "2059年01月01日 08:00",
      speed: 5,
      setSpeed: setSpeedMock,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("renders formatted time and highlights active speed", () => {
    render(<TopTimeBar />)

    expect(screen.getByText("2059年01月01日 08:00")).toBeTruthy()
    expect(screen.getByRole("button", { name: "5x" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: "1x" }).getAttribute("aria-pressed")).toBe("false")
  })

  it("updates speed when speed button is clicked", () => {
    render(<TopTimeBar />)

    fireEvent.click(screen.getByRole("button", { name: "1x" }))
    fireEvent.click(screen.getByRole("button", { name: "10x" }))

    expect(setSpeedMock).toHaveBeenNthCalledWith(1, 1)
    expect(setSpeedMock).toHaveBeenNthCalledWith(2, 10)
  })
})
