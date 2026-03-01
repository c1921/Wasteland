import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useAutoBattle } from "@/features/battle/hooks/use-auto-battle"
import { Character, Gender } from "@/features/character/types"
import type { BattleEncounterRef } from "@/features/battle/types"

const useGameClockMock = vi.fn()
const getCharactersMock = vi.fn()
const getPersistedCombatStatesByCharacterIdsMock = vi.fn()
const getNpcSquadByIdMock = vi.fn()
const applyBattleOutcomeMock = vi.fn()

vi.mock("@/features/time/game-clock-store", () => ({
  useGameClock: () => useGameClockMock(),
}))

vi.mock("@/features/character/data/characters", () => ({
  getCharacters: () => getCharactersMock(),
}))

vi.mock("@/features/character/data/session-combat-state", () => ({
  getPersistedCombatStatesByCharacterIds: (ids: string[]) =>
    getPersistedCombatStatesByCharacterIdsMock(ids),
}))

vi.mock("@/features/map/data/npc-squads", () => ({
  getNpcSquadById: (id: string) => getNpcSquadByIdMock(id),
}))

vi.mock("@/features/battle/data/session-battle-outcome", () => ({
  applyBattleOutcome: (payload: unknown) => applyBattleOutcomeMock(payload),
}))

type ClockState = {
  speed: number
  isPaused: boolean
}

const encounter: BattleEncounterRef = {
  id: "encounter-test",
  source: {
    type: "map-npc-squad",
    squadId: "npc-squad-1",
    squadName: "灰狼巡逻组",
  },
  playerLabel: "玩家队伍",
  startedAt: 1_735_689_600_000,
}

function buildCharacter(id: string, name: string) {
  return new Character({
    id,
    name,
    gender: Gender.Unknown,
    abilities: {
      strength: 60,
      agility: 60,
      intelligence: 60,
      endurance: 60,
    },
    skills: {
      shooting: 12,
      melee: 10,
      stealth: 8,
      scouting: 11,
      survival: 9,
      medical: 4,
      engineering: 5,
      salvaging: 6,
      driving: 7,
      negotiation: 8,
      taming: 3,
      crafting: 5,
    },
  })
}

function AutoBattleHarness() {
  const { state, isRunning, unavailableReason, startBattle, stopBattle, resetBattle } =
    useAutoBattle(encounter)

  return (
    <div>
      <p data-testid="tick">{state?.tickCount ?? -1}</p>
      <p data-testid="phase">{state?.phase ?? "none"}</p>
      <p data-testid="running">{String(isRunning)}</p>
      <p data-testid="reason">{unavailableReason ?? ""}</p>
      <button type="button" onClick={startBattle}>
        start
      </button>
      <button type="button" onClick={stopBattle}>
        stop
      </button>
      <button type="button" onClick={resetBattle}>
        reset
      </button>
    </div>
  )
}

function EmptyEncounterHarness() {
  const { state, unavailableReason } = useAutoBattle(null)

  return (
    <div>
      <p data-testid="phase">{state?.phase ?? "none"}</p>
      <p data-testid="reason">{unavailableReason ?? ""}</p>
    </div>
  )
}

describe("useAutoBattle", () => {
  let rafNow = 0
  let rafId = 1
  let clockState: ClockState
  let callbacks = new Map<number, FrameRequestCallback>()

  function setupClockState(speed = 1, isPaused = false) {
    clockState = { speed, isPaused }
    useGameClockMock.mockImplementation(() => clockState)
  }

  function stepRaf(deltaMs: number) {
    act(() => {
      const snapshot = Array.from(callbacks.entries())
      callbacks = new Map()
      rafNow += deltaMs

      for (const [, callback] of snapshot) {
        callback(rafNow)
      }
    })
  }

  beforeEach(() => {
    useGameClockMock.mockReset()
    getCharactersMock.mockReset()
    getPersistedCombatStatesByCharacterIdsMock.mockReset()
    getNpcSquadByIdMock.mockReset()
    applyBattleOutcomeMock.mockReset()

    setupClockState()
    rafNow = 0
    rafId = 1
    callbacks = new Map()

    const player = buildCharacter("player-1", "霜鸦")
    const enemy = buildCharacter("enemy-1", "锈钉-1")

    getCharactersMock.mockReturnValue([player])
    getPersistedCombatStatesByCharacterIdsMock.mockReturnValue({
      "player-1": {
        characterId: "player-1",
        maxHp: 120,
        hp: 120,
        morale: 100,
        alive: true,
        routing: false,
      },
    })
    getNpcSquadByIdMock.mockReturnValue({
      id: "npc-squad-1",
      name: "灰狼巡逻组",
      members: [enemy],
      spawn: { x: 0, y: 0 },
      speed: 120,
    })
    applyBattleOutcomeMock.mockReturnValue({
      encounterId: encounter.id,
      winnerSide: "A",
      playerAliveCount: 1,
      playerTotalCount: 1,
      enemyAliveCount: 0,
      enemyTotalCount: 1,
      enemyEliminated: true,
      message: "我方胜利。",
    })

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        const id = rafId
        rafId += 1
        callbacks.set(id, callback)
        return id
      })
    )
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((id: number) => {
        callbacks.delete(id)
      })
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("returns unavailable reason when encounter is missing", () => {
    render(<EmptyEncounterHarness />)

    expect(screen.getByTestId("phase").textContent).toBe("none")
    expect(screen.getByTestId("reason").textContent).toContain("地图")
  })

  it("does not advance ticks while paused", () => {
    setupClockState(10, true)
    render(<AutoBattleHarness />)

    fireEvent.click(screen.getByRole("button", { name: "start" }))
    stepRaf(0)
    stepRaf(1000)
    stepRaf(1000)

    expect(screen.getByTestId("running").textContent).toBe("true")
    expect(screen.getByTestId("tick").textContent).toBe("0")
  })

  it("advances faster when speed is increased", () => {
    const { rerender } = render(<AutoBattleHarness />)
    fireEvent.click(screen.getByRole("button", { name: "start" }))

    stepRaf(0)
    stepRaf(1000)
    expect(screen.getByTestId("tick").textContent).toBe("1")

    clockState = { ...clockState, speed: 10 }
    rerender(<AutoBattleHarness />)
    stepRaf(100)

    expect(screen.getByTestId("tick").textContent).toBe("2")
  })

  it("supports stop and reset controls", () => {
    render(<AutoBattleHarness />)
    fireEvent.click(screen.getByRole("button", { name: "start" }))

    stepRaf(0)
    stepRaf(1000)
    expect(screen.getByTestId("tick").textContent).toBe("1")

    fireEvent.click(screen.getByRole("button", { name: "stop" }))
    stepRaf(2000)
    expect(screen.getByTestId("running").textContent).toBe("false")
    expect(screen.getByTestId("tick").textContent).toBe("1")

    fireEvent.click(screen.getByRole("button", { name: "reset" }))
    expect(screen.getByTestId("tick").textContent).toBe("0")
    expect(screen.getByTestId("phase").textContent).toBe("contact")
  })

  it("limits processed ticks per animation frame", () => {
    setupClockState(10, false)
    render(<AutoBattleHarness />)
    fireEvent.click(screen.getByRole("button", { name: "start" }))

    stepRaf(0)
    stepRaf(10000)

    const tick = Number(screen.getByTestId("tick").textContent)
    expect(tick).toBeGreaterThan(0)
    expect(tick).toBeLessThanOrEqual(10)
  })
})
