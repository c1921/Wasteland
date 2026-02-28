import { generateRandomItems } from "@/features/items/lib/generator"
import type { InventoryMap, Item } from "@/features/items/types"

const PLAYER_TEAM_COUNT_MIN = 6
const PLAYER_TEAM_COUNT_MAX = 10
const LOCATION_COUNT_MIN = 4
const LOCATION_COUNT_MAX = 8
const NPC_SQUAD_COUNT_MIN = 3
const NPC_SQUAD_COUNT_MAX = 7

let sessionPlayerTeamInventory: Item[] | null = null
const sessionLocationInventoryMap: InventoryMap = {}
const sessionNpcSquadInventoryMap: InventoryMap = {}

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

export function getPlayerTeamInventory() {
  if (!sessionPlayerTeamInventory) {
    sessionPlayerTeamInventory = generateRandomItems({
      countMin: PLAYER_TEAM_COUNT_MIN,
      countMax: PLAYER_TEAM_COUNT_MAX,
    })
  }

  return sessionPlayerTeamInventory
}

export function getLocationInventoryMap(nodeIds: string[]) {
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
