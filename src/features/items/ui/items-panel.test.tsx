import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ItemsPanel } from "@/features/items/ui/items-panel"

describe("ItemsPanel", () => {
  it("renders player, location and npc inventory sections", () => {
    const { container } = render(<ItemsPanel />)

    expect(screen.getByText("玩家队伍库存")).toBeTruthy()
    expect(screen.getByText("地点库存总览")).toBeTruthy()
    expect(screen.getByText("NPC队伍库存总览")).toBeTruthy()
    expect(screen.getByText(/灰烬中枢/)).toBeTruthy()
    expect(screen.getAllByText(/类别:/).length).toBeGreaterThan(0)

    const summaries = container.querySelectorAll("summary")
    expect(summaries.length).toBeGreaterThan(0)
  })
})
