import { describe, expect, it } from "vitest"

import { NODE_STYLE_MAP } from "@/features/map/constants"

describe("map node styles", () => {
  it("uses one unified color style for all location kinds", () => {
    const styles = Object.values(NODE_STYLE_MAP).map(
      ({ glow, ring, core }) => `${glow}-${ring}-${core}`
    )

    expect(new Set(styles).size).toBe(1)
  })
})
