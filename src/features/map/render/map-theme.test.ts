import { afterEach, describe, expect, it, vi } from "vitest"

import {
  observeThemeClassChange,
  resolveMapThemePalette,
} from "@/features/map/render/map-theme"

const root = document.documentElement

function flushMutationObserver() {
  return new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), 0)
  })
}

describe("map theme palette", () => {
  afterEach(() => {
    root.style.removeProperty("--background")
    root.style.removeProperty("--border")
    root.style.removeProperty("--muted-foreground")
    root.className = ""
  })

  it("resolves colors from rgb, hex and oklch css variables", () => {
    root.style.setProperty("--background", "oklch(1 0 0)")
    root.style.setProperty("--border", "#112233")
    root.style.setProperty("--muted-foreground", "rgb(40 50 60 / 0.5)")

    const palette = resolveMapThemePalette(root)

    expect(palette).toEqual({
      background: 0xffffff,
      border: 0x112233,
      grid: 0x28323c,
    })
  })

  it("supports oklab and ignores alpha channel in oklch and oklab", () => {
    root.style.setProperty("--background", "oklch(1 0 0 / 10%)")
    root.style.setProperty("--border", "oklab(0 0 0 / 0.6)")
    root.style.setProperty("--muted-foreground", "oklch(0 0 0 / 50%)")

    const palette = resolveMapThemePalette(root)

    expect(palette).toEqual({
      background: 0xffffff,
      border: 0x000000,
      grid: 0x000000,
    })
  })

  it("falls back when css variable value is invalid", () => {
    root.style.setProperty("--background", "oklch(x y z)")
    root.style.setProperty("--border", "oklab(1 0)")
    root.style.setProperty("--muted-foreground", "")

    const palette = resolveMapThemePalette(root)

    expect(palette).toEqual({
      background: 0x0e1218,
      border: 0x2f3d49,
      grid: 0x2a3844,
    })
  })

  it("observes class changes and stops after disconnect", async () => {
    const onThemeChange = vi.fn()
    const stopObserver = observeThemeClassChange(onThemeChange, root)

    root.classList.add("dark")
    await flushMutationObserver()
    expect(onThemeChange).toHaveBeenCalledTimes(1)

    stopObserver()
    root.classList.remove("dark")
    await flushMutationObserver()
    expect(onThemeChange).toHaveBeenCalledTimes(1)
  })
})
