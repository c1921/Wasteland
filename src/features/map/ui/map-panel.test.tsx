import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { MapPanel } from "@/features/map/ui/map-panel"

let latestOnNodeSelect: ((nodeId: string) => void) | undefined

vi.mock("@/features/map/ui/pixi-map-canvas", () => ({
  PixiMapCanvas: ({
    onNodeSelect,
  }: {
    onNodeSelect?: (nodeId: string) => void
  }) => {
    latestOnNodeSelect = onNodeSelect
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
})
