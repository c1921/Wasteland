import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const drawMocks = vi.hoisted(() => ({
  drawBackground: vi.fn(),
  drawGrid: vi.fn(),
  drawLayout: vi.fn(),
  drawTerrain: vi.fn(),
  redrawOverlay: vi.fn(),
}))

const themeMocks = vi.hoisted(() => ({
  observerCallback: null as (() => void) | null,
  stopObserver: vi.fn(),
  resolveMapThemePalette: vi.fn(),
  observeThemeClassChange: vi.fn(),
}))

vi.mock("pixi.js", () => {
  class MockContainer {
    children: unknown[] = []
    eventMode: string | undefined
    hitArea: unknown

    addChild(child: unknown) {
      this.children.push(child)
      return child
    }

    on() {
      return this
    }
  }

  class MockGraphics extends MockContainer {}

  class MockRectangle {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number

    constructor(x: number, y: number, width: number, height: number) {
      this.x = x
      this.y = y
      this.width = width
      this.height = height
    }
  }

  class MockApplication {
    readonly canvas = document.createElement("canvas")
    readonly stage = new MockContainer()
    readonly ticker = {
      deltaMS: 16,
      add: vi.fn(),
    }
    readonly renderer = {
      width: 0,
      height: 0,
      resize: vi.fn((width: number, height: number) => {
        this.renderer.width = width
        this.renderer.height = height
      }),
    }

    async init({
      width,
      height,
    }: {
      width: number
      height: number
    }) {
      this.renderer.width = width
      this.renderer.height = height
    }

    destroy = vi.fn()
  }

  return {
    Application: MockApplication,
    Container: MockContainer,
    Graphics: MockGraphics,
    Rectangle: MockRectangle,
  }
})

vi.mock("@/features/base/render/scene/draw", () => drawMocks)

vi.mock("@/features/base/render/scene/camera", () => ({
  applyCamera: vi.fn(),
  clampCamera: vi.fn(),
  toWorldPoint: vi.fn(() => ({ x: 0, y: 0 })),
  zoomCameraAtPoint: vi.fn(() => false),
}))

vi.mock("@/features/map/render/map-theme", () => ({
  resolveMapThemePalette: themeMocks.resolveMapThemePalette,
  observeThemeClassChange: themeMocks.observeThemeClassChange,
}))

import { createPixiBaseScene } from "@/features/base/render/scene/create-scene"
import type {
  BaseEditorState,
  BaseLayoutState,
  BaseWorldConfig,
} from "@/features/base/types"
import type { MapThemePalette } from "@/features/map/render/map-theme"

const WORLD: BaseWorldConfig = {
  cols: 2,
  rows: 2,
  cellSize: 40,
  subgridDivisions: 2,
  width: 80,
  height: 80,
  minZoom: 0.4,
  maxZoom: 2.4,
  defaultZoom: 1,
}

const LAYOUT: BaseLayoutState = {
  buildings: [],
}

const EDITOR_STATE: BaseEditorState = {
  tool: "select",
  activeDefinitionId: null,
  rotation: 0,
}

function createCallbacks() {
  return {
    onTooltipChange: vi.fn(),
    onStatusMessage: vi.fn(),
    onZoomPercentChange: vi.fn(),
    onSelectionChange: vi.fn(),
    onPreviewChange: vi.fn(),
    onLayoutChange: vi.fn(),
  }
}

describe("createPixiBaseScene theme sync", () => {
  beforeEach(() => {
    drawMocks.drawBackground.mockReset()
    drawMocks.drawGrid.mockReset()
    drawMocks.drawLayout.mockReset()
    drawMocks.drawTerrain.mockReset()
    drawMocks.redrawOverlay.mockReset()
    themeMocks.stopObserver.mockReset()
    themeMocks.resolveMapThemePalette.mockReset()
    themeMocks.observeThemeClassChange.mockReset()
    themeMocks.observerCallback = null

    class MockResizeObserver {
      observe = vi.fn()
      disconnect = vi.fn()
    }

    vi.stubGlobal("ResizeObserver", MockResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("redraws themed layers on theme changes and disconnects on destroy", async () => {
    const initialTheme: MapThemePalette = {
      background: 0x101418,
      border: 0x2b3138,
      grid: 0x4d5a66,
    }
    const nextTheme: MapThemePalette = {
      background: 0xeff2f5,
      border: 0xc7d0d8,
      grid: 0x6d7883,
    }

    themeMocks.resolveMapThemePalette
      .mockReturnValueOnce(initialTheme)
      .mockReturnValueOnce(nextTheme)
    themeMocks.observeThemeClassChange.mockImplementation((callback: () => void) => {
      themeMocks.observerCallback = callback
      return themeMocks.stopObserver
    })

    const host = document.createElement("div")
    Object.defineProperty(host, "clientWidth", { value: 640, configurable: true })
    Object.defineProperty(host, "clientHeight", { value: 480, configurable: true })
    const callbacks = createCallbacks()

    const scene = await createPixiBaseScene({
      host,
      world: WORLD,
      terrain: ["grass", "sand", "mountain", "deep-water"],
      layout: LAYOUT,
      editorState: EDITOR_STATE,
      callbacks,
    })

    expect(drawMocks.drawBackground).toHaveBeenCalledTimes(1)
    expect(drawMocks.drawBackground).toHaveBeenLastCalledWith(expect.anything(), WORLD, initialTheme)
    expect(drawMocks.drawTerrain).toHaveBeenCalledTimes(1)
    expect(drawMocks.drawTerrain).toHaveBeenLastCalledWith(
      expect.anything(),
      WORLD,
      ["grass", "sand", "mountain", "deep-water"],
      initialTheme
    )
    expect(drawMocks.drawGrid).toHaveBeenCalledTimes(2)
    expect(drawMocks.drawGrid).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      WORLD,
      false,
      initialTheme
    )

    themeMocks.observerCallback?.()

    expect(drawMocks.drawBackground).toHaveBeenCalledTimes(2)
    expect(drawMocks.drawBackground).toHaveBeenLastCalledWith(expect.anything(), WORLD, nextTheme)
    expect(drawMocks.drawTerrain).toHaveBeenCalledTimes(2)
    expect(drawMocks.drawTerrain).toHaveBeenLastCalledWith(
      expect.anything(),
      WORLD,
      ["grass", "sand", "mountain", "deep-water"],
      nextTheme
    )
    expect(drawMocks.drawGrid).toHaveBeenCalledTimes(3)
    expect(drawMocks.drawGrid).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      WORLD,
      false,
      nextTheme
    )

    scene.destroy()

    expect(themeMocks.stopObserver).toHaveBeenCalledTimes(1)

    themeMocks.observerCallback?.()

    expect(drawMocks.drawBackground).toHaveBeenCalledTimes(2)
    expect(drawMocks.drawTerrain).toHaveBeenCalledTimes(2)
    expect(drawMocks.drawGrid).toHaveBeenCalledTimes(3)
  })
})
