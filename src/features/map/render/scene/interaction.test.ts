import type { FederatedPointerEvent } from "pixi.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/features/map/lib/pathfinding", () => ({
  findPathAStar: vi.fn(),
  isPointBlocked: vi.fn(),
}))

import type { PathMover } from "@/features/map/lib/movement"
import {
  findPathAStar,
  isPointBlocked,
  type NavigationGrid,
} from "@/features/map/lib/pathfinding"
import { createPointerHandlers } from "@/features/map/render/scene/interaction"
import type { CameraState, DragState } from "@/features/map/render/scene/types"
import type { WorldConfig, WorldPoint } from "@/features/map/types"

const WORLD: WorldConfig = {
  width: 1000,
  height: 1000,
  minZoom: 0.5,
  maxZoom: 2,
  defaultZoom: 1,
  gridSize: 20,
}

const NAVIGATION_GRID: NavigationGrid = {
  width: WORLD.width,
  height: WORLD.height,
  gridSize: WORLD.gridSize,
  cols: WORLD.width / WORLD.gridSize,
  rows: WORLD.height / WORLD.gridSize,
  blocked: new Uint8Array((WORLD.width / WORLD.gridSize) * (WORLD.height / WORLD.gridSize)),
}

function createPointerEvent({
  pointerType,
  button,
  pointerId,
  x,
  y,
}: {
  pointerType: string
  button?: number
  pointerId?: number
  x: number
  y: number
}) {
  return {
    pointerType,
    button: button ?? 0,
    pointerId: pointerId ?? 1,
    global: { x, y },
  } as FederatedPointerEvent
}

function createContext() {
  const camera: CameraState = {
    x: 0,
    y: 0,
    zoom: 1,
  }
  const drag: DragState = {
    active: false,
    startX: 0,
    startY: 0,
    cameraX: 0,
    cameraY: 0,
  }
  const player: PathMover = {
    x: 120,
    y: 220,
    speed: 120,
    moving: false,
    path: [],
  }
  const drawPath = vi.fn<(points: WorldPoint[]) => void>()
  const onTooltipHide = vi.fn()
  const onStatusMessage = vi.fn<(message: string) => void>()
  const syncCamera = vi.fn()
  const onZoomPercentChange = vi.fn<(zoomPercent: number) => void>()

  const handlers = createPointerHandlers({
    camera,
    drag,
    world: WORLD,
    navigationGrid: NAVIGATION_GRID,
    player,
    drawPath,
    onTooltipHide,
    onStatusMessage,
    syncCamera,
    getViewportSize: () => ({ width: 800, height: 600 }),
    onZoomPercentChange,
  })

  return {
    camera,
    drag,
    player,
    drawPath,
    onTooltipHide,
    onStatusMessage,
    syncCamera,
    onZoomPercentChange,
    handlers,
  }
}

