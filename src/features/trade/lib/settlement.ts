import { ItemCategory, type Item } from "@/features/items/types"
import type { TradeSideSelection } from "@/features/trade/types"

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

export type AutoSettlementResult =
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

export function resolveAutoSettlement({
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
