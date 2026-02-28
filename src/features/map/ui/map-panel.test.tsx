import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { MapPanel } from "@/features/map/ui/map-panel"
import { generateCharacters } from "@/features/character/lib/generator"
import type { NpcSquadSnapshot } from "@/features/map/types"

let latestOnNodeSelect: ((nodeId: string) => void) | undefined
let latestOnSquadSelect: ((squad: NpcSquadSnapshot) => void) | undefined

vi.mock("@/features/map/ui/pixi-map-canvas", () => ({
  PixiMapCanvas: ({
    onNodeSelect,
    onSquadSelect,
  }: {
    onNodeSelect?: (nodeId: string) => void
    onSquadSelect?: (squad: NpcSquadSnapshot) => void
  }) => {
    latestOnNodeSelect = onNodeSelect
    latestOnSquadSelect = onSquadSelect
    return (
      <div>
        地图画布
      </div>
    )
  },
}))

function selectNode(nodeId: string) {
  act(() => {
    latestOnNodeSelect?.(nodeId)
  })
}

function selectSquad(squad: NpcSquadSnapshot) {
  act(() => {
    latestOnSquadSelect?.(squad)
  })
}

function buildSquad(name: string): NpcSquadSnapshot {
  return {
    id: `squad-${name}`,
    name,
    members: generateCharacters({ count: 3 }),
    position: { x: 300, y: 900 },
    moving: true,
  }
}

describe("MapPanel", () => {
  it("opens sheet and renders selected location details", () => {
    render(<MapPanel />)

    selectNode("ash-hub")

    expect(screen.getByRole("dialog", { name: "灰烬中枢" })).toBeTruthy()
    expect(screen.getAllByText("角色栏").length).toBeGreaterThan(0)
  })

  it("keeps sheet open and switches details when selecting another node", () => {
    render(<MapPanel />)

    selectNode("ash-hub")
    selectNode("iron-lamp")

    expect(screen.getByRole("dialog", { name: "铁灯聚落" })).toBeTruthy()
    expect(screen.getAllByText("角色栏").length).toBeGreaterThan(0)
  })

  it("clears selected location when closing sheet", () => {
    render(<MapPanel />)

    selectNode("ash-hub")
    fireEvent.click(screen.getByRole("button", { name: "关闭面板" }))

    expect(screen.queryByRole("dialog", { name: "灰烬中枢" })).toBeNull()
  })

  it("opens sheet and renders selected squad details", () => {
    render(<MapPanel />)

    selectSquad(buildSquad("灰狼巡逻组-1"))

    expect(screen.getByRole("dialog", { name: "灰狼巡逻组-1" })).toBeTruthy()
    expect(screen.getByText("NPC队伍")).toBeTruthy()
    expect(screen.getByText("队伍状态")).toBeTruthy()
    expect(screen.getByText(/当前位置:/)).toBeTruthy()
    expect(screen.getAllByText("角色栏").length).toBeGreaterThan(0)
  })

  it("switches same sheet between node and squad details", () => {
    render(<MapPanel />)

    selectNode("ash-hub")
    selectSquad(buildSquad("风痕斥候组-2"))

    expect(screen.queryByRole("dialog", { name: "灰烬中枢" })).toBeNull()
    expect(screen.getByRole("dialog", { name: "风痕斥候组-2" })).toBeTruthy()
  })
})
