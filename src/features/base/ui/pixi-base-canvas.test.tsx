import { render, screen, fireEvent } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PixiBaseCanvas } from "@/features/base/ui/pixi-base-canvas"
import type {
  BaseEditorState,
  BaseLayoutState,
  BaseSelection,
  BaseWorldConfig,
  BuildingDefinition,
  PlacementPreview,
  TerrainKind,
} from "@/features/base/types"

const useBaseControllerMock = vi.fn()
const zoomInMock = vi.fn()
const zoomOutMock = vi.fn()

vi.mock("@/features/base/hooks/use-base-controller", () => ({
  useBaseController: (...args: unknown[]) => useBaseControllerMock(...args),
}))

const world: BaseWorldConfig = {
  cols: 4,
  rows: 4,
  cellSize: 48,
  subgridDivisions: 3,
  width: 192,
  height: 192,
  minZoom: 0.5,
  maxZoom: 2,
  defaultZoom: 1,
}

const terrain: readonly TerrainKind[] = Array.from({ length: 16 }, () => "grass")
const layout: BaseLayoutState = { buildings: [] }
const buildingDefinitions: BuildingDefinition[] = []
const editorState: BaseEditorState = {
  tool: "select",
  activeDefinitionId: null,
  rotation: 0,
}

function setupControllerState(overrides?: {
  zoomPercent?: number
  statusMessage?: string | null
  tooltip?: { name: string; subtitle: string; left: number; top: number } | null
  selection?: BaseSelection | null
  preview?: PlacementPreview
}) {
  useBaseControllerMock.mockReturnValue({
    tooltip: overrides?.tooltip ?? null,
    statusMessage: overrides?.statusMessage ?? null,
    zoomPercent: overrides?.zoomPercent ?? 100,
    selection: overrides?.selection ?? null,
    preview: overrides?.preview ?? null,
    zoomIn: zoomInMock,
    zoomOut: zoomOutMock,
  })
}

describe("PixiBaseCanvas UI", () => {
  beforeEach(() => {
    useBaseControllerMock.mockReset()
    zoomInMock.mockReset()
    zoomOutMock.mockReset()
  })

  it("renders zoom controls and invokes canvas callbacks", () => {
    setupControllerState({
      selection: { type: "terrain", cell: { col: 1, row: 2 } },
      preview: {
        tool: "wall",
        target: null,
        footprint: null,
        valid: true,
        action: "place",
        message: "可放置墙体。",
      },
    })
    const onSelectionChange = vi.fn()
    const onPreviewChange = vi.fn()
    const onLayoutChange = vi.fn()

    render(
      <PixiBaseCanvas
        world={world}
        terrain={terrain}
        layout={layout}
        buildingDefinitions={buildingDefinitions}
        editorState={editorState}
        onLayoutChange={onLayoutChange}
        onSelectionChange={onSelectionChange}
        onPreviewChange={onPreviewChange}
      />
    )

    expect(screen.getByText("100%")).toBeTruthy()
    expect(screen.getByText("左键建造/选择 · 滚轮缩放 · WASD平移")).toBeTruthy()

    fireEvent.click(screen.getByLabelText("放大基地"))
    fireEvent.click(screen.getByLabelText("缩小基地"))

    expect(zoomInMock).toHaveBeenCalledTimes(1)
    expect(zoomOutMock).toHaveBeenCalledTimes(1)
    expect(onSelectionChange).toHaveBeenCalledWith({
      type: "terrain",
      cell: { col: 1, row: 2 },
    })
    expect(onPreviewChange).toHaveBeenCalledWith({
      tool: "wall",
      target: null,
      footprint: null,
      valid: true,
      action: "place",
      message: "可放置墙体。",
    })
  })

  it("shows touch hint on coarse pointers", () => {
    setupControllerState()
    const originalMatchMedia = window.matchMedia

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: "(pointer: coarse)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    })

    try {
      render(
        <PixiBaseCanvas
          world={world}
          terrain={terrain}
          layout={layout}
          buildingDefinitions={buildingDefinitions}
          editorState={editorState}
          onLayoutChange={vi.fn()}
        />
      )

      expect(screen.getByText("单指建造或选择 · 双指平移/缩放")).toBeTruthy()
    } finally {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: originalMatchMedia,
      })
    }
  })

  it("shows status and tooltip content when present", () => {
    setupControllerState({
      statusMessage: "已拆除1个建筑。",
      tooltip: {
        name: "墙体",
        subtitle: "结构",
        left: 20,
        top: 20,
      },
    })

    render(
      <PixiBaseCanvas
        world={world}
        terrain={terrain}
        layout={layout}
        buildingDefinitions={buildingDefinitions}
        editorState={editorState}
        onLayoutChange={vi.fn()}
      />
    )

    expect(screen.getByText("已拆除1个建筑。")).toBeTruthy()
    expect(screen.getByText("墙体")).toBeTruthy()
    expect(screen.getByText("结构")).toBeTruthy()
  })
})
