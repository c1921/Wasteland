import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PixiMapCanvas } from "@/features/map/ui/pixi-map-canvas"
import type { MapTooltipState } from "@/features/map/render/pixi-scene"
import type { MapNode, MapObstacle, WorldConfig } from "@/features/map/types"

const useMapControllerMock = vi.fn()
const zoomInMock = vi.fn()
const zoomOutMock = vi.fn()

vi.mock("@/features/map/hooks/use-map-controller", () => ({
  useMapController: (...args: unknown[]) => useMapControllerMock(...args),
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

describe("PixiMapCanvas UI", () => {
  beforeEach(() => {
    useMapControllerMock.mockReset()
    zoomInMock.mockReset()
    zoomOutMock.mockReset()
  })

  it("renders zoom percent and invokes zoom actions", () => {
    setupControllerState({ zoomPercent: 62 })

    render(<PixiMapCanvas world={world} nodes={nodes} obstacles={obstacles} />)

    expect(screen.getByText("62%")).toBeTruthy()

    fireEvent.click(screen.getByLabelText("放大地图"))
    fireEvent.click(screen.getByLabelText("缩小地图"))

    expect(zoomInMock).toHaveBeenCalledTimes(1)
    expect(zoomOutMock).toHaveBeenCalledTimes(1)
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
