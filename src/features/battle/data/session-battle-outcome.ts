import type { BattleEncounterRef, BattleSide, BattleState } from "@/features/battle/types"
import {
  applyCharacterCombatResult,
} from "@/features/character/data/session-combat-state"
import {
  getNpcSquadById,
  removeNpcSquadById,
  replaceNpcSquadMembers,
} from "@/features/map/data/npc-squads"

export type BattleOutcomeSummary = {
  encounterId: string
  winnerSide: BattleSide | null
  playerAliveCount: number
  playerTotalCount: number
  enemyAliveCount: number
  enemyTotalCount: number
  enemyEliminated: boolean
  message: string
}

function countAliveUnits(state: BattleState, side: BattleSide) {
  const squad = state.squads.find((item) => item.side === side)

  if (!squad) {
    return {
      aliveCount: 0,
      totalCount: 0,
    }
  }

  return {
    aliveCount: squad.units.filter((unit) => unit.alive).length,
    totalCount: squad.units.length,
  }
}

function buildSummaryMessage({
  winnerSide,
  playerAliveCount,
  playerTotalCount,
  enemyAliveCount,
  enemyTotalCount,
}: {
  winnerSide: BattleSide | null
  playerAliveCount: number
  playerTotalCount: number
  enemyAliveCount: number
  enemyTotalCount: number
}) {
  const winnerLabel =
    winnerSide === null ? "平局" : winnerSide === "A" ? "我方胜利" : "敌方胜利"
  return `${winnerLabel}。我方存活${playerAliveCount}/${playerTotalCount}，敌方存活${enemyAliveCount}/${enemyTotalCount}。`
}

export function applyBattleOutcome({
  state,
  encounter,
}: {
  state: BattleState
  encounter: BattleEncounterRef
}) {
  const playerSquad = state.squads.find((squad) => squad.side === "A")
  const enemySquad = state.squads.find((squad) => squad.side === "B")

  if (playerSquad) {
    applyCharacterCombatResult(
      playerSquad.units.map((unit) => ({
        characterId: unit.id,
        maxHp: unit.maxHp,
        hp: unit.hp,
        morale: unit.morale,
        alive: unit.alive,
        routing: unit.routing,
      }))
    )
  }

  const enemyTemplate = getNpcSquadById(encounter.source.squadId)

  if (enemySquad && enemyTemplate) {
    const enemyUnitById = new Map(enemySquad.units.map((unit) => [unit.id, unit]))
    const survivingMembers = enemyTemplate.members.filter((member) => {
      const unit = enemyUnitById.get(member.id)
      return unit ? unit.alive : true
    })

    if (survivingMembers.length === 0) {
      removeNpcSquadById(encounter.source.squadId)
    } else {
      replaceNpcSquadMembers(encounter.source.squadId, survivingMembers)
    }
  }

  const playerCounts = countAliveUnits(state, "A")
  const enemyCounts = countAliveUnits(state, "B")

  return {
    encounterId: encounter.id,
    winnerSide: state.winnerSide,
    playerAliveCount: playerCounts.aliveCount,
    playerTotalCount: playerCounts.totalCount,
    enemyAliveCount: enemyCounts.aliveCount,
    enemyTotalCount: enemyCounts.totalCount,
    enemyEliminated: enemyCounts.aliveCount === 0,
    message: buildSummaryMessage({
      winnerSide: state.winnerSide,
      playerAliveCount: playerCounts.aliveCount,
      playerTotalCount: playerCounts.totalCount,
      enemyAliveCount: enemyCounts.aliveCount,
      enemyTotalCount: enemyCounts.totalCount,
    }),
  } satisfies BattleOutcomeSummary
}
