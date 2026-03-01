import type { ItemCategory, Item } from "@/features/items/types"
import type { MapNodeKind } from "@/features/map/types"

export type TradeTargetType = "location" | "npc-squad"

export type TradeTargetRef = {
  type: TradeTargetType
  id: string
  name: string
  kind?: MapNodeKind
}

export type TradeRestrictionProfile = {
  blockedBuyFromPlayer: ItemCategory[]
  blockedSellToPlayer: ItemCategory[]
}

export type TradeSideSelection = Record<string, number>

export type TradeValidationResult = {
  ok: boolean
  reason: string | null
  offeredValue: number
  requestedValue: number
}

export type TradeTransferItem = {
  itemId: string
  quantity: number
}

export type TradeExecutionResult =
  | {
      ok: true
      offeredValue: number
      requestedValue: number
      playerGiven: TradeTransferItem[]
      playerReceived: TradeTransferItem[]
    }
  | {
      ok: false
      reason: string
      offeredValue: number
      requestedValue: number
    }

export type TradeInventoryPair = {
  playerItems: Item[]
  targetItems: Item[]
}
