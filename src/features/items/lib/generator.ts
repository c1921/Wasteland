import { ITEM_CATALOG, type ItemTemplate } from "@/features/items/data/catalog"
import { Item, ItemCategory, type ItemCategory as ItemCategoryValue } from "@/features/items/types"

const DEFAULT_COUNT_MIN = 3
const DEFAULT_COUNT_MAX = 7

export type QuantityRule = Record<ItemCategoryValue, { min: number; max: number }>

export const DEFAULT_QUANTITY_RULES: QuantityRule = {
  [ItemCategory.Weapon]: { min: 1, max: 2 },
  [ItemCategory.Armor]: { min: 1, max: 2 },
  [ItemCategory.Clothing]: { min: 1, max: 2 },
  [ItemCategory.Food]: { min: 1, max: 6 },
  [ItemCategory.Tool]: { min: 1, max: 3 },
  [ItemCategory.Material]: { min: 1, max: 6 },
  [ItemCategory.Medicine]: { min: 1, max: 6 },
}

export type GenerateRandomItemsOptions = {
  countMin?: number
  countMax?: number
  catalog?: ItemTemplate[]
  quantityRules?: QuantityRule
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function resolveRange(min: number, max: number) {
  const safeMin = Math.max(0, Math.floor(min))
  const safeMax = Math.max(safeMin, Math.floor(max))
  return {
    min: safeMin,
    max: safeMax,
  }
}

function pickRandomUniqueItems(source: ItemTemplate[], count: number) {
  const pool = source.slice()
  const picked: ItemTemplate[] = []

  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const index = randomInt(0, pool.length - 1)
    const [selected] = pool.splice(index, 1)
    picked.push(selected)
  }

  return picked
}

function resolveQuantity(template: ItemTemplate, rules: QuantityRule) {
  const categoryRule = rules[template.category]
  const range = resolveRange(categoryRule.min, categoryRule.max)
  return randomInt(range.min, range.max)
}

function sanitizeCatalog(source: ItemTemplate[]) {
  return source.filter((item) => {
    return (
      item.id.trim().length > 0 &&
      item.name.trim().length > 0 &&
      Number.isFinite(item.weight) &&
      item.weight >= 0 &&
      Number.isFinite(item.value) &&
      item.value >= 0
    )
  })
}

export function generateRandomItems(
  options: GenerateRandomItemsOptions = {}
): Item[] {
  const source = sanitizeCatalog(options.catalog ?? ITEM_CATALOG)

  if (source.length === 0) {
    return []
  }

  const countRange = resolveRange(
    options.countMin ?? DEFAULT_COUNT_MIN,
    options.countMax ?? DEFAULT_COUNT_MAX
  )
  const requested = randomInt(countRange.min, countRange.max)
  const count = Math.min(source.length, requested)
  const quantityRules = options.quantityRules ?? DEFAULT_QUANTITY_RULES
  const picked = pickRandomUniqueItems(source, count)

  return picked.map((template) => {
    return new Item({
      id: template.id,
      name: template.name,
      category: template.category,
      weight: template.weight,
      value: template.value,
      quantity: resolveQuantity(template, quantityRules),
    })
  })
}
