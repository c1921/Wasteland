export const ItemCategory = {
  Weapon: "weapon",
  Armor: "armor",
  Clothing: "clothing",
  Food: "food",
  Tool: "tool",
  Material: "material",
  Medicine: "medicine",
} as const

export type ItemCategory = (typeof ItemCategory)[keyof typeof ItemCategory]

export const ITEM_CATEGORY_LABEL: Record<ItemCategory, string> = {
  [ItemCategory.Weapon]: "武器",
  [ItemCategory.Armor]: "防具",
  [ItemCategory.Clothing]: "衣服",
  [ItemCategory.Food]: "食物",
  [ItemCategory.Tool]: "工具",
  [ItemCategory.Material]: "材料",
  [ItemCategory.Medicine]: "药物",
}

export type ItemProfile = {
  id: string
  name: string
  category: ItemCategory
  weight: number
  value: number
  quantity: number
}

export class Item {
  readonly id: string
  readonly name: string
  readonly category: ItemCategory
  readonly weight: number
  readonly value: number
  readonly quantity: number

  constructor(profile: ItemProfile) {
    this.id = profile.id
    this.name = profile.name
    this.category = profile.category
    this.weight = profile.weight
    this.value = profile.value
    this.quantity = profile.quantity
  }

  toJSON(): ItemProfile {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      weight: this.weight,
      value: this.value,
      quantity: this.quantity,
    }
  }
}

export type InventoryOwnerType = "player-team" | "npc-squad" | "location"
export type InventoryMap = Record<string, Item[]>
