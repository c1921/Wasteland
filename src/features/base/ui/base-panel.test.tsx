import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { resetGameSessionStore } from "@/engine/session/game-session-store"
import {
  WASTELAND_BASE_TERRAIN,
  WASTELAND_BASE_WORLD_CONFIG,
} from "@/features/base/data/base-world"
import { BasePanel } from "@/features/base/ui/base-panel"
import type { BaseLayoutState, BaseSelection, PlacementPreview } from "@/features/base/types"

let latestOnSelectionChange: ((selection: BaseSelection | null) => void) | undefined
let latestOnPreviewChange: ((preview: PlacementPreview) => void) | undefined

vi.mock("@/features/base/ui/pixi-base-canvas", () => ({
  PixiBaseCanvas: ({
    onSelectionChange,
    onPreviewChange,
  }: {
    onSelectionChange?: (selection: BaseSelection | null) => void
    onPreviewChange?: (preview: PlacementPreview) => void
    onLayoutChange: (layout: BaseLayoutState) => void
  }) => {
    latestOnSelectionChange = onSelectionChange
    latestOnPreviewChange = onPreviewChange
    return <div>基地画布</div>
  },
}))

function selectTarget(selection: BaseSelection | null) {
  act(() => {
    latestOnSelectionChange?.(selection)
  })
}

function pushPreview(preview: PlacementPreview) {
  act(() => {
    latestOnPreviewChange?.(preview)
  })
}

describe("BasePanel", () => {
  beforeEach(() => {
    resetGameSessionStore()
    latestOnSelectionChange = undefined
    latestOnPreviewChange = undefined
  })

  it("renders the editor chrome and seed overview counts", () => {
    render(<BasePanel />)

    expect(screen.getByText("建造工具")).toBeTruthy()
    expect(screen.getByText("基地画布")).toBeTruthy()
    expect(screen.getByText("基地概览")).toBeTruthy()
    expect(screen.getByText("26")).toBeTruthy()
  })

  it("shows building details and removes the selected building", () => {
    render(<BasePanel />)

    selectTarget({
      type: "building",
      buildingId: "seed-bed-57-57",
    })

    expect(screen.getByText("占地: 2x1格")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /删除建筑/ }))

    expect(screen.getByText("25")).toBeTruthy()
    expect(screen.getAllByText("点击地形、墙门窗或家具设备查看详情。").length).toBeGreaterThan(0)
  })

  it("shows terrain details and preview messages from the canvas", () => {
    const firstGrassIndex = WASTELAND_BASE_TERRAIN.findIndex((terrain) => terrain === "grass")
    const grassCell = {
      col: firstGrassIndex % WASTELAND_BASE_WORLD_CONFIG.cols,
      row: Math.floor(firstGrassIndex / WASTELAND_BASE_WORLD_CONFIG.cols),
    }

    render(<BasePanel />)

    selectTarget({
      type: "terrain",
      cell: grassCell,
    })
    pushPreview({
      tool: "wall",
      target: null,
      footprint: null,
      valid: true,
      action: "place",
      message: "可放置墙体。",
    })

    expect(screen.getByText("草地")).toBeTruthy()
    expect(screen.getByText("可放置墙体。")).toBeTruthy()
  })

  it("switches tools and resets the seed layout", () => {
    render(<BasePanel />)

    fireEvent.click(screen.getAllByRole("button", { name: "家具" })[0]!)
    fireEvent.click(screen.getAllByRole("button", { name: "床" })[0]!)
    expect(screen.getByText("工具: 家具")).toBeTruthy()
    expect(screen.getAllByText("对象: 床").length).toBeGreaterThan(0)

    selectTarget({
      type: "building",
      buildingId: "seed-bed-57-57",
    })
    fireEvent.click(screen.getByRole("button", { name: /删除建筑/ }))
    expect(screen.getAllByText("25").length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByRole("button", { name: /重置布局/ })[0]!)
    expect(screen.getAllByText("26").length).toBeGreaterThan(0)
  })
})
