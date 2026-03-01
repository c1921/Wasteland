import { ItemCategory, type Item, type ItemCategory } from "@/features/items/types"
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

type CurrencyPoolEntry = {
  itemId: string
  value: number
  quantity: number
}

type ReachableCurrencySums = {
  reachable: boolean[]
  parentSum: number[]
  parentItemId: Array<string | null>
  maxSum: number
  highestReachable: number
  bestReachableAtOrBelow: number[]
}

type AutoSettlementResult =
  | {
      ok: true
      playerCurrencySelection: TradeSideSelection
      targetCurrencySelection: TradeSideSelection
      delta: number
      exact: boolean
      note: string | null
    }
  | {
      ok: false
      reason: string
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

function mergeSelections(
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

function resolveRemainingCurrencyPool(
  inventory: Item[],
  selection: TradeSideSelection
): CurrencyPoolEntry[] {
  const selectedQuantityMap = new Map(Object.entries(selection))
  const pool: CurrencyPoolEntry[] = []

  for (const item of inventory) {
    if (item.category !== ItemCategory.Currency) {
      continue
    }

    const selectedQuantity = selectedQuantityMap.get(item.id) ?? 0
    const remainingQuantity = item.quantity - Math.max(0, selectedQuantity)

    if (remainingQuantity <= 0) {
      continue
    }

    pool.push({
      itemId: item.id,
      value: item.value,
      quantity: remainingQuantity,
    })
  }

  return pool
}

function buildReachableCurrencySums(pool: CurrencyPoolEntry[]): ReachableCurrencySums {
  let maxSum = 0

  for (const entry of pool) {
    maxSum += entry.value * entry.quantity
  }

  const reachable = new Array(maxSum + 1).fill(false)
  const parentSum = new Array(maxSum + 1).fill(-1)
  const parentItemId: Array<string | null> = new Array(maxSum + 1).fill(null)
  reachable[0] = true

  for (const entry of pool) {
    for (let used = 0; used < entry.quantity; used += 1) {
      for (let sum = maxSum; sum >= entry.value; sum -= 1) {
        if (reachable[sum] || !reachable[sum - entry.value]) {
          continue
        }

        reachable[sum] = true
        parentSum[sum] = sum - entry.value
        parentItemId[sum] = entry.itemId
      }
    }
  }

  const bestReachableAtOrBelow = new Array(maxSum + 1).fill(-1)
  let highestReachable = -1

  for (let sum = 0; sum <= maxSum; sum += 1) {
    if (reachable[sum]) {
      highestReachable = sum
    }

    bestReachableAtOrBelow[sum] = highestReachable
  }

  return {
    reachable,
    parentSum,
    parentItemId,
    maxSum,
    highestReachable,
    bestReachableAtOrBelow,
  }
}

function reconstructCurrencySelection(
  sums: ReachableCurrencySums,
  targetSum: number
): TradeSideSelection {
  if (targetSum < 0 || targetSum > sums.maxSum || !sums.reachable[targetSum]) {
    return {}
  }

  const selection: TradeSideSelection = {}
  let cursor = targetSum

  while (cursor > 0) {
    const itemId = sums.parentItemId[cursor]
    const prevSum = sums.parentSum[cursor]

    if (!itemId || prevSum < 0) {
      return {}
    }

    selection[itemId] = (selection[itemId] ?? 0) + 1
    cursor = prevSum
  }

  return selection
}

function resolveAutoSettlement({
  playerItems,
  targetItems,
  playerOfferSelection,
  targetOfferSelection,
  baseOfferedValue,
  baseRequestedValue,
}: {
  playerItems: Item[]
  targetItems: Item[]
  playerOfferSelection: TradeSideSelection
  targetOfferSelection: TradeSideSelection
  baseOfferedValue: number
  baseRequestedValue: number
}): AutoSettlementResult {
  const playerCurrencyPool = resolveRemainingCurrencyPool(playerItems, playerOfferSelection)
  const targetCurrencyPool = resolveRemainingCurrencyPool(targetItems, targetOfferSelection)
  const playerSums = buildReachableCurrencySums(playerCurrencyPool)
  const targetSums = buildReachableCurrencySums(targetCurrencyPool)
  const baseDelta = baseOfferedValue - baseRequestedValue

  let bestResult:
    | {
        playerCurrencyValue: number
        targetCurrencyValue: number
        delta: number
        transferTotal: number
      }
    | null = null

  for (let playerCurrencyValue = 0; playerCurrencyValue <= playerSums.maxSum; playerCurrencyValue += 1) {
    if (!playerSums.reachable[playerCurrencyValue]) {
      continue
    }

    const valueLimit = baseDelta + playerCurrencyValue

    if (valueLimit < 0) {
      continue
    }

    const targetCurrencyValue =
      valueLimit >= targetSums.maxSum
        ? targetSums.highestReachable
        : targetSums.bestReachableAtOrBelow[valueLimit]

    if (targetCurrencyValue < 0) {
      continue
    }

    const delta = valueLimit - targetCurrencyValue
    const transferTotal = playerCurrencyValue + targetCurrencyValue

    if (
      !bestResult ||
      delta < bestResult.delta ||
      (delta === bestResult.delta && transferTotal < bestResult.transferTotal)
    ) {
      bestResult = {
        playerCurrencyValue,
        targetCurrencyValue,
        delta,
        transferTotal,
      }
    }
  }

  if (!bestResult) {
    return {
      ok: false,
      reason: "自动结算失败：在货币可用范围内无法满足价值条件。",
    }
  }

  const playerCurrencySelection = reconstructCurrencySelection(
    playerSums,
    bestResult.playerCurrencyValue
  )
  const targetCurrencySelection = reconstructCurrencySelection(
    targetSums,
    bestResult.targetCurrencyValue
  )
  const exact = bestResult.delta === 0

  return {
    ok: true,
    playerCurrencySelection,
    targetCurrencySelection,
    delta: bestResult.delta,
    exact,
    note: exact ? null : `无法精确凑额，已采用最接近方案，差额+${bestResult.delta}。`,
  }
}

function buildValidationResult({
  ok,
  reason,
  offeredValue,
  requestedValue,
  resolvedPlayerOfferSelection,
  resolvedTargetOfferSelection,
  settlementDelta,
  settlementExact,
  settlementNote,
}: TradeValidationResult): TradeValidationResult {
  return {
    ok,
    reason,
    offeredValue,
    requestedValue,
    resolvedPlayerOfferSelection,
    resolvedTargetOfferSelection,
    settlementDelta,
    settlementExact,
    settlementNote,
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
  const baseOfferedValue = sumSelectionValue(playerItems, playerOfferSelection)
  const baseRequestedValue = sumSelectionValue(targetItems, targetOfferSelection)
  const baseDelta = baseOfferedValue - baseRequestedValue

  const playerOfferValidation = validateSelection({
    inventory: playerItems,
    selection: playerOfferSelection,
    blockedCategories: restrictions.blockedBuyFromPlayer,
    blockedReason: "属于对方拒收类型。",
  })

  if (!playerOfferValidation.ok) {
    return buildValidationResult({
      ok: false,
      reason: playerOfferValidation.reason,
      offeredValue: baseOfferedValue,
      requestedValue: baseRequestedValue,
      resolvedPlayerOfferSelection: playerOfferSelection,
      resolvedTargetOfferSelection: targetOfferSelection,
      settlementDelta: baseDelta,
      settlementExact: baseDelta === 0,
      settlementNote: null,
    })
  }

  const targetOfferValidation = validateSelection({
    inventory: targetItems,
    selection: targetOfferSelection,
    blockedCategories: restrictions.blockedSellToPlayer,
    blockedReason: "属于对方拒售类型。",
  })

  if (!targetOfferValidation.ok) {
    return buildValidationResult({
      ok: false,
      reason: targetOfferValidation.reason,
      offeredValue: baseOfferedValue,
      requestedValue: baseRequestedValue,
      resolvedPlayerOfferSelection: playerOfferSelection,
      resolvedTargetOfferSelection: targetOfferSelection,
      settlementDelta: baseDelta,
      settlementExact: baseDelta === 0,
      settlementNote: null,
    })
  }

  if (baseOfferedValue <= 0 && baseRequestedValue <= 0) {
    return buildValidationResult({
      ok: false,
      reason: "请选择至少一项交易物品。",
      offeredValue: baseOfferedValue,
      requestedValue: baseRequestedValue,
      resolvedPlayerOfferSelection: playerOfferSelection,
      resolvedTargetOfferSelection: targetOfferSelection,
      settlementDelta: baseDelta,
      settlementExact: baseDelta === 0,
      settlementNote: null,
    })
  }

  const settlement = resolveAutoSettlement({
    playerItems,
    targetItems,
    playerOfferSelection,
    targetOfferSelection,
    baseOfferedValue,
    baseRequestedValue,
  })

  if (!settlement.ok) {
    return buildValidationResult({
      ok: false,
      reason: settlement.reason,
      offeredValue: baseOfferedValue,
      requestedValue: baseRequestedValue,
      resolvedPlayerOfferSelection: playerOfferSelection,
      resolvedTargetOfferSelection: targetOfferSelection,
      settlementDelta: baseDelta,
      settlementExact: baseDelta === 0,
      settlementNote: null,
    })
  }

  const resolvedPlayerOfferSelection = mergeSelections(
    playerOfferSelection,
    settlement.playerCurrencySelection
  )
  const resolvedTargetOfferSelection = mergeSelections(
    targetOfferSelection,
    settlement.targetCurrencySelection
  )
  const offeredValue = sumSelectionValue(playerItems, resolvedPlayerOfferSelection)
  const requestedValue = sumSelectionValue(targetItems, resolvedTargetOfferSelection)
  const settlementDelta = offeredValue - requestedValue

  if (offeredValue < requestedValue) {
    return buildValidationResult({
      ok: false,
      reason: "玩家提供总价值不足，无法完成交易。",
      offeredValue,
      requestedValue,
      resolvedPlayerOfferSelection,
      resolvedTargetOfferSelection,
      settlementDelta,
      settlementExact: false,
      settlementNote: settlement.note,
    })
  }

  return buildValidationResult({
    ok: true,
    reason: settlement.note,
    offeredValue,
    requestedValue,
    resolvedPlayerOfferSelection,
    resolvedTargetOfferSelection,
    settlementDelta,
    settlementExact: settlement.exact,
    settlementNote: settlement.note,
  })
}