describe("map scene pointer interaction", () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.mocked(isPointBlocked).mockReset()
    vi.mocked(findPathAStar).mockReset()
    vi.mocked(isPointBlocked).mockReturnValue(false)
    vi.mocked(findPathAStar).mockReturnValue(null)
  })

  it("keeps mouse right-click pathfinding behavior", () => {
    const context = createContext()
    vi.mocked(findPathAStar).mockReturnValue([
      { x: context.player.x, y: context.player.y },
      { x: 340, y: 260 },
    ])

    context.handlers.onPointerDown(
      createPointerEvent({
        pointerType: "mouse",
        button: 2,
        x: 340,
        y: 260,
      })
    )

    expect(context.player.moving).toBe(true)
    expect(context.player.path).toEqual([{ x: 340, y: 260 }])
    expect(context.drawPath).toHaveBeenLastCalledWith([
      { x: 120, y: 220 },
      { x: 340, y: 260 },
    ])
  })

  it("keeps mouse left-drag panning behavior", () => {
    const context = createContext()

    context.handlers.onPointerDown(
      createPointerEvent({
        pointerType: "mouse",
        button: 0,
        x: 100,
        y: 150,
      })
    )
    context.handlers.onPointerMove(
      createPointerEvent({
        pointerType: "mouse",
        x: 145,
        y: 195,
      })
    )
    context.handlers.onPointerUp(
      createPointerEvent({
        pointerType: "mouse",
        x: 145,
        y: 195,
      })
    )

    expect(context.camera.x).toBe(45)
    expect(context.camera.y).toBe(45)
    expect(context.syncCamera).toHaveBeenCalledTimes(1)
    expect(context.drag.active).toBe(false)
  })

  it("does not trigger pathfinding on short touch tap", () => {
    vi.useFakeTimers()
    const context = createContext()

    context.handlers.onPointerDown(
      createPointerEvent({
        pointerType: "touch",
        pointerId: 10,
        x: 220,
        y: 320,
      })
    )
    vi.advanceTimersByTime(300)
    context.handlers.onPointerUp(
      createPointerEvent({
        pointerType: "touch",
        pointerId: 10,
        x: 220,
        y: 320,
      })
    )
    vi.advanceTimersByTime(300)

    expect(vi.mocked(findPathAStar)).not.toHaveBeenCalled()
    expect(context.player.moving).toBe(false)
  })

  it("starts pathfinding on touch long-press", () => {
    vi.useFakeTimers()
    const context = createContext()
    vi.mocked(findPathAStar).mockReturnValue([
      { x: context.player.x, y: context.player.y },
      { x: 600, y: 500 },
    ])

    context.handlers.onPointerDown(
      createPointerEvent({
        pointerType: "touch",
        pointerId: 4,
        x: 600,
        y: 500,
      })
    )
    vi.advanceTimersByTime(450)

    expect(vi.mocked(findPathAStar)).toHaveBeenCalledTimes(1)
    expect(context.player.moving).toBe(true)
    expect(context.player.path).toEqual([{ x: 600, y: 500 }])
  })

  it("cancels long-press after touch drag threshold and pans camera", () => {
    vi.useFakeTimers()
    const context = createContext()

    context.handlers.onPointerDown(
      createPointerEvent({
        pointerType: "touch",
        pointerId: 5,
        x: 120,
        y: 120,
      })
    )
    context.handlers.onPointerMove(
      createPointerEvent({
        pointerType: "touch",
        pointerId: 5,
        x: 160,
        y: 140,
      })
    )
    vi.advanceTimersByTime(450)

    expect(context.camera.x).toBe(40)
    expect(context.camera.y).toBe(20)
    expect(context.syncCamera).toHaveBeenCalledTimes(1)
    expect(vi.mocked(findPathAStar)).not.toHaveBeenCalled()
  })

  it("supports pinch zoom and suppresses touch long-press during pinch", () => {
    vi.useFakeTimers()
    const context = createContext()

    context.handlers.onPointerDown(
      createPointerEvent({
        pointerType: "touch",
        pointerId: 1,
        x: 100,
        y: 100,
      })
    )
    context.handlers.onPointerDown(
      createPointerEvent({
        pointerType: "touch",
        pointerId: 2,
        x: 200,
        y: 100,
      })
    )
    context.handlers.onPointerMove(
      createPointerEvent({
        pointerType: "touch",
        pointerId: 2,
        x: 260,
        y: 100,
      })
    )
    vi.advanceTimersByTime(500)

    expect(context.camera.zoom).toBeCloseTo(1.6)
    expect(context.onZoomPercentChange).toHaveBeenLastCalledWith(160)
    expect(context.syncCamera).toHaveBeenCalled()
    expect(vi.mocked(findPathAStar)).not.toHaveBeenCalled()
  })

  it("cleans touch state on pointercancel", () => {
    const context = createContext()

    context.handlers.onPointerDown(
      createPointerEvent({
        pointerType: "touch",
        pointerId: 33,
        x: 80,
        y: 80,
      })
    )
    context.handlers.onPointerMove(
      createPointerEvent({
        pointerType: "touch",
        pointerId: 33,
        x: 120,
        y: 80,
      })
    )
    expect(context.camera.x).toBe(40)

    context.handlers.onPointerCancel(
      createPointerEvent({
        pointerType: "touch",
        pointerId: 33,
        x: 120,
        y: 80,
      })
    )
    context.handlers.onPointerMove(
      createPointerEvent({
        pointerType: "touch",
        pointerId: 33,
        x: 200,
        y: 80,
      })
    )

    expect(context.camera.x).toBe(40)
    expect(context.drag.active).toBe(false)
  })
})
