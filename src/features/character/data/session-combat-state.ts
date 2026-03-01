import { getGameSessionStore } from "@/engine/session/game-session-store"

export type CharacterCombatState = {
  characterId: string
  maxHp: number
  hp: number
  morale: number
  alive: boolean
  routing: boolean
}

export type CharacterCombatStateUpdate = {
  characterId: string
  maxHp: number
  hp: number
  morale: number
  alive: boolean
  routing: boolean
}

const DEFAULT_MAX_HP = 100
const DEFAULT_MORALE = 100

const SESSION_COMBAT_STATE_MAP_KEY = "character.combat-state-map"

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function toSafeState(
  update: CharacterCombatStateUpdate | CharacterCombatState
): CharacterCombatState {
  const maxHp = Math.max(1, Math.round(update.maxHp))
  const hp = clamp(Math.round(update.hp), 0, maxHp)
  const morale = clamp(Math.round(update.morale), 0, 100)
  const alive = update.alive && hp > 0
  const routing = !alive ? true : update.routing

  return {
    characterId: update.characterId,
    maxHp,
    hp: alive ? hp : 0,
    morale,
    alive,
    routing,
  }
}

function cloneState(state: CharacterCombatState): CharacterCombatState {
  return {
    characterId: state.characterId,
    maxHp: state.maxHp,
    hp: state.hp,
    morale: state.morale,
    alive: state.alive,
    routing: state.routing,
  }
}

export function getCharacterCombatState(characterId: string) {
  const sessionCombatStateMap = getPersistedCombatStateMap()
  const existing = sessionCombatStateMap[characterId]

  if (existing) {
    return cloneState(existing)
  }

  return {
    characterId,
    maxHp: DEFAULT_MAX_HP,
    hp: DEFAULT_MAX_HP,
    morale: DEFAULT_MORALE,
    alive: true,
    routing: false,
  }
}

export function getCombatStatesByCharacterIds(characterIds: string[]) {
  const result: Record<string, CharacterCombatState> = {}

  for (const characterId of characterIds) {
    result[characterId] = getCharacterCombatState(characterId)
  }

  return result
}

export function getPersistedCombatStatesByCharacterIds(characterIds: string[]) {
  const sessionCombatStateMap = getPersistedCombatStateMap()
  const result: Record<string, CharacterCombatState> = {}

  for (const characterId of characterIds) {
    const state = sessionCombatStateMap[characterId]

    if (state) {
      result[characterId] = cloneState(state)
    }
  }

  return result
}

export function applyCharacterCombatResult(updates: CharacterCombatStateUpdate[]) {
  const sessionCombatStateMap = getMutableCombatStateMap()

  for (const update of updates) {
    sessionCombatStateMap[update.characterId] = toSafeState(update)
  }
}

export function resetCharacterCombatState(characterIds?: string[]) {
  const store = getGameSessionStore()
  const sessionCombatStateMap = store.get<Record<string, CharacterCombatState>>(
    SESSION_COMBAT_STATE_MAP_KEY
  )

  if (!sessionCombatStateMap) {
    return
  }

  if (!characterIds) {
    store.delete(SESSION_COMBAT_STATE_MAP_KEY)
    return
  }

  for (const characterId of characterIds) {
    delete sessionCombatStateMap[characterId]
  }
}

function getPersistedCombatStateMap() {
  const store = getGameSessionStore()
  return store.get<Record<string, CharacterCombatState>>(SESSION_COMBAT_STATE_MAP_KEY) ?? {}
}

function getMutableCombatStateMap() {
  const store = getGameSessionStore()
  const existing = store.get<Record<string, CharacterCombatState>>(SESSION_COMBAT_STATE_MAP_KEY)

  if (existing) {
    return existing
  }

  const created: Record<string, CharacterCombatState> = {}
  store.set(SESSION_COMBAT_STATE_MAP_KEY, created)
  return created
}
