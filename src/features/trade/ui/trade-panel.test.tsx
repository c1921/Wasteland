import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { applySessionTrade } from "@/features/trade/data/session-trades"
import { TradePanel } from "@/features/trade/ui/trade-panel"

const mockData = vi.hoisted(() => ({
  playerItems: [
    {
      id: "weapon-1",
      name: "铁管步枪",
      category: "weapon",
      weight: 4.2,
      value: 130,
      quantity: 2,
    },
    {
      id: "tool-1",
      name: "多功能工具包",
      category: "tool",
      weight: 2.1,
      value: 140,
      quantity: 1,
    },
  ],
  targetItems: [
    {
      id: "weapon-1",
      name: "铁管步枪",
      category: "weapon",
      weight: 4.2,
      value: 130,
      quantity: 1,
    },
    {
      id: "medicine-1",
      name: "止血注射剂",
      category: "medicine",
      weight: 0.2,
      value: 58,
      quantity: 3,
    },
  ],
  restrictions: {
    blockedBuyFromPlayer: ["tool"],
    blockedSellToPlayer: ["medicine"],
  },
}))

vi.mock("@/features/map/data/wasteland-map", () => ({
  WASTELAND_MAP_NODES: [
    { id: "trade-test-location", name: "测试交易点", kind: "settlement", x: 0, y: 0 },
  ],
}))

vi.mock("@/features/map/data/npc-squads", () => ({
  getNpcSquadTemplates: () => [{ id: "trade-test-squad", name: "测试队伍" }],
}))

vi.mock("@/features/items/data/session-inventories", () => ({
  getPlayerTeamInventory: () => mockData.playerItems,
  getLocationInventoryById: () => mockData.targetItems,
  getNpcSquadInventoryById: () => mockData.targetItems,
}))

vi.mock("@/features/trade/lib/restrictions", () => ({
  resolveLocationTradeRestrictions: () => mockData.restrictions,
  resolveNpcSquadTradeRestrictions: () => mockData.restrictions,
}))

vi.mock("@/features/trade/data/session-trades", () => ({
  applySessionTrade: vi.fn(),
}))

describe("TradePanel", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    const applySessionTradeMock = vi.mocked(applySessionTrade)
    applySessionTradeMock.mockReset()
    applySessionTradeMock.mockReturnValue({
      ok: true,
      offeredValue: 130,
      requestedValue: 0,
      playerGiven: [{ itemId: "weapon-1", quantity: 1 }],
      playerReceived: [],
    })
  })

  it("renders table layout and settlement section", () => {
    render(<TradePanel />)

    expect(screen.getAllByText("交易对象").length).toBeGreaterThan(0)
    expect(screen.getByText("交易限制")).toBeTruthy()
    expect(screen.getByText("交易明细")).toBeTruthy()
    expect(screen.getByText("物品名")).toBeTruthy()
    expect(screen.getByText("价格")).toBeTruthy()
    expect(screen.getByText("对方数量")).toBeTruthy()
    expect(screen.getByText("我的数量")).toBeTruthy()
    expect(screen.getByRole("button", { name: "确认交易" })).toBeTruthy()
  })

  it("increases net quantity and caps at target quantity", () => {
    render(<TradePanel />)

    const increaseWeapon = screen.getByRole("button", { name: "增加铁管步枪" })
    fireEvent.click(increaseWeapon)

    expect(screen.getByTestId("trade-net-weapon-1").textContent).toBe("+1")
    expect(screen.getByText("玩家购买总价值: 130")).toBeTruthy()
    expect(screen.getByRole("button", { name: "增加铁管步枪" }).getAttribute("disabled")).not.toBeNull()
  })

  it("decreases net quantity and caps at player quantity", () => {
    render(<TradePanel />)

    const decreaseWeapon = screen.getByRole("button", { name: "减少铁管步枪" })
    fireEvent.click(decreaseWeapon)
    fireEvent.click(decreaseWeapon)

    expect(screen.getByTestId("trade-net-weapon-1").textContent).toBe("-2")
    expect(screen.getByText("玩家提供总价值: 260")).toBeTruthy()
    expect(screen.getByRole("button", { name: "减少铁管步枪" }).getAttribute("disabled")).not.toBeNull()
    expect(screen.getByRole("button", { name: "确认交易" }).getAttribute("disabled")).toBeNull()
  })

  it("disables forbidden buy/sell directions by category", () => {
    render(<TradePanel />)

    expect(screen.getByRole("button", { name: "增加止血注射剂" }).getAttribute("disabled")).not.toBeNull()
    expect(screen.getByRole("button", { name: "减少多功能工具包" }).getAttribute("disabled")).not.toBeNull()
  })

  it("resets net selection after successful trade", () => {
    const applySessionTradeMock = vi.mocked(applySessionTrade)
    render(<TradePanel />)

    fireEvent.click(screen.getByRole("button", { name: "减少铁管步枪" }))
    fireEvent.click(screen.getByRole("button", { name: "确认交易" }))

    expect(applySessionTradeMock).toHaveBeenCalledTimes(1)
    expect(applySessionTradeMock.mock.calls[0]?.[0]).toMatchObject({
      playerOfferSelection: { "weapon-1": 1 },
      targetOfferSelection: {},
    })
    expect(
      screen.getByText("交易成功：提供总值130，购入总值0。超额部分不找零。")
    ).toBeTruthy()
    expect(screen.getByTestId("trade-net-weapon-1").textContent).toBe("0")
  })
})
