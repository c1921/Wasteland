import { describe, expect, it } from "vitest"

import {
  advancePathMover,
  composeFinalSpeedBeforeTime,
  type PathMover,
} from "@/features/map/lib/movement"

describe("advancePathMover", () => {
  it("moves and arrives at target at 1x", () => {
    const mover: PathMover = {
      x: 0,
      y: 0,
      speed: 100,
      moving: true,
      path: [{ x: 100, y: 0 }],
    }

    const result = advancePathMover(mover, 1000, 1)

    expect(result).toEqual({
      moved: true,
      arrived: true,
    })
    expect(mover.x).toBe(100)
    expect(mover.y).toBe(0)
    expect(mover.path).toHaveLength(0)
    expect(mover.moving).toBe(false)
  })

  it("scales movement distance linearly with time scale", () => {
    const mover: PathMover = {
      x: 0,
      y: 0,
      speed: 100,
      moving: true,
      path: [{ x: 1000, y: 0 }],
    }

    const result = advancePathMover(mover, 1000, 5)

    expect(result).toEqual({
      moved: true,
      arrived: false,
    })
    expect(mover.x).toBe(500)
    expect(mover.y).toBe(0)
    expect(mover.path).toHaveLength(1)
    expect(mover.moving).toBe(true)
  })

  it("applies time scale to the already composed final speed", () => {
    const finalSpeedBeforeTime = composeFinalSpeedBeforeTime(20, [1.5, 2])
    const mover: PathMover = {
      x: 0,
      y: 0,
      speed: finalSpeedBeforeTime,
      moving: true,
      path: [{ x: 1000, y: 0 }],
    }

    const result = advancePathMover(mover, 1000, 5)

    expect(result).toEqual({
      moved: true,
      arrived: false,
    })
    expect(mover.x).toBe(300)
    expect(mover.y).toBe(0)
    expect(mover.path).toHaveLength(1)
    expect(mover.moving).toBe(true)
  })

  it("continues along remaining path after crossing a waypoint", () => {
    const mover: PathMover = {
      x: 0,
      y: 0,
      speed: 50,
      moving: true,
      path: [
        { x: 30, y: 0 },
        { x: 30, y: 40 },
      ],
    }

    const result = advancePathMover(mover, 1000, 1)

    expect(result).toEqual({
      moved: true,
      arrived: false,
    })
    expect(mover.x).toBe(30)
    expect(mover.y).toBe(20)
    expect(mover.path).toHaveLength(1)
    expect(mover.path[0]).toEqual({ x: 30, y: 40 })
    expect(mover.moving).toBe(true)
  })

  it("does not move when time scale is zero", () => {
    const mover: PathMover = {
      x: 0,
      y: 0,
      speed: 100,
      moving: true,
      path: [{ x: 100, y: 0 }],
    }

    const result = advancePathMover(mover, 1000, 0)

    expect(result).toEqual({
      moved: false,
      arrived: false,
    })
    expect(mover.x).toBe(0)
    expect(mover.y).toBe(0)
    expect(mover.path).toHaveLength(1)
    expect(mover.moving).toBe(true)
  })

  it("does not move when delta time is non-positive", () => {
    const mover: PathMover = {
      x: 0,
      y: 0,
      speed: 100,
      moving: true,
      path: [{ x: 100, y: 0 }],
    }

    const result = advancePathMover(mover, -16, 10)

    expect(result).toEqual({
      moved: false,
      arrived: false,
    })
    expect(mover.x).toBe(0)
    expect(mover.y).toBe(0)
    expect(mover.path).toHaveLength(1)
    expect(mover.moving).toBe(true)
  })
})
