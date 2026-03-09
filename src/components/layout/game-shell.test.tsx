import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { GameShell } from "@/components/layout/game-shell"

vi.mock("@/components/layout/top-time-bar", () => ({
  TopTimeBar: () => <div>top-time-bar</div>,
}))

vi.mock("@/app/navigation/panel-registry", () => ({
  PANEL_REGISTRY: {
    map: () => <div data-testid="map-panel">map-panel</div>,
    team: () => <div data-testid="team-panel">team-panel</div>,
    events: () => <div data-testid="events-panel">events-panel</div>,
    base: () => <div data-testid="base-panel">base-panel</div>,
    battle: () => <div data-testid="battle-panel">battle-panel</div>,
    items: () => <div data-testid="items-panel">items-panel</div>,
    trade: () => <div data-testid="trade-panel">trade-panel</div>,
    settings: () => <div data-testid="settings-panel">settings-panel</div>,
  },
}))

describe("GameShell layout", () => {
  it("treats the base panel as a full-screen canvas page", () => {
    render(<GameShell />)

    fireEvent.click(screen.getByRole("button", { name: "基地" }))

    const baseWrapper = screen.getByTestId("base-panel").parentElement
    expect(baseWrapper?.className).toContain("min-h-0 flex-1")
    expect(baseWrapper?.className).not.toContain("p-2")

    fireEvent.click(screen.getByRole("button", { name: "队伍" }))

    const teamWrapper = screen.getByTestId("team-panel").parentElement
    expect(teamWrapper?.className).toContain("p-2")
  })
})
