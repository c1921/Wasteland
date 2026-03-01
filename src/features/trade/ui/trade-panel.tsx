import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getNpcSquadTemplates } from "@/features/map/data/npc-squads"
import { WASTELAND_MAP_NODES } from "@/features/map/data/wasteland-map"
import {
  getLocationInventoryById,
  getNpcSquadInventoryById,
  getPlayerTeamInventory,
} from "@/features/items/data/session-inventories"
import {
  ITEM_CATEGORY_LABEL,
  ItemCategory,
  type Item,
  type ItemCategory as ItemCategoryValue,
} from "@/features/items/types"
import { applySessionTrade } from "@/features/trade/data/session-trades"
import { validateTrade } from "@/features/trade/lib/engine"
import {
  resolveLocationTradeRestrictions,
  resolveNpcSquadTradeRestrictions,
} from "@/features/trade/lib/restrictions"
import type {
  TradeRestrictionProfile,
  TradeSideSelection,
  TradeTargetRef,
  TradeTargetType,
  TradeTransferItem,
} from "@/features/trade/types"
import { useTradeNavigation } from "@/features/trade/ui/trade-navigation-store"
import { PanelShell } from "@/shared/ui/panel-shell"

const TARGET_TYPE_LABEL: Record<TradeTargetType, string> = {
  location: "地点",
  "npc-squad": "NPC队伍",
}

const EMPTY_RESTRICTIONS: TradeRestrictionProfile = {
  blockedBuyFromPlayer: [],
  blockedSellToPlayer: [],
}

type TradeNetSelection = Record<string, number>

const EMPTY_SELECTION: TradeSideSelection = {}
const EMPTY_NET_SELECTION: TradeNetSelection = {}

function formatBlockedCategories(categories: TradeRestrictionProfile["blockedBuyFromPlayer"]) {
  if (categories.length === 0) {
    return "无"
  }

  return categories.map((category) => ITEM_CATEGORY_LABEL[category]).join("、")
}

function updateNetSelection(
  prev: TradeNetSelection,
  itemId: string,
  quantity: number
): TradeNetSelection {
  if (quantity === 0) {
    const next = { ...prev }
    delete next[itemId]
    return next
  }

  return {
    ...prev,
    [itemId]: quantity,
  }
}

function splitNetSelection(selection: TradeNetSelection): {
  playerOfferSelection: TradeSideSelection
  targetOfferSelection: TradeSideSelection
} {
  const playerOfferSelection: TradeSideSelection = {}
  const targetOfferSelection: TradeSideSelection = {}

  for (const [itemId, rawQuantity] of Object.entries(selection)) {
    if (!Number.isInteger(rawQuantity) || rawQuantity === 0) {
      continue
    }

    if (rawQuantity > 0) {
      targetOfferSelection[itemId] = rawQuantity
      continue
    }

    playerOfferSelection[itemId] = Math.abs(rawQuantity)
  }

  return {
    playerOfferSelection,
    targetOfferSelection,
  }
}

function clampQuantity(quantity: number, min: number, max: number) {
  return Math.min(max, Math.max(min, quantity))
}

function formatNetQuantity(quantity: number) {
  if (quantity > 0) {
    return `+${quantity}`
  }

  return String(quantity)
}

type TradeTableRow = {
  itemId: string
  name: string
  value: number
  targetQuantity: number
  playerQuantity: number
  blockedBuyFromPlayer: boolean
  blockedSellToPlayer: boolean
  netQuantity: number
  minNet: number
  maxNet: number
  deprioritized: boolean
}

