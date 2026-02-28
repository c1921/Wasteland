import type { WorldPoint } from "@/features/map/types"

export type PathMover = {
  x: number
  y: number
  speed: number
  moving: boolean
  path: WorldPoint[]
}

export type MovementStepResult = {
  moved: boolean
  arrived: boolean
}

function toNonNegativeFinite(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, value)
}

export function composeFinalSpeedBeforeTime(
  baseSpeed: number,
  modifiers: readonly number[] = []
) {
  let finalSpeed = toNonNegativeFinite(baseSpeed)

  for (const modifier of modifiers) {
    finalSpeed *= toNonNegativeFinite(modifier)
  }

  return finalSpeed
}

export function advancePathMover(
  mover: PathMover,
  deltaMs: number,
  timeScale: number
): MovementStepResult {
  const hasActivePath = mover.moving && mover.path.length > 0

  if (!hasActivePath) {
    if (mover.path.length === 0) {
      mover.moving = false
    }

    return {
      moved: false,
      arrived: false,
    }
  }

  const safeDeltaMs = toNonNegativeFinite(deltaMs)
  const safeTimeScale = toNonNegativeFinite(timeScale)
  const finalSpeedBeforeTime = toNonNegativeFinite(mover.speed)
  // Order contract:
  // mover.speed must be the fully composed speed from all gameplay modifiers.
  const distancePerSecond = finalSpeedBeforeTime * safeTimeScale
  let remainingDistance = distancePerSecond * (safeDeltaMs / 1000)

  if (remainingDistance <= 0) {
    return {
      moved: false,
      arrived: false,
    }
  }

  let moved = false

  while (remainingDistance > 0 && mover.path.length > 0) {
    const nextPoint = mover.path[0]
    const dx = nextPoint.x - mover.x
    const dy = nextPoint.y - mover.y
    const distance = Math.hypot(dx, dy)

    if (distance <= remainingDistance) {
      mover.x = nextPoint.x
      mover.y = nextPoint.y
      mover.path.shift()
      remainingDistance -= distance
      moved = true
      continue
    }

    const ratio = remainingDistance / Math.max(distance, 0.0001)
    mover.x += dx * ratio
    mover.y += dy * ratio
    remainingDistance = 0
    moved = true
  }

  if (mover.path.length === 0) {
    mover.moving = false
    return {
      moved,
      arrived: true,
    }
  }

  return {
    moved,
    arrived: false,
  }
}
