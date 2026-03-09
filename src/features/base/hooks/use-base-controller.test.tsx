import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useEffect, useRef, useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { useBaseController } from "@/features/base/hooks/use-base-controller"
import type {
  BaseEditorState,
  BaseLayoutState,
  BaseWorldConfig,
  BuildingDefinition,
  PlacementPreview,
  TerrainKind,
} from "@/features/base/types"
import type {
  BaseRuntime,
  CreateBaseRuntime,
  CreateBaseRuntimeParams,
} from "@/engine/runtime/base-types"

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
const buildingDefinitions: BuildingDefinition[] = []
const emptyLayout: BaseLayoutState = { buildings: [] }

function createRuntimeDouble() {
  let latestParams: CreateBaseRuntimeParams | null = null
  const runtime: BaseRuntime = {
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    setLayout: vi.fn(),
    setEditorState: vi.fn(),
    destroy: vi.fn(),
  }
  const createRuntime = vi.fn(async (params: CreateBaseRuntimeParams) => {
    latestParams = params
    return runtime
  })

  return {
    createRuntime,
    runtime,
    getLatestParams: () => {
      if (!latestParams) {
        throw new Error("runtime was not created")
      }

      return latestParams
    },
  }
}

function buildEditorState(tool: BaseEditorState["tool"] = "select"): BaseEditorState {
  return {
    tool,
    activeDefinitionId: null,
    rotation: 0,
  }
}

function PreviewHarness({
  createRuntime,
  onCommit,
}: {
  createRuntime: CreateBaseRuntime
  onCommit: () => void
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  const { preview } = useBaseController({
    hostRef,
    world,
    terrain,
    layout: emptyLayout,
    buildingDefinitions,
    editorState: buildEditorState(),
    onLayoutChange: vi.fn(),
    createRuntime,
  })

  useEffect(() => {
    onCommit()
  })

  return (
    <>
      <div ref={hostRef} data-testid="host" />
      <span data-testid="preview">{preview?.message ?? "none"}</span>
    </>
  )
}

function LayoutHarness({ createRuntime }: { createRuntime: CreateBaseRuntime }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [layout, setLayout] = useState<BaseLayoutState>(emptyLayout)

  useBaseController({
    hostRef,
    world,
    terrain,
    layout,
    buildingDefinitions,
    editorState: buildEditorState(),
    onLayoutChange: setLayout,
    createRuntime,
  })

  return (
    <>
      <div ref={hostRef} data-testid="host" />
      <span data-testid="layout-count">{layout.buildings.length}</span>
    </>
  )
}

function ToolHarness({ createRuntime }: { createRuntime: CreateBaseRuntime }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [tool, setTool] = useState<BaseEditorState["tool"]>("select")

  useBaseController({
    hostRef,
    world,
    terrain,
    layout: emptyLayout,
    buildingDefinitions,
    editorState: buildEditorState(tool),
    onLayoutChange: vi.fn(),
    createRuntime,
  })

  return (
    <>
      <div ref={hostRef} data-testid="host" />
      <button
        type="button"
        onClick={() => {
          setTool("wall")
        }}
      >
        switch tool
      </button>
      <span data-testid="tool">{tool}</span>
    </>
  )
}

describe("useBaseController", () => {
  it("keeps the runtime mounted and ignores duplicate preview pushes", async () => {
    const runtimeDouble = createRuntimeDouble()
    const onCommit = vi.fn()

    render(
      <PreviewHarness
        createRuntime={runtimeDouble.createRuntime}
        onCommit={onCommit}
      />
    )

    await waitFor(() => {
      expect(runtimeDouble.createRuntime).toHaveBeenCalledTimes(1)
      expect(onCommit).toHaveBeenCalledTimes(1)
    })

    const preview: PlacementPreview = {
      tool: "wall",
      target: {
        type: "terrain",
        cell: { col: 1, row: 1 },
      },
      footprint: null,
      valid: true,
      action: "place",
      message: "可放置墙体。",
    }

    act(() => {
      runtimeDouble.getLatestParams().events.onPreviewChange(preview)
    })

    expect(screen.getByTestId("preview").textContent).toBe("可放置墙体。")
    expect(onCommit).toHaveBeenCalledTimes(2)
    expect(runtimeDouble.createRuntime).toHaveBeenCalledTimes(1)
    expect(runtimeDouble.runtime.setEditorState).not.toHaveBeenCalled()
    expect(runtimeDouble.runtime.destroy).not.toHaveBeenCalled()

    act(() => {
      runtimeDouble.getLatestParams().events.onPreviewChange({
        ...preview,
        target: {
          type: "terrain",
          cell: { col: 1, row: 1 },
        },
      })
    })

    expect(onCommit).toHaveBeenCalledTimes(2)
    expect(runtimeDouble.createRuntime).toHaveBeenCalledTimes(1)
  })

  it("does not echo runtime layout updates back into setLayout", async () => {
    const runtimeDouble = createRuntimeDouble()

    render(<LayoutHarness createRuntime={runtimeDouble.createRuntime} />)

    await waitFor(() => {
      expect(runtimeDouble.createRuntime).toHaveBeenCalledTimes(1)
    })

    const nextLayout: BaseLayoutState = {
      buildings: [
        {
          id: "wall-1",
          definitionId: "wall",
          rotation: 0,
          footprint: {
            kind: "edge",
            edge: { col: 1, row: 1, axis: "horizontal" },
          },
        },
      ],
    }

    act(() => {
      runtimeDouble.getLatestParams().events.onLayoutChange(nextLayout)
    })

    expect(screen.getByTestId("layout-count").textContent).toBe("1")
    expect(runtimeDouble.createRuntime).toHaveBeenCalledTimes(1)
    expect(runtimeDouble.runtime.setLayout).not.toHaveBeenCalled()
  })

  it("syncs editor state only when the tool actually changes", async () => {
    const runtimeDouble = createRuntimeDouble()

    render(<ToolHarness createRuntime={runtimeDouble.createRuntime} />)

    await waitFor(() => {
      expect(runtimeDouble.createRuntime).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole("button", { name: "switch tool" }))

    await waitFor(() => {
      expect(screen.getByTestId("tool").textContent).toBe("wall")
      expect(runtimeDouble.runtime.setEditorState).toHaveBeenCalledTimes(1)
    })

    expect(runtimeDouble.runtime.setEditorState).toHaveBeenLastCalledWith({
      tool: "wall",
      activeDefinitionId: null,
      rotation: 0,
    })
    expect(runtimeDouble.createRuntime).toHaveBeenCalledTimes(1)
  })
})