function buildTradeRows({
  playerItems,
  targetItems,
  blockedBuyCategories,
  blockedSellCategories,
  netSelection,
}: {
  playerItems: Item[]
  targetItems: Item[]
  blockedBuyCategories: Set<ItemCategoryValue>
  blockedSellCategories: Set<ItemCategoryValue>
  netSelection: TradeNetSelection
}) {
  const rows: TradeTableRow[] = []
  const playerMap = new Map(playerItems.map((item) => [item.id, item]))
  const targetMap = new Map(targetItems.map((item) => [item.id, item]))
  const unionItemIds = new Set([...playerMap.keys(), ...targetMap.keys()])

  for (const itemId of unionItemIds) {
    const playerItem = playerMap.get(itemId)
    const targetItem = targetMap.get(itemId)
    const baseItem = playerItem ?? targetItem

    if (!baseItem || baseItem.category === ItemCategory.Currency) {
      continue
    }

    const playerQuantity = playerItem?.quantity ?? 0
    const targetQuantity = targetItem?.quantity ?? 0
    const blockedBuyFromPlayer = blockedBuyCategories.has(baseItem.category)
    const blockedSellToPlayer = blockedSellCategories.has(baseItem.category)
    const minNet = blockedBuyFromPlayer ? 0 : -Math.max(0, playerQuantity)
    const maxNet = blockedSellToPlayer ? 0 : Math.max(0, targetQuantity)
    const rawNetQuantity = netSelection[itemId] ?? 0
    const deprioritized =
      (blockedSellToPlayer && playerQuantity === 0) ||
      (blockedBuyFromPlayer && targetQuantity === 0)

    rows.push({
      itemId: baseItem.id,
      name: baseItem.name,
      value: baseItem.value,
      targetQuantity,
      playerQuantity,
      blockedBuyFromPlayer,
      blockedSellToPlayer,
      netQuantity: clampQuantity(rawNetQuantity, minNet, maxNet),
      minNet,
      maxNet,
      deprioritized,
    })
  }

  rows.sort((left, right) => {
    if (left.deprioritized !== right.deprioritized) {
      return left.deprioritized ? 1 : -1
    }

    return left.name.localeCompare(right.name, "zh-Hans-CN")
  })
  return rows
}

function formatTransferEntries(entries: TradeTransferItem[], itemNameById: Map<string, string>) {
  if (entries.length === 0) {
    return "无"
  }

  return entries
    .map((entry) => `${itemNameById.get(entry.itemId) ?? entry.itemId}x${entry.quantity}`)
    .join("、")
}

function sumTransferValue(entries: TradeTransferItem[], itemById: Map<string, Item>) {
  let total = 0

  for (const entry of entries) {
    if (entry.quantity <= 0) {
      continue
    }

    const item = itemById.get(entry.itemId)

    if (!item) {
      continue
    }

    total += item.value * entry.quantity
  }

  return total
}

function sumNonCurrencySelectionValue(inventory: Item[], selection: TradeSideSelection) {
  const itemById = new Map(inventory.map((item) => [item.id, item]))
  let total = 0

  for (const [itemId, quantity] of Object.entries(selection)) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      continue
    }

    const item = itemById.get(itemId)

    if (!item || item.category === ItemCategory.Currency) {
      continue
    }

    total += item.value * quantity
  }

  return total
}

