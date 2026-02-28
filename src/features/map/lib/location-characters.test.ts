import { describe, expect, it } from "vitest"

import { buildLocationCharacterMap } from "@/features/map/lib/location-characters"
import type { MapNode } from "@/features/map/types"

const populationRules = {
  settlement: { min: 5, max: 8 },
  outpost: { min: 3, max: 5 },
  ruin: { min: 2, max: 4 },
  hazard: { min: 1, max: 3 },
} as const

describe("buildLocationCharacterMap", () => {
  it("returns an empty object for empty nodes", () => {
    expect(buildLocationCharacterMap([])).toEqual({})
  })

  it("builds a character list for each node id", () => {
    const nodes: MapNode[] = [
      { id: "s-1", name: "settlement", x: 0, y: 0, kind: "settlement" },
      { id: "o-1", name: "outpost", x: 10, y: 10, kind: "outpost" },
      { id: "r-1", name: "ruin", x: 20, y: 20, kind: "ruin" },
      { id: "h-1", name: "hazard", x: 30, y: 30, kind: "hazard" },
    ]

    const result = buildLocationCharacterMap(nodes)

    expect(Object.keys(result).sort()).toEqual(nodes.map((node) => node.id).sort())
    expect(result["s-1"]).toBeTruthy()
    expect(result["o-1"]).toBeTruthy()
    expect(result["r-1"]).toBeTruthy()
    expect(result["h-1"]).toBeTruthy()
  })

  it("respects population ranges by node kind", () => {
    const nodes: MapNode[] = [
      { id: "s-1", name: "settlement", x: 0, y: 0, kind: "settlement" },
      { id: "o-1", name: "outpost", x: 10, y: 10, kind: "outpost" },
      { id: "r-1", name: "ruin", x: 20, y: 20, kind: "ruin" },
      { id: "h-1", name: "hazard", x: 30, y: 30, kind: "hazard" },
    ]

    for (let i = 0; i < 30; i += 1) {
      const result = buildLocationCharacterMap(nodes)

      for (const node of nodes) {
        const count = result[node.id].length
        const rule = populationRules[node.kind]

        expect(count).toBeGreaterThanOrEqual(rule.min)
        expect(count).toBeLessThanOrEqual(rule.max)
      }
    }
  })
})
