import { beforeEach, describe, expect, it } from "vitest"

import {
  applyAreaBrushPlacement,
  applyAreaPlacement,
  applyStructurePlacement,
  createEmptyBaseLayout,
  getBuildingDefinitionById,
  removeBuildingsByIds,
  resetPlacedBuildingIdSequence,
} from "@/features/base/lib/layout"
import type { BaseWorldConfig, TerrainKind } from "@/features/base/types"

const WORLD: BaseWorldConfig = {
  cols: 6,
  rows: 6,
  cellSize: 48,
  subgridDivisions: 3,
  width: 288,
  height: 288,
  minZoom: 0.4,
  maxZoom: 2.4,
  defaultZoom: 1,
}

function createTerrain(fill: TerrainKind = "grass") {
  return Array.from({ length: WORLD.cols * WORLD.rows }, () => fill)
}

describe("base layout placement", () => {
  beforeEach(() => {
    resetPlacedBuildingIdSequence()
  })

  it("places walls and converts them into doors on the same edge", () => {
    const wallResult = applyStructurePlacement({
      layout: createEmptyBaseLayout(),
      terrain: createTerrain(),
      world: WORLD,
      definitionId: "wall",
      edges: [{ axis: "horizontal", col: 2, row: 2 }],
    })

    expect(wallResult.changed).toBe(true)
    expect(wallResult.nextLayout.buildings).toHaveLength(1)
    expect(wallResult.nextLayout.buildings[0]?.definitionId).toBe("wall")

    const doorResult = applyStructurePlacement({
      layout: wallResult.nextLayout,
      terrain: createTerrain(),
      world: WORLD,
      definitionId: "door",
      edges: [{ axis: "horizontal", col: 2, row: 2 }],
    })

    expect(doorResult.changed).toBe(true)
    expect(doorResult.nextLayout.buildings).toHaveLength(1)
    expect(doorResult.nextLayout.buildings[0]?.definitionId).toBe("door")
  })

  it("blocks area placement on disallowed terrain", () => {
    const terrain = createTerrain()
    terrain[1 * WORLD.cols + 1] = "mountain"

    const result = applyAreaPlacement({
      layout: createEmptyBaseLayout(),
      terrain,
      world: WORLD,
      definitionId: "table",
      origin: { subcol: 3, subrow: 3 },
      rotation: 0,
    })

    expect(result.changed).toBe(false)
    expect(result.message).toContain("不可建地形")
  })

  it("rejects overlapping area placement", () => {
    const first = applyAreaPlacement({
      layout: createEmptyBaseLayout(),
      terrain: createTerrain(),
      world: WORLD,
      definitionId: "table",
      origin: { subcol: 6, subrow: 6 },
      rotation: 0,
    })

    const second = applyAreaPlacement({
      layout: first.nextLayout,
      terrain: createTerrain(),
      world: WORLD,
      definitionId: "crate",
      origin: { subcol: 6, subrow: 6 },
      rotation: 0,
    })

    expect(first.changed).toBe(true)
    expect(second.changed).toBe(false)
    expect(second.message).toContain("占用")
  })

  it("rotates cell-area buildings by swapping their footprint dimensions", () => {
    const bed = getBuildingDefinitionById("bed")

    expect(bed?.footprint.kind).toBe("cell-area")

    const result = applyAreaPlacement({
      layout: createEmptyBaseLayout(),
      terrain: createTerrain(),
      world: WORLD,
      definitionId: "bed",
      origin: { subcol: 3, subrow: 3 },
      rotation: 90,
    })

    expect(result.changed).toBe(true)
    expect(result.nextLayout.buildings[0]?.footprint).toEqual({
      kind: "area",
      origin: { subcol: 3, subrow: 3 },
      widthSubcells: 3,
      heightSubcells: 6,
    })
  })

  it("supports partial success when brushing 1x1 subcells", () => {
    const terrain = createTerrain()
    terrain[0 * WORLD.cols + 2] = "deep-water"

    const result = applyAreaBrushPlacement({
      layout: createEmptyBaseLayout(),
      terrain,
      world: WORLD,
      definitionId: "crate",
      origins: [
        { subcol: 0, subrow: 0 },
        { subcol: 1, subrow: 0 },
        { subcol: 6, subrow: 0 },
      ],
      rotation: 0,
    })

    expect(result.changed).toBe(true)
    expect(result.placedCount).toBe(2)
    expect(result.skippedCount).toBe(1)
    expect(result.message).toContain("跳过1处")
  })

  it("removes selected buildings from the layout", () => {
    const first = applyAreaPlacement({
      layout: createEmptyBaseLayout(),
      terrain: createTerrain(),
      world: WORLD,
      definitionId: "table",
      origin: { subcol: 3, subrow: 3 },
      rotation: 0,
    })
    const second = applyAreaPlacement({
      layout: first.nextLayout,
      terrain: createTerrain(),
      world: WORLD,
      definitionId: "console",
      origin: { subcol: 9, subrow: 3 },
      rotation: 0,
    })
    const buildingIds = second.nextLayout.buildings.map((building) => building.id)

    const removal = removeBuildingsByIds(second.nextLayout, [buildingIds[0]!])

    expect(removal.changed).toBe(true)
    expect(removal.removedCount).toBe(1)
    expect(removal.nextLayout.buildings).toHaveLength(1)
  })
})
