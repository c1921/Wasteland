import type { Item, ItemCategory } from "@/features/items/types"
import type {
  TradeRestrictionProfile,
  TradeSideSelection,
  TradeValidationResult,
} from "@/features/trade/types"

type ValidateTradeParams = {
  playerItems: Item[]
  targetItems: Item[]
  playerOfferSelection: TradeSideSelection
  targetOfferSelection: TradeSideSelection
  restrictions: TradeRestrictionProfile
}

function toPositiveIntegerEntries(selection: TradeSideSelection) {
  const entries: Array<{ itemId: string; quantity: number }> = []

  for (const [itemId, quantity] of Object.entries(selection)) {
    if (!Number.isInteger(quantity) || quantity < 0) {
      return {
        ok: false as const,
        reason: "交易数量必须为大于等于0的整数。",
      }
    }

    if (quantity === 0) {
      continue
    }

    entries.push({
      itemId,
      quantity,
    })
  }

  return {
    ok: true as const,
    entries,
  }
}

function sumSelectionValue(inventory: Item[], selection: TradeSideSelection) {
  const itemMap = new Map(inventory.map((item) => [item.id, item]))
  let totalValue = 0

  for (const [itemId, quantity] of Object.entries(selection)) {
    if (quantity <= 0) {
      continue
    }

    const item = itemMap.get(itemId)

    if (!item) {
      continue
    }

    totalValue += item.value * quantity
  }

  return totalValue
}

function validateSelection({
  inventory,
  selection,
  blockedCategories,
  blockedReason,
}: {
  inventory: Item[]
  selection: TradeSideSelection
  blockedCategories: ItemCategory[]
  blockedReason: string
}) {
  const resolved = toPositiveIntegerEntries(selection)

  if (!resolved.ok) {
    return resolved
  }

  const blockedSet = new Set(blockedCategories)
  const itemMap = new Map(inventory.map((item) => [item.id, item]))

  for (const entry of resolved.entries) {
    const item = itemMap.get(entry.itemId)

    if (!item) {
      return {
        ok: false as const,
        reason: "存在不可用的交易物品。",
      }
    }

    if (entry.quantity > item.quantity) {
      return {
        ok: false as const,
        reason: "交易数量超过可用库存。",
      }
    }

    if (blockedSet.has(item.category)) {
      return {
        ok: false as const,
        reason: `${item.name}${blockedReason}`,
      }
    }
  }

  return {
    ok: true as const,
  }
}

export function calculateSelectionValue(inventory: Item[], selection: TradeSideSelection) {
  return sumSelectionValue(inventory, selection)
}

export function validateTrade({
  playerItems,
  targetItems,
  playerOfferSelection,
  targetOfferSelection,
  restrictions,
}: ValidateTradeParams): TradeValidationResult {
  const offeredValue = sumSelectionValue(playerItems, playerOfferSelection)
  const requestedValue = sumSelectionValue(targetItems, targetOfferSelection)

  const playerOfferValidation = validateSelection({
    inventory: playerItems,
    selection: playerOfferSelection,
    blockedCategories: restrictions.blockedBuyFromPlayer,
    blockedReason: "属于对方拒收类型。",
  })

  if (!playerOfferValidation.ok) {
    return {
      ok: false,
      reason: playerOfferValidation.reason,
      offeredValue,
      requestedValue,
    }
  }

  const targetOfferValidation = validateSelection({
    inventory: targetItems,
    selection: targetOfferSelection,
    blockedCategories: restrictions.blockedSellToPlayer,
    blockedReason: "属于对方拒售类型。",
  })

  if (!targetOfferValidation.ok) {
    return {
      ok: false,
      reason: targetOfferValidation.reason,
      offeredValue,
      requestedValue,
    }
  }

  if (offeredValue <= 0 && requestedValue <= 0) {
    return {
      ok: false,
      reason: "请选择至少一项交易物品。",
      offeredValue,
      requestedValue,
    }
  }

  if (offeredValue < requestedValue) {
    return {
      ok: false,
      reason: "玩家提供总价值不足，无法完成交易。",
      offeredValue,
      requestedValue,
    }
  }

  return {
    ok: true,
    reason: null,
    offeredValue,
    requestedValue,
  }
}
