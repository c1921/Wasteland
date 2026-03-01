import type { Item, ItemCategory } from "@/features/items/types"
import type { TradeSideSelection } from "@/features/trade/types"

export type SelectionEntriesResult =
  | {
      ok: true
      entries: Array<{ itemId: string; quantity: number }>
    }
  | {
      ok: false
      reason: string
    }

export function toPositiveIntegerEntries(selection: TradeSideSelection): SelectionEntriesResult {
  const entries: Array<{ itemId: string; quantity: number }> = []

  for (const [itemId, quantity] of Object.entries(selection)) {
    if (!Number.isInteger(quantity) || quantity < 0) {
      return {
        ok: false,
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
    ok: true,
    entries,
  }
}

export function sumSelectionValue(inventory: Item[], selection: TradeSideSelection) {
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

export function validateSelection({
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

export function mergeSelections(
  base: TradeSideSelection,
  addition: TradeSideSelection
): TradeSideSelection {
  const next: TradeSideSelection = { ...base }

  for (const [itemId, quantity] of Object.entries(addition)) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      continue
    }

    next[itemId] = (next[itemId] ?? 0) + quantity
  }

  return next
}
