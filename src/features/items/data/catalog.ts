import { ItemCategory, type ItemCategory as ItemCategoryValue } from "@/features/items/types"

export type ItemTemplate = {
  id: string
  name: string
  category: ItemCategoryValue
  weight: number
  value: number
}

export const ITEM_CATALOG: ItemTemplate[] = [
  {
    id: "iron-pipe-rifle",
    name: "铁管步枪",
    category: ItemCategory.Weapon,
    weight: 4.2,
    value: 130,
  },
  {
    id: "scrap-machete",
    name: "废铁砍刀",
    category: ItemCategory.Weapon,
    weight: 2.8,
    value: 95,
  },
  {
    id: "patchwork-vest",
    name: "拼接护甲背心",
    category: ItemCategory.Armor,
    weight: 5.5,
    value: 210,
  },
  {
    id: "ceramic-knee-guard",
    name: "陶片护膝",
    category: ItemCategory.Armor,
    weight: 1.6,
    value: 88,
  },
  {
    id: "dustcloak-coat",
    name: "防尘披风",
    category: ItemCategory.Clothing,
    weight: 1.2,
    value: 60,
  },
  {
    id: "sandproof-boots",
    name: "防砂靴",
    category: ItemCategory.Clothing,
    weight: 1.4,
    value: 72,
  },
  {
    id: "dried-lizard-meat",
    name: "风干蜥肉",
    category: ItemCategory.Food,
    weight: 0.4,
    value: 15,
  },
  {
    id: "protein-brick",
    name: "蛋白块",
    category: ItemCategory.Food,
    weight: 0.5,
    value: 18,
  },
  {
    id: "multi-tool-kit",
    name: "多功能工具包",
    category: ItemCategory.Tool,
    weight: 2.1,
    value: 140,
  },
  {
    id: "hand-crank-lamp",
    name: "手摇应急灯",
    category: ItemCategory.Tool,
    weight: 1.1,
    value: 76,
  },
  {
    id: "scrap-metal-pack",
    name: "废金属包",
    category: ItemCategory.Material,
    weight: 3.6,
    value: 52,
  },
  {
    id: "composite-fiber-roll",
    name: "复合纤维卷",
    category: ItemCategory.Material,
    weight: 2.3,
    value: 85,
  },
  {
    id: "coagulation-injector",
    name: "止血注射剂",
    category: ItemCategory.Medicine,
    weight: 0.2,
    value: 58,
  },
  {
    id: "anti-radiation-pill",
    name: "抗辐射片",
    category: ItemCategory.Medicine,
    weight: 0.1,
    value: 42,
  },
]
