import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PixiMapCanvas } from "@/features/map/ui/pixi-map-canvas"
import type { MapTooltipState } from "@/features/map/render/pixi-scene"
import type { MapNode, MapObstacle, WorldConfig } from "@/features/map/types"

const useMapControllerMock = vi.fn()
const useGameClockMock = vi.fn()
const zoomInMock = vi.fn()
const zoomOutMock = vi.fn()

vi.mock("@/features/map/hooks/use-map-controller", () => ({
  useMapController: (...args: unknown[]) => useMapControllerMock(...args),
}))

vi.mock("@/features/time/game-clock-store", () => ({
  useGameClock: () => useGameClockMock(),
}))

const world: WorldConfig = {
  width: 100,
  height: 100,
  minZoom: 0.5,
  maxZoom: 2,
  defaultZoom: 1,
  gridSize: 20,
}

const nodes: MapNode[] = []
const obstacles: MapObstacle[] = []

function setupControllerState(overrides?: {
  zoomPercent?: number
  statusMessage?: string | null
  tooltip?: MapTooltipState | null
}) {
  useMapControllerMock.mockReturnValue({
    tooltip: overrides?.tooltip ?? null,
    statusMessage: overrides?.statusMessage ?? null,
    zoomPercent: overrides?.zoomPercent ?? 62,
    zoomIn: zoomInMock,
    zoomOut: zoomOutMock,
  })
}

function setupClockState(speed = 10) {
  useGameClockMock.mockReturnValue({
    speed,
  })
}

describe("PixiMapCanvas UI", () => {
  beforeEach(() => {
    useMapControllerMock.mockReset()
    useGameClockMock.mockReset()
    zoomInMock.mockReset()
    zoomOutMock.mockReset()
    setupClockState(10)
  })

  it("renders zoom percent and invokes zoom actions", () => {
    setupControllerState({ zoomPercent: 62 })

    const { container } = render(<PixiMapCanvas world={world} nodes={nodes} obstacles={obstacles} />)
    const host = container.firstElementChild as HTMLElement

    expect(screen.getByText("62%")).toBeTruthy()
    expect(host.className).toContain("bg-background")
    expect(host.className).not.toContain("bg-[#0b0f14]")

    fireEvent.click(screen.getByLabelText("放大地图"))
    fireEvent.click(screen.getByLabelText("缩小地图"))

    expect(zoomInMock).toHaveBeenCalledTimes(1)
    expect(zoomOutMock).toHaveBeenCalledTimes(1)
  })

  it("forwards node selection callback to controller", () => {
    setupControllerState()
    const onNodeSelect = vi.fn()

    render(
      <PixiMapCanvas
        world={world}
        nodes={nodes}
        obstacles={obstacles}
        onNodeSelect={onNodeSelect}
      />
    )

    expect(useMapControllerMock).toHaveBeenCalledTimes(1)
    expect(useMapControllerMock.mock.calls[0][0].onNodeSelect).toBe(onNodeSelect)
    expect(useMapControllerMock.mock.calls[0][0].movementTimeScale).toBe(10)
  })

  it("shows status message when present", () => {
    setupControllerState({ statusMessage: "目标不可达：未找到有效路径" })

    render(<PixiMapCanvas world={world} nodes={nodes} obstacles={obstacles} />)

    expect(screen.getByText("目标不可达：未找到有效路径")).toBeTruthy()
  })

  it("shows tooltip with translated node kind label", () => {
    setupControllerState({
      tooltip: {
        name: "灰烬中枢",
        kind: "settlement",
        left: 20,
        top: 20,
      },
    })

    render(<PixiMapCanvas world={world} nodes={nodes} obstacles={obstacles} />)

    expect(screen.getByText("灰烬中枢")).toBeTruthy()
    expect(screen.getByText("聚落")).toBeTruthy()
  })
})
