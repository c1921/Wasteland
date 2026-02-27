import {
  Character,
  Gender,
  type CharacterAbilities,
  type CharacterSkills,
} from "@/features/character/types"

const DEFAULT_COUNT = 4
const MIN_ABILITY = 0
const MAX_ABILITY = 100
const MIN_SKILL = 0
const MAX_SKILL = 20

const NAME_PREFIXES = [
  "灰烬",
  "铁",
  "夜",
  "尘",
  "霜",
  "裂",
  "荒",
  "赤",
  "静",
  "断",
]

const NAME_SUFFIXES = [
  "猞猁",
  "缄",
  "枭",
  "牙",
  "鸦",
  "犬",
  "锚",
  "砂",
  "锋",
  "旅人",
]

const GENDERS: Gender[] = [Gender.Male, Gender.Female, Gender.Unknown]

const ABILITY_KEYS: Array<keyof CharacterAbilities> = [
  "strength",
  "agility",
  "intelligence",
  "endurance",
]

const SKILL_KEYS: Array<keyof CharacterSkills> = [
  "shooting",
  "melee",
  "stealth",
  "scouting",
  "survival",
  "medical",
  "engineering",
  "salvaging",
  "driving",
  "negotiation",
  "taming",
  "crafting",
]

export type CharacterGeneratorOptions = {
  count?: number
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(items: T[]) {
  return items[randomInt(0, items.length - 1)]
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function buildAbilities(): CharacterAbilities {
  const abilities = {} as CharacterAbilities

  for (const key of ABILITY_KEYS) {
    abilities[key] = clamp(randomInt(40, 95), MIN_ABILITY, MAX_ABILITY)
  }

  return abilities
}

function buildSkills(): CharacterSkills {
  const skills = {} as CharacterSkills

  for (const key of SKILL_KEYS) {
    skills[key] = clamp(randomInt(3, 20), MIN_SKILL, MAX_SKILL)
  }

  return skills
}

function buildName() {
  return `${pickRandom(NAME_PREFIXES)}${pickRandom(NAME_SUFFIXES)}`
}

function buildUniqueId(index: number, usedIds: Set<string>) {
  let id = ""

  do {
    const token = Math.random().toString(36).slice(2, 8)
    id = `generated-${index + 1}-${token}`
  } while (usedIds.has(id))

  usedIds.add(id)
  return id
}

export function generateCharacters(
  options: CharacterGeneratorOptions = {}
): Character[] {
  const rawCount = options.count ?? DEFAULT_COUNT
  const count = Math.max(0, Math.floor(rawCount))
  const usedIds = new Set<string>()

  return Array.from({ length: count }, (_, index) => {
    return new Character({
      id: buildUniqueId(index, usedIds),
      name: buildName(),
      gender: pickRandom(GENDERS),
      abilities: buildAbilities(),
      skills: buildSkills(),
    })
  })
}