function resolveAutoCurrencyTransfersPreview({
  inventory,
  manualSelection,
  resolvedSelection,
}: {
  inventory: Item[]
  manualSelection: TradeSideSelection
  resolvedSelection: TradeSideSelection
}): TradeTransferItem[] {
  const itemById = new Map(inventory.map((item) => [item.id, item]))
  const transfers: TradeTransferItem[] = []

  for (const [itemId, resolvedQuantity] of Object.entries(resolvedSelection)) {
    if (!Number.isInteger(resolvedQuantity) || resolvedQuantity <= 0) {
      continue
    }

    const manualQuantity = manualSelection[itemId] ?? 0
    const autoQuantity = resolvedQuantity - manualQuantity

    if (autoQuantity <= 0) {
      continue
    }

    const item = itemById.get(itemId)

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

export function TradePanel() {
  const npcSquads = useMemo(() => getNpcSquadTemplates(), [])
  const locationTargets = useMemo<TradeTargetRef[]>(() => {
    return WASTELAND_MAP_NODES.map((node) => ({
      type: "location",
      id: node.id,
      name: node.name,
      kind: node.kind,
    }))
  }, [])
  const squadTargets = useMemo<TradeTargetRef[]>(() => {
    return npcSquads.map((squad) => ({
      type: "npc-squad",
      id: squad.id,
      name: squad.name,
    }))
  }, [npcSquads])
  const { selectedTarget: contextTarget, setSelectedTarget } = useTradeNavigation()
  const [netSelectionByTarget, setNetSelectionByTarget] = useState<Record<string, TradeNetSelection>>(
    {}
  )
  const [tradeMessageByTarget, setTradeMessageByTarget] = useState<
    Record<string, string | null>
  >({})
  const targetType: TradeTargetType = contextTarget?.type ?? "location"
  const targets = targetType === "location" ? locationTargets : squadTargets
  const selectedTarget =
    targets.find((target) => target.id === contextTarget?.id) ?? targets[0] ?? null
  const targetId = selectedTarget?.id ?? ""
  const targetKey = selectedTarget ? `${selectedTarget.type}:${selectedTarget.id}` : "none"
  const netSelection = useMemo(() => {
    return netSelectionByTarget[targetKey] ?? EMPTY_NET_SELECTION
  }, [netSelectionByTarget, targetKey])
  const tradeMessage = tradeMessageByTarget[targetKey] ?? null
  const playerItems = getPlayerTeamInventory()
  const targetItems = useMemo(() => {
    if (!selectedTarget) {
      return [] as Item[]
    }

    return selectedTarget.type === "location"
      ? getLocationInventoryById(selectedTarget.id)
      : getNpcSquadInventoryById(selectedTarget.id)
  }, [selectedTarget])
  const restrictions = useMemo(() => {
    if (!selectedTarget) {
      return EMPTY_RESTRICTIONS
    }

    if (selectedTarget.type === "location") {
      return resolveLocationTradeRestrictions(selectedTarget.kind ?? "settlement")
    }

    return resolveNpcSquadTradeRestrictions(selectedTarget.id)
  }, [selectedTarget])
  const blockedBuyCategories = useMemo(
    () => new Set(restrictions.blockedBuyFromPlayer),
    [restrictions.blockedBuyFromPlayer]
  )
  const blockedSellCategories = useMemo(
    () => new Set(restrictions.blockedSellToPlayer),
    [restrictions.blockedSellToPlayer]
  )
  const rows = useMemo(
    () =>
      buildTradeRows({
        playerItems,
        targetItems,
        blockedBuyCategories,
        blockedSellCategories,
        netSelection,
      }),
    [blockedBuyCategories, blockedSellCategories, netSelection, playerItems, targetItems]
  )
  const normalizedNetSelection = useMemo(() => {
    const nextSelection: TradeNetSelection = {}

    for (const row of rows) {
      if (row.netQuantity === 0) {
        continue
      }

      nextSelection[row.itemId] = row.netQuantity
    }

    return nextSelection
  }, [rows])
  const { playerOfferSelection, targetOfferSelection } = useMemo(() => {
    if (!selectedTarget) {
      return {
        playerOfferSelection: EMPTY_SELECTION,
        targetOfferSelection: EMPTY_SELECTION,
      }
    }

    return splitNetSelection(normalizedNetSelection)
  }, [normalizedNetSelection, selectedTarget])
  const rowById = useMemo(() => {
    return new Map(rows.map((row) => [row.itemId, row]))
  }, [rows])
  const playerItemById = useMemo(() => {
    return new Map(playerItems.map((item) => [item.id, item]))
  }, [playerItems])
  const targetItemById = useMemo(() => {
    return new Map(targetItems.map((item) => [item.id, item]))
  }, [targetItems])
  const itemNameById = useMemo(() => {
    const itemNameEntries = [...playerItems, ...targetItems].map((item) => [item.id, item.name] as const)
    return new Map(itemNameEntries)
  }, [playerItems, targetItems])
  const validation = useMemo(() => {
    if (!selectedTarget) {
      return {
        ok: false,
        reason: "请选择交易对象。",
        offeredValue: 0,
        requestedValue: 0,
        resolvedPlayerOfferSelection: EMPTY_SELECTION,
        resolvedTargetOfferSelection: EMPTY_SELECTION,
        settlementDelta: 0,
        settlementExact: true,
        settlementNote: null,
      }
    }

    return validateTrade({
      playerItems,
      targetItems,
      playerOfferSelection,
      targetOfferSelection,
      restrictions,
    })
  }, [
    playerItems,
    playerOfferSelection,
    restrictions,
    selectedTarget,
    targetItems,
    targetOfferSelection,
  ])
  const offeredNonCurrencyValue = useMemo(() => {
    return sumNonCurrencySelectionValue(playerItems, playerOfferSelection)
  }, [playerItems, playerOfferSelection])
  const requestedNonCurrencyValue = useMemo(() => {
    return sumNonCurrencySelectionValue(targetItems, targetOfferSelection)
  }, [targetItems, targetOfferSelection])
  const netNonCurrencyValue = useMemo(() => {
    return offeredNonCurrencyValue - requestedNonCurrencyValue
  }, [offeredNonCurrencyValue, requestedNonCurrencyValue])
  const autoCurrencyGivenPreview = useMemo(() => {
    return resolveAutoCurrencyTransfersPreview({
      inventory: playerItems,
      manualSelection: playerOfferSelection,
      resolvedSelection: validation.resolvedPlayerOfferSelection,
    })
  }, [playerItems, playerOfferSelection, validation.resolvedPlayerOfferSelection])
  const autoCurrencyReceivedPreview = useMemo(() => {
    return resolveAutoCurrencyTransfersPreview({
      inventory: targetItems,
      manualSelection: targetOfferSelection,
      resolvedSelection: validation.resolvedTargetOfferSelection,
    })
  }, [targetItems, targetOfferSelection, validation.resolvedTargetOfferSelection])
  const autoCurrencyPaidValue = useMemo(() => {
    return sumTransferValue(autoCurrencyGivenPreview, playerItemById)
  }, [autoCurrencyGivenPreview, playerItemById])
  const autoCurrencyIncomeValue = useMemo(() => {
    return sumTransferValue(autoCurrencyReceivedPreview, targetItemById)
  }, [autoCurrencyReceivedPreview, targetItemById])
  const autoCurrencyPaidEntries = useMemo(() => {
    return formatTransferEntries(autoCurrencyGivenPreview, itemNameById)
  }, [autoCurrencyGivenPreview, itemNameById])
  const autoCurrencyIncomeEntries = useMemo(() => {
    return formatTransferEntries(autoCurrencyReceivedPreview, itemNameById)
  }, [autoCurrencyReceivedPreview, itemNameById])

  const handleTargetTypeChange = (value: string) => {
    const nextType = value as TradeTargetType
    const nextTargets = nextType === "location" ? locationTargets : squadTargets
    setSelectedTarget(nextTargets[0] ?? null)
  }

  const handleTargetIdChange = (nextTargetId: string) => {
    const nextTarget = targets.find((target) => target.id === nextTargetId) ?? null
    setSelectedTarget(nextTarget)
  }

  const handleAdjustItem = (itemId: string, delta: number) => {
    const row = rowById.get(itemId)

    if (!row) {
      return
    }

    const nextQuantity = clampQuantity(row.netQuantity + delta, row.minNet, row.maxNet)

    setNetSelectionByTarget((prev) => ({
      ...prev,
      [targetKey]: updateNetSelection(prev[targetKey] ?? EMPTY_NET_SELECTION, itemId, nextQuantity),
    }))
  }

  const setTradeMessage = (message: string | null) => {
    setTradeMessageByTarget((prev) => ({
      ...prev,
      [targetKey]: message,
    }))
  }

  const handleConfirmTrade = () => {
    if (!selectedTarget) {
      return
    }

    const result = applySessionTrade({
      target: selectedTarget,
      restrictions,
      playerOfferSelection,
      targetOfferSelection,
    })

    if (!result.ok) {
      setTradeMessage(result.reason)
      return
    }

    const autoPaid = formatTransferEntries(result.autoPlayerCurrencyGiven, itemNameById)
    const autoChanged = formatTransferEntries(result.autoPlayerCurrencyReceived, itemNameById)
    const autoPaidValue = sumTransferValue(result.autoPlayerCurrencyGiven, playerItemById)
    const autoChangedValue = sumTransferValue(result.autoPlayerCurrencyReceived, targetItemById)
    const settlementSummary = result.settlementExact
      ? "已精确结算。"
      : `采用最接近结算，差额+${result.settlementDelta}。`

    setTradeMessage(
      `交易成功：我售出总价值${offeredNonCurrencyValue}，我购入总价值${requestedNonCurrencyValue}，净值(售出-购入)${netNonCurrencyValue}。货币支出总额${autoPaidValue}（${autoPaid}）；货币收入总额${autoChangedValue}（${autoChanged}）；${settlementSummary}`
    )
    setNetSelectionByTarget((prev) => ({
      ...prev,
      [targetKey]: {},
    }))
  }

  return (
    <PanelShell title="交易" description="与地点或NPC队伍进行双向交易。">
      <Card size="sm">
        <CardHeader>
          <CardTitle>交易对象</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trade-target-type">对象类型</Label>
            <Select value={targetType} onValueChange={handleTargetTypeChange}>
              <SelectTrigger id="trade-target-type" className="w-full">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="location">{TARGET_TYPE_LABEL.location}</SelectItem>
                <SelectItem value="npc-squad">{TARGET_TYPE_LABEL["npc-squad"]}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trade-target-id">交易对象</Label>
            <Select value={targetId} onValueChange={handleTargetIdChange}>
              <SelectTrigger id="trade-target-id" className="w-full">
                <SelectValue placeholder="选择对象" />
              </SelectTrigger>
              <SelectContent>
                {targets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    {target.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>交易限制</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            对方拒绝购入: {formatBlockedCategories(restrictions.blockedBuyFromPlayer)}
          </p>
          <p>
            对方拒绝卖出: {formatBlockedCategories(restrictions.blockedSellToPlayer)}
          </p>
          <p className="text-muted-foreground text-xs">
            货币不进入交易列表；提交后系统会自动使用货币结算与找零，并提示最终差额。
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>交易明细</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无可交易物品。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>物品名</TableHead>
                  <TableHead className="text-right">价格</TableHead>
                  <TableHead className="text-right">对方数量</TableHead>
                  <TableHead className="w-44 text-center">操作按钮</TableHead>
                  <TableHead className="text-right">我的数量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const disableDecrease = row.blockedBuyFromPlayer || row.netQuantity <= row.minNet
                  const disableIncrease = row.blockedSellToPlayer || row.netQuantity >= row.maxNet
                  const strikeClassName = row.deprioritized
                    ? "line-through text-muted-foreground"
                    : ""

                  return (
                    <TableRow key={row.itemId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${strikeClassName}`}>{row.name}</span>
                          {row.blockedBuyFromPlayer ? (
                            <Badge variant="secondary">对方拒收</Badge>
                          ) : null}
                          {row.blockedSellToPlayer ? (
                            <Badge variant="secondary">对方拒售</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.value}</TableCell>
                      <TableCell className={`text-right tabular-nums ${strikeClassName}`}>
                        {row.targetQuantity}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            aria-label={`减少${row.name}`}
                            onClick={() => handleAdjustItem(row.itemId, -1)}
                            disabled={disableDecrease}
                          >
                            -
                          </Button>
                          <span
                            data-testid={`trade-net-${row.itemId}`}
                            className="inline-block min-w-10 text-center tabular-nums"
                          >
                            {formatNetQuantity(row.netQuantity)}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            aria-label={`增加${row.name}`}
                            onClick={() => handleAdjustItem(row.itemId, 1)}
                            disabled={disableIncrease}
                          >
                            +
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${strikeClassName}`}>
                        {row.playerQuantity}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>结算</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>我售出总价值: {offeredNonCurrencyValue}</p>
          <p>我购入总价值: {requestedNonCurrencyValue}</p>
          <p>净值: {netNonCurrencyValue}</p>
          <p>
            货币支出总额: {autoCurrencyPaidValue}
            <span className="text-muted-foreground text-sm">（{autoCurrencyPaidEntries}）</span>
          </p>
          <p>
            货币收入总额: {autoCurrencyIncomeValue}
            <span className="text-muted-foreground text-sm">（{autoCurrencyIncomeEntries}）</span>
          </p>
          <p>结算差额: {validation.settlementDelta}</p>
          {validation.ok ? (
            <p className="text-muted-foreground">
              {validation.settlementExact
                ? "当前交易可精确结算，可提交。"
                : validation.settlementNote ?? `当前交易为最接近结算，差额+${validation.settlementDelta}。`}
            </p>
          ) : (
            <p className="text-destructive">{validation.reason}</p>
          )}
          {tradeMessage ? <p className="text-muted-foreground">{tradeMessage}</p> : null}
          <Button onClick={handleConfirmTrade} disabled={!validation.ok}>
            确认交易
          </Button>
        </CardContent>
      </Card>
    </PanelShell>
  )
}
