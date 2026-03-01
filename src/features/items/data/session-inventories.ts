import { getGameSessionStore } from "@/engine/session/game-session-store"
import { generateRandomItems } from "@/features/items/lib/generator"
import { Item, type InventoryMap } from "@/features/items/types"

const PLAYER_TEAM_COUNT_MIN = 6
const PLAYER_TEAM_COUNT_MAX = 10
const LOCATION_COUNT_MIN = 4
const LOCATION_COUNT_MAX = 8
const NPC_SQUAD_COUNT_MIN = 3
const NPC_SQUAD_COUNT_MAX = 7

const SESSION_PLAYER_TEAM_INVENTORY_KEY = "items.player-team-inventory"
const SESSION_LOCATION_INVENTORY_MAP_KEY = "items.location-inventory-map"
const SESSION_NPC_SQUAD_INVENTORY_MAP_KEY = "items.npc-squad-inventory-map"

export type InventoryOwnerRef =
  | { type: "player-team" }
  | { type: "location"; id: string }
  | { type: "npc-squad"; id: string }

type TransferSelection = Record<string, number>
type TransferEntry = { itemId: string; quantity: number }

export type InventoryTransferResult =
  | { ok: true }
  | { ok: false; reason: string }

function ensureInventory(
  targetMap: InventoryMap,
  ownerId: string,
  countMin: number,
  countMax: number
) {
  if (!targetMap[ownerId]) {
    targetMap[ownerId] = generateRandomItems({
      countMin,
      countMax,
    })
  }
}

function buildInventorySlice(sourceMap: InventoryMap, ownerIds: string[]) {
  const result: InventoryMap = {}

  for (const ownerId of ownerIds) {
    if (sourceMap[ownerId]) {
      result[ownerId] = sourceMap[ownerId]
    }
  }

  return result
}

function cloneItemWithQuantity(item: Item, quantity: number) {
  return new Item({
    ...item.toJSON(),
    quantity,
  })
}

function resolveTransferEntries(selection: TransferSelection) {
  const entries: TransferEntry[] = []

  for (const [itemId, rawQuantity] of Object.entries(selection)) {
    if (!Number.isInteger(rawQuantity) || rawQuantity < 0) {
      return {
        ok: false as const,
        reason: "交易数量必须为大于等于0的整数。",
      }
    }

    if (rawQuantity === 0) {
      continue
    }

    entries.push({
      itemId,
      quantity: rawQuantity,
    })
  }

  return {
    ok: true as const,
    entries,
  }
}

function resolveTargetInventoryMap(owner: InventoryOwnerRef) {
  if (owner.type === "location") {
    return getSessionLocationInventoryMap()
  }

  return getSessionNpcSquadInventoryMap()
}

function getTargetInventoryById(owner: Extract<InventoryOwnerRef, { id: string }>) {
  const sourceMap = resolveTargetInventoryMap(owner)

  if (!sourceMap[owner.id]) {
    const [countMin, countMax] =
      owner.type === "location"
        ? [LOCATION_COUNT_MIN, LOCATION_COUNT_MAX]
        : [NPC_SQUAD_COUNT_MIN, NPC_SQUAD_COUNT_MAX]

    ensureInventory(sourceMap, owner.id, countMin, countMax)
  }

  return sourceMap[owner.id]
}

function getMutableInventoryByOwner(owner: InventoryOwnerRef): Item[] {
  if (owner.type === "player-team") {
    return getPlayerTeamInventory()
  }

  return getTargetInventoryById(owner)
}

function replaceInventoryByOwnerUnsafe(owner: InventoryOwnerRef, items: Item[]) {
  const store = getGameSessionStore()

  if (owner.type === "player-team") {
    store.set(SESSION_PLAYER_TEAM_INVENTORY_KEY, items)
    return
  }

  const sourceMap = resolveTargetInventoryMap(owner)
  sourceMap[owner.id] = items
}

function removeItemsFromInventory(
  source: Item[],
  entries: TransferEntry[]
): { ok: true; nextSource: Item[]; movedEntries: TransferEntry[] } | { ok: false; reason: string } {
  const sourceMap = new Map(source.map((item) => [item.id, item]))

  for (const entry of entries) {
    const sourceItem = sourceMap.get(entry.itemId)

    if (!sourceItem) {
      return {
        ok: false,
        reason: "源库存缺少待转移物品。",
      }
    }

    if (entry.quantity > sourceItem.quantity) {
      return {
        ok: false,
        reason: "待转移数量超过源库存。",
      }
    }
  }

  const quantityMap = new Map(entries.map((entry) => [entry.itemId, entry.quantity]))
  const nextSource: Item[] = []
  const movedEntries: TransferEntry[] = []

  for (const item of source) {
    const movedQuantity = quantityMap.get(item.id) ?? 0

    if (movedQuantity <= 0) {
      nextSource.push(item)
      continue
    }

    const remain = item.quantity - movedQuantity
    movedEntries.push({
      itemId: item.id,
      quantity: movedQuantity,
    })

    if (remain > 0) {
      nextSource.push(cloneItemWithQuantity(item, remain))
    }
  }

  return {
    ok: true,
    nextSource,
    movedEntries,
  }
}

