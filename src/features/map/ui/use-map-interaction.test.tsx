import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { generateCharacters } from "@/features/character/lib/generator"
import { useMapInteraction } from "@/features/map/ui/use-map-interaction"
import type { MapNode, NpcSquadSnapshot } from "@/features/map/types"

const nodeA: MapNode = {
  id: "ash-hub",
  name: "灰烬中枢",
  x: 10,
  y: 20,
  kind: "settlement",
}

const nodeB: MapNode = {
  id: "iron-lamp",
  name: "铁灯聚落",
  x: 80,
  y: 60,
  kind: "settlement",
}

function buildSquad(id: string, name: string, moving = false): NpcSquadSnapshot {
  return {
    id,
    name,
    members: generateCharacters({ count: 3 }),
    position: { x: 40, y: 50 },
    moving,
  }
}

function InteractionHarness({
  selectedNode,
  selectedSquad,
}: {
  selectedNode: MapNode | null
  selectedSquad: NpcSquadSnapshot | null
}) {
  const {
    availableActions,
    interactionLogs,
    focusedSquadId,
    lastResupplyNodeId,
    executeInteractionAction,
  } = useMapInteraction({
    selectedNode,
    selectedSquad,
  })

  return (
    <div>
      <p data-testid="focused-squad">{focusedSquadId ?? ""}</p>
      <p data-testid="last-resupply-node">{lastResupplyNodeId ?? ""}</p>
      <p data-testid="log-count">{interactionLogs.length}</p>
      {availableActions.map((action) => (
        <button
          key={action.id}
          onClick={() => {
            executeInteractionAction(action.id)
          }}
        >
          {action.id}
        </button>
      ))}
      <button
        onClick={() => {
          executeInteractionAction("squad-follow")
        }}
      >
        force-squad-follow
      </button>
      {interactionLogs.map((entry) => (
        <p key={entry.id}>{entry.message}</p>
      ))}
    </div>
  )
}

describe("useMapInteraction", () => {
  afterEach(() => {
    cleanup()
  })

  it("applies node and squad session states independently", () => {
    const squad = buildSquad("squad-1", "灰狼巡逻组-1", true)
    const { rerender } = render(
      <InteractionHarness selectedNode={nodeA} selectedSquad={null} />
    )

    fireEvent.click(screen.getByRole("button", { name: "node-resupply" }))
    expect(screen.getByTestId("last-resupply-node").textContent).toBe("ash-hub")
    expect(screen.getByText("你在灰烬中枢完成快速补给。")).toBeTruthy()

    rerender(<InteractionHarness selectedNode={null} selectedSquad={squad} />)
    fireEvent.click(screen.getByRole("button", { name: "squad-follow" }))

    expect(screen.getByTestId("focused-squad").textContent).toBe("squad-1")
    expect(screen.getByTestId("last-resupply-node").textContent).toBe("ash-hub")
    expect(screen.getByText("已将灰狼巡逻组-1标记为关注目标。")).toBeTruthy()
  })

  it("keeps only logs for the selected target", () => {
    const { rerender } = render(
      <InteractionHarness selectedNode={nodeA} selectedSquad={null} />
    )

    fireEvent.click(screen.getByRole("button", { name: "node-observe" }))
    expect(screen.getByText("你在灰烬中枢完成驻留观察，记录了周边动向。")).toBeTruthy()

    rerender(<InteractionHarness selectedNode={nodeB} selectedSquad={null} />)
    expect(
      screen.queryByText("你在灰烬中枢完成驻留观察，记录了周边动向。")
    ).toBeNull()
    expect(screen.getByTestId("log-count").textContent).toBe("0")
  })

  it("caps interaction logs to 50 entries", () => {
    render(<InteractionHarness selectedNode={nodeA} selectedSquad={null} />)

    for (let i = 0; i < 55; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: "node-intel" }))
    }

    expect(screen.getByTestId("log-count").textContent).toBe("50")
  })

  it("ignores invalid action-target combinations", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    render(<InteractionHarness selectedNode={nodeA} selectedSquad={null} />)
    fireEvent.click(screen.getByRole("button", { name: "force-squad-follow" }))

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("log-count").textContent).toBe("0")

    warnSpy.mockRestore()
  })
})
