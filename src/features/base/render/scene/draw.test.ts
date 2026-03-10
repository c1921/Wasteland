import { describe, expect, it, vi } from "vitest"

const pixiMock = vi.hoisted(() => {
  type DrawCall = {
    method: string
    args: unknown[]
  }

  class MockGraphics {
    calls: DrawCall[] = []

    clear() {
      this.calls.push({ method: "clear", args: [] })
      return this
    }

    rect(...args: [number, number, number, number]) {
      this.calls.push({ method: "rect", args })
      return this
    }

    roundRect(...args: [number, number, number, number, number]) {
      this.calls.push({ method: "roundRect", args })
      return this
    }

    moveTo(...args: [number, number]) {
      this.calls.push({ method: "moveTo", args })
      return this
    }

    lineTo(...args: [number, number]) {
      this.calls.push({ method: "lineTo", args })
      return this
    }

    fill(...args: [unknown]) {
      this.calls.push({ method: "fill", args })
      return this
    }

    stroke(...args: [unknown]) {
      this.calls.push({ method: "stroke", args })
      return this
    }
  }

  return {
    MockGraphics,
  }
})

vi.mock("pixi.js", () => ({
  Graphics: pixiMock.MockGraphics,
}))

import type { Graphics } from "pixi.js"

import {
  drawBackground,
  drawGrid,
  drawLayout,
  drawTerrain,
  resolveTerrainFillStyle,
} from "@/features/base/render/scene/draw"
import type { BaseLayoutState, BaseWorldConfig, TerrainKind } from "@/features/base/types"
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

const MAP_THEME: MapThemePalette = {
  background: 0x0f1318,
  border: 0x24303a,
  grid: 0x61717f,
}

describe("base scene draw helpers", () => {
  it("keeps grass transparent and weakly distinguishes non-grass terrain", () => {
    const grass = resolveTerrainFillStyle("grass", MAP_THEME)
    const sand = resolveTerrainFillStyle("sand", MAP_THEME)
    const mountain = resolveTerrainFillStyle("mountain", MAP_THEME)
    const deepWater = resolveTerrainFillStyle("deep-water", MAP_THEME)

    expect(grass).toEqual({
      color: MAP_THEME.background,
      alpha: 0,
    })
    expect(sand.alpha).toBe(0.15)
    expect(mountain.alpha).toBe(0.15)
    expect(deepWater.alpha).toBe(0.15)
    expect(new Set([sand.color, mountain.color, deepWater.color]).size).toBe(3)
  })

  it("renders fills only for non-grass terrain cells", () => {
    const terrainLayer = new pixiMock.MockGraphics()
    const terrain: readonly TerrainKind[] = ["grass", "sand", "mountain", "deep-water"]

    drawTerrain(terrainLayer as unknown as Graphics, WORLD, terrain, MAP_THEME)

    const rectCalls = terrainLayer.calls.filter((call) => call.method === "rect")
    const fillCalls = terrainLayer.calls.filter((call) => call.method === "fill")

    expect(rectCalls).toHaveLength(3)
    expect(fillCalls).toHaveLength(3)
    expect(
      fillCalls.map((call) => call.args[0]).every(
        (arg) =>
          typeof arg === "object" &&
          arg !== null &&
          "alpha" in arg &&
          arg.alpha === 0.15
      )
    ).toBe(true)
  })

  it("uses map theme colors for the base background and grid", () => {
    const backgroundLayer = new pixiMock.MockGraphics()
    const gridLayer = new pixiMock.MockGraphics()
    const subgridLayer = new pixiMock.MockGraphics()

    drawBackground(backgroundLayer as unknown as Graphics, WORLD, MAP_THEME)
    drawGrid(
      gridLayer as unknown as Graphics,
      subgridLayer as unknown as Graphics,
      WORLD,
      true,
      MAP_THEME
    )

    expect(backgroundLayer.calls.at(-1)).toEqual({
      method: "fill",
      args: [{ color: MAP_THEME.background }],
    })
    expect(gridLayer.calls.find((call) => call.method === "stroke")).toEqual({
      method: "stroke",
      args: [
        {
          color: MAP_THEME.grid,
          width: 40 / 48,
          alpha: 0.18,
        },
      ],
    })
    expect(subgridLayer.calls.find((call) => call.method === "stroke")).toEqual({
      method: "stroke",
      args: [
        {
          color: MAP_THEME.grid,
          width: 40 / 48,
          alpha: 0.08,
        },
      ],
    })
  })

  it("renders placed structures and area buildings at 30% opacity", () => {
    const structureLayer = new pixiMock.MockGraphics()
    const buildingLayer = new pixiMock.MockGraphics()
    const layout: BaseLayoutState = {
      buildings: [
        {
          id: "wall-1",
          definitionId: "wall",
          rotation: 0,
          footprint: {
            kind: "edge",
            edge: { axis: "horizontal", col: 0, row: 1 },
          },
        },
        {
          id: "table-1",
          definitionId: "table",
          rotation: 0,
          footprint: {
            kind: "area",
            origin: { subcol: 1, subrow: 1 },
            widthSubcells: 2,
            heightSubcells: 2,
          },
        },
      ],
    }

    drawLayout(
      structureLayer as unknown as Graphics,
      buildingLayer as unknown as Graphics,
      WORLD,
      layout
    )

    const structureStroke = structureLayer.calls.find((call) => call.method === "stroke")
    const buildingFill = buildingLayer.calls.find((call) => call.method === "fill")
    const buildingStroke = buildingLayer.calls.find((call) => call.method === "stroke")

    expect(structureStroke?.method).toBe("stroke")
    expect(structureStroke?.args[0]).toMatchObject({
      color: 0xc7b38b,
      alpha: 0.3,
      cap: "round",
    })
    expect((structureStroke?.args[0] as { width: number }).width).toBeCloseTo((5.5 * 40) / 48)

    expect(buildingFill).toEqual({
      method: "fill",
      args: [
        {
          color: 0xa3b37a,
          alpha: 0.3,
        },
      ],
    })
    expect(buildingStroke).toEqual({
      method: "stroke",
      args: [
        {
          color: 0xa3b37a,
          alpha: 0.3,
          width: 1,
        },
      ],
    })
  })
})