function addItemsToInventory(base: Item[], moved: TransferEntry[], sourceInventory: Item[]) {
  const baseItems = base.slice()
  const baseIndexMap = new Map(baseItems.map((item, index) => [item.id, index]))
  const sourceMap = new Map(sourceInventory.map((item) => [item.id, item]))

  for (const movedEntry of moved) {
    const sourceItem = sourceMap.get(movedEntry.itemId)

    if (!sourceItem) {
      continue
    }

    const existingIndex = baseIndexMap.get(movedEntry.itemId)

    if (existingIndex === undefined) {
      baseItems.push(cloneItemWithQuantity(sourceItem, movedEntry.quantity))
      baseIndexMap.set(movedEntry.itemId, baseItems.length - 1)
      continue
    }

    const existingItem = baseItems[existingIndex]
    baseItems[existingIndex] = cloneItemWithQuantity(
      existingItem,
      existingItem.quantity + movedEntry.quantity
    )
  }

  return baseItems
}

function isSameInventoryOwner(source: InventoryOwnerRef, target: InventoryOwnerRef) {
  if (source.type !== target.type) {
    return false
  }

  if (source.type === "player-team") {
    return true
  }

  if ("id" in source && "id" in target) {
    return source.id === target.id
  }

  return false
}

export function getPlayerTeamInventory() {
  const store = getGameSessionStore()
  const existing = store.get<Item[] | null>(SESSION_PLAYER_TEAM_INVENTORY_KEY)

  if (!existing) {
    const generated = generateRandomItems({
      countMin: PLAYER_TEAM_COUNT_MIN,
      countMax: PLAYER_TEAM_COUNT_MAX,
    })
    store.set(SESSION_PLAYER_TEAM_INVENTORY_KEY, generated)
    return generated
  }

  return existing
}

export function getLocationInventoryById(nodeId: string) {
  return getTargetInventoryById({
    type: "location",
    id: nodeId,
  })
}

export function getNpcSquadInventoryById(squadId: string) {
  return getTargetInventoryById({
    type: "npc-squad",
    id: squadId,
  })
}

export function getLocationInventoryMap(nodeIds: string[]) {
  const sessionLocationInventoryMap = getSessionLocationInventoryMap()

  for (const nodeId of nodeIds) {
    ensureInventory(
      sessionLocationInventoryMap,
      nodeId,
      LOCATION_COUNT_MIN,
      LOCATION_COUNT_MAX
    )
  }

  return buildInventorySlice(sessionLocationInventoryMap, nodeIds)
}

export function getNpcSquadInventoryMap(squadIds: string[]) {
  const sessionNpcSquadInventoryMap = getSessionNpcSquadInventoryMap()

  for (const squadId of squadIds) {
    ensureInventory(
      sessionNpcSquadInventoryMap,
      squadId,
      NPC_SQUAD_COUNT_MIN,
      NPC_SQUAD_COUNT_MAX
    )
  }

  return buildInventorySlice(sessionNpcSquadInventoryMap, squadIds)
}

export function getInventoryByOwner(owner: InventoryOwnerRef) {
  return getMutableInventoryByOwner(owner)
}

export function replaceInventoryByOwner(owner: InventoryOwnerRef, items: Item[]) {
  replaceInventoryByOwnerUnsafe(owner, items)
}

export function applyInventoryTransfer({
  source,
  target,
  selection,
}: {
  source: InventoryOwnerRef
  target: InventoryOwnerRef
  selection: TransferSelection
}): InventoryTransferResult {
  if (isSameInventoryOwner(source, target)) {
    return {
      ok: false,
      reason: "源库存与目标库存不能相同。",
    }
  }

  const resolved = resolveTransferEntries(selection)

  if (!resolved.ok) {
    return resolved
  }

  if (resolved.entries.length === 0) {
    return {
      ok: false,
      reason: "未选择任何转移物品。",
    }
  }

  const sourceInventory = getMutableInventoryByOwner(source)
  const targetInventory = getMutableInventoryByOwner(target)
  const removed = removeItemsFromInventory(sourceInventory, resolved.entries)

  if (!removed.ok) {
    return removed
  }

  const nextTarget = addItemsToInventory(
    targetInventory,
    removed.movedEntries,
    sourceInventory
  )

  replaceInventoryByOwnerUnsafe(source, removed.nextSource)
  replaceInventoryByOwnerUnsafe(target, nextTarget)

  return {
    ok: true,
  }
}

export function resetInventorySession() {
  const store = getGameSessionStore()
  store.delete(SESSION_PLAYER_TEAM_INVENTORY_KEY)
  store.delete(SESSION_LOCATION_INVENTORY_MAP_KEY)
  store.delete(SESSION_NPC_SQUAD_INVENTORY_MAP_KEY)
}

function getSessionLocationInventoryMap() {
  return getSessionInventoryMap(SESSION_LOCATION_INVENTORY_MAP_KEY)
}

function getSessionNpcSquadInventoryMap() {
  return getSessionInventoryMap(SESSION_NPC_SQUAD_INVENTORY_MAP_KEY)
}

function getSessionInventoryMap(key: string) {
  const store = getGameSessionStore()
  const existing = store.get<InventoryMap>(key)

  if (existing) {
    return existing
  }

  const created: InventoryMap = {}
  store.set(key, created)
  return created
}
