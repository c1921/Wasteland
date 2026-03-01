import {
  getLocationInventoryById,
  getNpcSquadInventoryById,
  getPlayerTeamInventory,
  replaceInventoryByOwner,
  type InventoryOwnerRef,
} from "@/features/items/data/session-inventories"
import { Item, ItemCategory } from "@/features/items/types"
import { validateTrade } from "@/features/trade/lib/engine"
import type {
  TradeExecutionResult,
  TradeRestrictionProfile,
  TradeSideSelection,
  TradeTargetRef,
  TradeTransferItem,
} from "@/features/trade/types"

type ApplyTradeParams = {
  target: TradeTargetRef
  restrictions: TradeRestrictionProfile
  playerOfferSelection: TradeSideSelection
  targetOfferSelection: TradeSideSelection
}

function cloneItemWithQuantity(item: Item, quantity: number) {
  return new Item({
    ...item.toJSON(),
    quantity,
  })
}

function normalizeSelection(selection: TradeSideSelection): TradeTransferItem[] {
  return Object.entries(selection)
    .map(([itemId, quantity]) => ({
      itemId,
      quantity,
    }))
    .filter((entry) => entry.quantity > 0)
}

function resolveAutoCurrencyTransfers({
  inventory,
  manualSelection,
  resolvedSelection,
}: {
  inventory: Item[]
  manualSelection: TradeSideSelection
  resolvedSelection: TradeSideSelection
}): TradeTransferItem[] {
  const itemMap = new Map(inventory.map((item) => [item.id, item]))
  const transfers: TradeTransferItem[] = []

  for (const [itemId, resolvedQuantity] of Object.entries(resolvedSelection)) {
    if (resolvedQuantity <= 0) {
      continue
    }

    const manualQuantity = manualSelection[itemId] ?? 0
    const autoQuantity = resolvedQuantity - manualQuantity

    if (autoQuantity <= 0) {
      continue
    }

    const item = itemMap.get(itemId)

    if (!item || item.category !== ItemCategory.Currency) {
      continue
    }

    transfers.push({
      itemId,
      quantity: autoQuantity,
    })
  }

  return transfers
}

function subtractItems(inventory: Item[], selection: TradeTransferItem[]) {
  const quantityMap = new Map(selection.map((entry) => [entry.itemId, entry.quantity]))

  return inventory.flatMap((item) => {
    const movedQuantity = quantityMap.get(item.id) ?? 0

    if (movedQuantity <= 0) {
      return [item]
    }

    const remain = item.quantity - movedQuantity

    if (remain <= 0) {
      return []
    }

    return [cloneItemWithQuantity(item, remain)]
  })
}

function addItems(base: Item[], fromInventory: Item[], selection: TradeTransferItem[]) {
  const sourceMap = new Map(fromInventory.map((item) => [item.id, item]))
  const next = base.slice()
  const indexMap = new Map(next.map((item, index) => [item.id, index]))

  for (const transfer of selection) {
    if (transfer.quantity <= 0) {
      continue
    }

    const sourceItem = sourceMap.get(transfer.itemId)

    if (!sourceItem) {
      continue
    }

    const existingIndex = indexMap.get(transfer.itemId)

    if (existingIndex === undefined) {
      next.push(cloneItemWithQuantity(sourceItem, transfer.quantity))
      indexMap.set(transfer.itemId, next.length - 1)
      continue
    }

    const existingItem = next[existingIndex]
    next[existingIndex] = cloneItemWithQuantity(
      existingItem,
      existingItem.quantity + transfer.quantity
    )
  }

  return next
}

function resolveTargetInventory(target: TradeTargetRef) {
  if (target.type === "location") {
    return getLocationInventoryById(target.id)
  }

  return getNpcSquadInventoryById(target.id)
}

function resolveTargetOwner(target: TradeTargetRef): InventoryOwnerRef {
  return {
    type: target.type,
    id: target.id,
  }
}

export function applySessionTrade({
  target,
  restrictions,
  playerOfferSelection,
  targetOfferSelection,
}: ApplyTradeParams): TradeExecutionResult {
  const playerInventory = getPlayerTeamInventory()
  const targetInventory = resolveTargetInventory(target)
  const validation = validateTrade({
    playerItems: playerInventory,
    targetItems: targetInventory,
    playerOfferSelection,
    targetOfferSelection,
    restrictions,
  })

  if (!validation.ok) {
    return {
      ok: false,
      reason: validation.reason ?? "交易校验失败。",
      offeredValue: validation.offeredValue,
      requestedValue: validation.requestedValue,
    }
  }

  const resolvedPlayerOfferSelection = validation.resolvedPlayerOfferSelection
  const resolvedTargetOfferSelection = validation.resolvedTargetOfferSelection
  const playerGiven = normalizeSelection(resolvedPlayerOfferSelection)
  const playerReceived = normalizeSelection(resolvedTargetOfferSelection)
  const autoPlayerCurrencyGiven = resolveAutoCurrencyTransfers({
    inventory: playerInventory,
    manualSelection: playerOfferSelection,
    resolvedSelection: resolvedPlayerOfferSelection,
  })
  const autoPlayerCurrencyReceived = resolveAutoCurrencyTransfers({
    inventory: targetInventory,
    manualSelection: targetOfferSelection,
    resolvedSelection: resolvedTargetOfferSelection,
  })
  const nextPlayerInventory = addItems(
    subtractItems(playerInventory, playerGiven),
    targetInventory,
    playerReceived
  )
  const nextTargetInventory = addItems(
    subtractItems(targetInventory, playerReceived),
    playerInventory,
    playerGiven
  )

  replaceInventoryByOwner({ type: "player-team" }, nextPlayerInventory)
  replaceInventoryByOwner(resolveTargetOwner(target), nextTargetInventory)

  return {
    ok: true,
    offeredValue: validation.offeredValue,
    requestedValue: validation.requestedValue,
    playerGiven,
    playerReceived,
    settlementDelta: validation.settlementDelta,
    settlementExact: validation.settlementExact,
    autoPlayerCurrencyGiven,
    autoPlayerCurrencyReceived,
  }
}
