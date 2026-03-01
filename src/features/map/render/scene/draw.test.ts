import { describe, expect, it, vi } from "vitest"

const pixiMock = vi.hoisted(() => {
  type DrawCall = {
    method: string
    args: unknown[]
  }

  class MockCircle {
    constructor(
      public x: number,
      public y: number,
      public radius: number
    ) {}
  }

  class MockGraphics {
    calls: DrawCall[] = []
    eventMode: string | undefined
    cursor: string | undefined
    hitArea: unknown
    rotation = 0
    private handlers = new Map<string, (event: unknown) => void>()
    readonly position = {
      x: 0,
      y: 0,
      set: (x: number, y: number) => {
        this.position.x = x
        this.position.y = y
      },
    }

    clear() {
      this.calls.push({ method: "clear", args: [] })
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

    circle(...args: [number, number, number]) {
      this.calls.push({ method: "circle", args })
      return this
    }

    poly(...args: [number[]]) {
      this.calls.push({ method: "poly", args })
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

    on(eventName: string, handler: (event: unknown) => void) {
      this.handlers.set(eventName, handler)
      return this
    }

    trigger(eventName: string, event: unknown) {
      this.handlers.get(eventName)?.(event)
    }

    destroy() {}
  }

  class MockContainer {
    children: MockGraphics[] = []

    removeChildren() {
      const stale = [...this.children]
      this.children = []
      return stale
    }

    addChild(child: MockGraphics) {
      this.children.push(child)
      return child
    }
  }

  return {
    MockCircle,
    MockGraphics,
    MockContainer,
  }
})

vi.mock("pixi.js", () => ({
  Circle: pixiMock.MockCircle,
  Graphics: pixiMock.MockGraphics,
  Container: pixiMock.MockContainer,
}))

import type { Container, Graphics } from "pixi.js"

import type { NpcSquadRuntime } from "@/features/map/lib/npc-squads"
import {
  drawNodes,
  drawNpcSquads,
  drawPlayerMarker,
  updateNpcMarkerPosition,
} from "@/features/map/render/scene/draw"
import type { MapNode } from "@/features/map/types"

describe("map draw markers", () => {
  it("renders player marker as a cyan chevron and sets position", () => {
    const marker = new pixiMock.MockGraphics()

    drawPlayerMarker(marker as unknown as Graphics, { x: 260, y: 340 })

    const moveToCalls = marker.calls.filter((call) => call.method === "moveTo")
    const lineToCalls = marker.calls.filter((call) => call.method === "lineTo")
    const polyCalls = marker.calls.filter((call) => call.method === "poly")
    const circleCalls = marker.calls.filter((call) => call.method === "circle")
    const fillCalls = marker.calls.filter((call) => call.method === "fill")
    const strokeCalls = marker.calls.filter((call) => call.method === "stroke")

    expect(moveToCalls).toHaveLength(3)
    expect(lineToCalls).toHaveLength(6)
    expect(polyCalls).toHaveLength(0)
    expect(circleCalls).toHaveLength(0)
    expect(fillCalls).toHaveLength(0)
    expect(strokeCalls).toEqual([
      {
        method: "stroke",
        args: [
          {
            width: 8.5,
            color: 0x6fd6f0,
            alpha: 0.2,
            cap: "round",
            join: "round",
          },
        ],
      },
      {
        method: "stroke",
        args: [
          {
            width: 3.4,
            color: 0x9ee8fb,
            alpha: 0.95,
            cap: "round",
            join: "round",
          },
        ],
      },
      {
        method: "stroke",
        args: [
          {
            width: 1.8,
            color: 0xe6fbff,
            alpha: 1,
            cap: "round",
            join: "round",
          },
        ],
      },
    ])
    expect(marker.position.x).toBe(260)
    expect(marker.position.y).toBe(340)
  })

  it("renders location markers as circles and keeps node interaction", () => {
    const nodeLayer = new pixiMock.MockContainer()
    const onNodeSelect = vi.fn<(nodeId: string) => void>()
    const showTooltip = vi.fn()
    const clearTooltip = vi.fn()
    const nodes: MapNode[] = [
      { id: "node-1", name: "灰烬中枢", x: 120, y: 220, kind: "settlement" },
      { id: "node-2", name: "风拱遗迹", x: 420, y: 460, kind: "ruin" },
    ]

    drawNodes({
      nodeLayer: nodeLayer as unknown as Container,
      nodes,
      showTooltip,
      clearTooltip,
      onNodeSelect,
    })

    expect(nodeLayer.children).toHaveLength(2)
    const marker = nodeLayer.children[0]
    const circleCalls = marker.calls.filter((call) => call.method === "circle")
    const polyCalls = marker.calls.filter((call) => call.method === "poly")
    expect(circleCalls.length).toBeGreaterThan(0)
    expect(polyCalls).toHaveLength(0)

    const stopPropagation = vi.fn()
    marker.trigger("pointertap", { stopPropagation })
    expect(stopPropagation).toHaveBeenCalledTimes(1)
    expect(onNodeSelect).toHaveBeenCalledWith("node-1")
  })

  it("renders squad markers as diamonds and keeps squad interaction", () => {
    const npcLayer = new pixiMock.MockContainer()
    const npcMarkers = new Map<string, Graphics>()
    const onSquadSelect = vi.fn()
    const showTooltip = vi.fn()
    const clearTooltip = vi.fn()
    const squad: NpcSquadRuntime = {
      id: "squad-1",
      name: "灰狼巡逻组-1",
      members: [],
      mover: {
        x: 380,
        y: 640,
        speed: 120,
        moving: false,
        path: [],
      },
      target: null,
      idleRemainingMs: 0,
    }

    drawNpcSquads({
      npcLayer: npcLayer as unknown as Container,
      npcSquadRuntimes: [squad],
      npcMarkers,
      showTooltip,
      clearTooltip,
      onSquadSelect,
    })

    expect(npcLayer.children).toHaveLength(1)
    const marker = npcLayer.children[0]
    const polyCalls = marker.calls.filter((call) => call.method === "poly")
    expect(polyCalls).toHaveLength(2)
    expect(marker.hitArea).toBeInstanceOf(pixiMock.MockCircle)
    expect((marker.hitArea as { radius: number }).radius).toBe(14)

    const stopPropagation = vi.fn()
    marker.trigger("pointerover", {
      global: { x: 100, y: 200 },
    })
    marker.trigger("pointertap", { stopPropagation })

    expect(showTooltip).toHaveBeenCalledWith("灰狼巡逻组-1", "0名NPC", 100, 200)
    expect(stopPropagation).toHaveBeenCalledTimes(1)
    expect(onSquadSelect).toHaveBeenCalledWith({
      id: "squad-1",
      name: "灰狼巡逻组-1",
      members: [],
      position: { x: 380, y: 640 },
      moving: false,
    })
    expect(npcMarkers.get("squad-1")).toBe(marker)
  })

  it("updates squad marker position by runtime coordinates", () => {
    const marker = new pixiMock.MockGraphics()
    const npcMarkers = new Map<string, Graphics>([
      ["squad-1", marker as unknown as Graphics],
    ])
    const squad: NpcSquadRuntime = {
      id: "squad-1",
      name: "灰狼巡逻组-1",
      members: [],
      mover: {
        x: 610,
        y: 710,
        speed: 120,
        moving: true,
        path: [],
      },
      target: null,
      idleRemainingMs: 0,
    }

    updateNpcMarkerPosition(npcMarkers, squad)

    expect(marker.position.x).toBe(610)
    expect(marker.position.y).toBe(710)
  })
})
