import type { Item } from "@/features/items/types"
import {
  mergeSelections,
  sumSelectionValue,
  validateSelection,
} from "@/features/trade/lib/selection"
import { resolveAutoSettlement } from "@/features/trade/lib/settlement"
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
