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
    {
      id: "currency-a-20",
      name: "A币-20元",
      category: "currency",
      weight: 0.001,
      value: 20,
      quantity: 2,
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
    {
      id: "currency-a-10",
      name: "A币-10元",
      category: "currency",
      weight: 0.001,
      value: 10,
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
      settlementDelta: 5,
      settlementExact: false,
      autoPlayerCurrencyGiven: [{ itemId: "currency-a-20", quantity: 1 }],
      autoPlayerCurrencyReceived: [{ itemId: "currency-a-10", quantity: 1 }],
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

  it("hides currency rows from trade list", () => {
    render(<TradePanel />)

    expect(screen.queryByText("A币-20元")).toBeNull()
    expect(screen.queryByText("A币-10元")).toBeNull()
  })

  it("increases net quantity and caps at target quantity", () => {
    render(<TradePanel />)

    const increaseWeapon = screen.getByRole("button", { name: "增加铁管步枪" })
    fireEvent.click(increaseWeapon)

    expect(screen.getByTestId("trade-net-weapon-1").textContent).toBe("+1")
    expect(screen.getByText("我购入总价值: 130")).toBeTruthy()
    expect(screen.getByRole("button", { name: "增加铁管步枪" }).getAttribute("disabled")).not.toBeNull()
  })

  it("decreases net quantity and caps at player quantity", () => {
    render(<TradePanel />)

    const decreaseWeapon = screen.getByRole("button", { name: "减少铁管步枪" })
    fireEvent.click(decreaseWeapon)
    fireEvent.click(decreaseWeapon)

    expect(screen.getByTestId("trade-net-weapon-1").textContent).toBe("-2")
    expect(screen.getByText("我售出总价值: 260")).toBeTruthy()
    expect(screen.getByText("净值(售出-购入): 260")).toBeTruthy()
    expect(screen.getByRole("button", { name: "减少铁管步枪" }).getAttribute("disabled")).not.toBeNull()
    expect(screen.getByRole("button", { name: "确认交易" }).getAttribute("disabled")).toBeNull()
  })

  it("shows auto currency income and expense preview in settlement before submit", () => {
    render(<TradePanel />)

    fireEvent.click(screen.getByRole("button", { name: "减少铁管步枪" }))

    expect(screen.getByText("净值(售出-购入): 130")).toBeTruthy()
    expect(
      screen.getByText((_, element) => {
        return element?.textContent === "货币支出总额: 0（无）"
      })
    ).toBeTruthy()
    expect(
      screen.getByText((_, element) => {
        return element?.textContent === "货币收入总额: 30（A币-10元x3）"
      })
    ).toBeTruthy()
  })

  it("disables forbidden buy/sell directions by category", () => {
    render(<TradePanel />)

    expect(screen.getByRole("button", { name: "增加止血注射剂" }).getAttribute("disabled")).not.toBeNull()
    expect(screen.getByRole("button", { name: "减少多功能工具包" }).getAttribute("disabled")).not.toBeNull()
  })

  it("moves literal-rule rows to bottom with strikethrough", () => {
    render(<TradePanel />)

    const rows = screen.getAllByRole("row")
    expect(rows[1]?.textContent).toContain("铁管步枪")
    expect(screen.getByText("多功能工具包").className).toContain("line-through")
    expect(screen.getByText("止血注射剂").className).toContain("line-through")
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
      screen.getByText(
        "交易成功：我售出总价值130，我购入总价值0，净值(售出-购入)130。货币支出总额20（A币-20元x1）；货币收入总额10（A币-10元x1）；采用最接近结算，差额+5。"
      )
    ).toBeTruthy()
    expect(screen.getByTestId("trade-net-weapon-1").textContent).toBe("0")
  })
})
