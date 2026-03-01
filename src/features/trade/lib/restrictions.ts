import { ItemCategory, type ItemCategory as ItemCategoryValue } from "@/features/items/types"
import type { MapNodeKind } from "@/features/map/types"
import type { TradeRestrictionProfile } from "@/features/trade/types"

const ALWAYS_ACCEPTED_CATEGORIES: Set<ItemCategoryValue> = new Set([
  ItemCategory.Currency,
  ItemCategory.PreciousMetal,
])

const LOCATION_RESTRICTION_MAP: Record<MapNodeKind, TradeRestrictionProfile> = {
  settlement: {
    blockedBuyFromPlayer: [ItemCategory.Weapon],
    blockedSellToPlayer: [ItemCategory.Medicine],
  },
  ruin: {
    blockedBuyFromPlayer: [ItemCategory.Food, ItemCategory.Clothing],
    blockedSellToPlayer: [ItemCategory.Armor, ItemCategory.Medicine],
  },
  outpost: {
    blockedBuyFromPlayer: [ItemCategory.Food],
    blockedSellToPlayer: [ItemCategory.Weapon, ItemCategory.Armor],
  },
  hazard: {
    blockedBuyFromPlayer: [
      ItemCategory.Food,
      ItemCategory.Clothing,
      ItemCategory.Medicine,
    ],
    blockedSellToPlayer: [ItemCategory.Food, ItemCategory.Tool, ItemCategory.Medicine],
  },
}

const NPC_RESTRICTION_PRESETS: TradeRestrictionProfile[] = [
  {
    blockedBuyFromPlayer: [ItemCategory.Material],
    blockedSellToPlayer: [ItemCategory.Weapon],
  },
  {
    blockedBuyFromPlayer: [ItemCategory.Weapon, ItemCategory.Armor],
    blockedSellToPlayer: [ItemCategory.Medicine],
  },
  {
    blockedBuyFromPlayer: [ItemCategory.Clothing],
    blockedSellToPlayer: [ItemCategory.Tool, ItemCategory.Material],
  },
  {
    blockedBuyFromPlayer: [ItemCategory.Food, ItemCategory.Medicine],
    blockedSellToPlayer: [ItemCategory.Armor],
  },
]

function sanitizeCategories(categories: TradeRestrictionProfile["blockedBuyFromPlayer"]) {
  return [...new Set(categories)].filter((category) => {
    return !ALWAYS_ACCEPTED_CATEGORIES.has(category)
  })
}

function sanitizeProfile(profile: TradeRestrictionProfile): TradeRestrictionProfile {
  return {
    blockedBuyFromPlayer: sanitizeCategories(profile.blockedBuyFromPlayer),
    blockedSellToPlayer: sanitizeCategories(profile.blockedSellToPlayer),
  }
}

function hashString(input: string) {
  let hash = 0

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }

  return hash
}

export function resolveLocationTradeRestrictions(kind: MapNodeKind) {
  return sanitizeProfile(LOCATION_RESTRICTION_MAP[kind])
}

export function resolveNpcSquadTradeRestrictions(squadId: string) {
  const hash = hashString(squadId)
  const preset = NPC_RESTRICTION_PRESETS[hash % NPC_RESTRICTION_PRESETS.length]
  return sanitizeProfile(preset)
}

export function isAlwaysAcceptedTradeCategory(category: ItemCategoryValue) {
  return ALWAYS_ACCEPTED_CATEGORIES.has(category)
}
