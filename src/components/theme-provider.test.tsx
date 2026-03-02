import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useTheme } from "@/components/theme-context"
import { ThemeProvider } from "@/components/theme-provider"

const THEME_STORAGE_KEY = "test-ui-theme"
const BASE_COLOR_STORAGE_KEY = "test-ui-base-color"
const UI_SCALE_STORAGE_KEY = "test-ui-scale"

function ThemeHarness() {
  const {
    theme,
    baseColor,
    uiScale,
    setTheme,
    setBaseColor,
    setUiScale,
  } = useTheme()

  return (
    <div>
      <p data-testid="theme-value">{theme}</p>
      <p data-testid="base-color-value">{baseColor}</p>
      <p data-testid="ui-scale-value">{uiScale}</p>
      <button type="button" onClick={() => setTheme("dark")}>
        set-dark
      </button>
      <button type="button" onClick={() => setBaseColor("gray")}>
        set-gray
      </button>
      <button type="button" onClick={() => setUiScale(125)}>
        set-scale-125
      </button>
      <button type="button" onClick={() => setUiScale(999)}>
        set-scale-999
      </button>
    </div>
  )
}

describe("ThemeProvider", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ""
    document.documentElement.removeAttribute("data-base-color")
    document.documentElement.style.removeProperty("--ui-scale")

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it("uses default base color and ui scale when storage is empty", () => {
    render(
      <ThemeProvider
        defaultTheme="light"
        storageKey={THEME_STORAGE_KEY}
        defaultBaseColor="neutral"
        baseColorStorageKey={BASE_COLOR_STORAGE_KEY}
        defaultUiScale={100}
        uiScaleStorageKey={UI_SCALE_STORAGE_KEY}
      >
        <ThemeHarness />
      </ThemeProvider>
    )

    expect(screen.getByTestId("base-color-value").textContent).toBe("neutral")
    expect(screen.getByTestId("ui-scale-value").textContent).toBe("100")
    expect(document.documentElement.getAttribute("data-base-color")).toBe("neutral")
    expect(document.documentElement.style.getPropertyValue("--ui-scale")).toBe("100%")
  })

  it("hydrates theme, base color, and ui scale from localStorage", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark")
    localStorage.setItem(BASE_COLOR_STORAGE_KEY, "slate")
    localStorage.setItem(UI_SCALE_STORAGE_KEY, "125")

    render(
      <ThemeProvider
        defaultTheme="light"
        storageKey={THEME_STORAGE_KEY}
        defaultBaseColor="neutral"
        baseColorStorageKey={BASE_COLOR_STORAGE_KEY}
        defaultUiScale={100}
        uiScaleStorageKey={UI_SCALE_STORAGE_KEY}
      >
        <ThemeHarness />
      </ThemeProvider>
    )

    expect(screen.getByTestId("theme-value").textContent).toBe("dark")
    expect(screen.getByTestId("base-color-value").textContent).toBe("slate")
    expect(screen.getByTestId("ui-scale-value").textContent).toBe("125")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.getAttribute("data-base-color")).toBe("slate")
    expect(document.documentElement.style.getPropertyValue("--ui-scale")).toBe("125%")
  })

  it("falls back to default base color when storage has invalid value", () => {
    localStorage.setItem(BASE_COLOR_STORAGE_KEY, "purple")

    render(
      <ThemeProvider
        defaultTheme="light"
        storageKey={THEME_STORAGE_KEY}
        defaultBaseColor="neutral"
        baseColorStorageKey={BASE_COLOR_STORAGE_KEY}
        defaultUiScale={100}
        uiScaleStorageKey={UI_SCALE_STORAGE_KEY}
      >
        <ThemeHarness />
      </ThemeProvider>
    )

    expect(screen.getByTestId("base-color-value").textContent).toBe("neutral")
    expect(document.documentElement.getAttribute("data-base-color")).toBe("neutral")
  })

  it("falls back to default ui scale when storage has invalid value", () => {
    localStorage.setItem(UI_SCALE_STORAGE_KEY, "160")

    render(
      <ThemeProvider
        defaultTheme="light"
        storageKey={THEME_STORAGE_KEY}
        defaultBaseColor="neutral"
        baseColorStorageKey={BASE_COLOR_STORAGE_KEY}
        defaultUiScale={100}
        uiScaleStorageKey={UI_SCALE_STORAGE_KEY}
      >
        <ThemeHarness />
      </ThemeProvider>
    )

    expect(screen.getByTestId("ui-scale-value").textContent).toBe("100")
    expect(document.documentElement.style.getPropertyValue("--ui-scale")).toBe("100%")
  })

  it("updates DOM and storage when theme, base color, and ui scale are changed", () => {
    render(
      <ThemeProvider
        defaultTheme="light"
        storageKey={THEME_STORAGE_KEY}
        defaultBaseColor="neutral"
        baseColorStorageKey={BASE_COLOR_STORAGE_KEY}
        defaultUiScale={100}
        uiScaleStorageKey={UI_SCALE_STORAGE_KEY}
      >
        <ThemeHarness />
      </ThemeProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "set-dark" }))
    fireEvent.click(screen.getByRole("button", { name: "set-gray" }))
    fireEvent.click(screen.getByRole("button", { name: "set-scale-125" }))

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")
    expect(localStorage.getItem(BASE_COLOR_STORAGE_KEY)).toBe("gray")
    expect(localStorage.getItem(UI_SCALE_STORAGE_KEY)).toBe("125")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.getAttribute("data-base-color")).toBe("gray")
    expect(document.documentElement.style.getPropertyValue("--ui-scale")).toBe("125%")
  })

  it("clamps ui scale before persisting and applying to DOM", () => {
    render(
      <ThemeProvider
        defaultTheme="light"
        storageKey={THEME_STORAGE_KEY}
        defaultBaseColor="neutral"
        baseColorStorageKey={BASE_COLOR_STORAGE_KEY}
        defaultUiScale={100}
        uiScaleStorageKey={UI_SCALE_STORAGE_KEY}
      >
        <ThemeHarness />
      </ThemeProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "set-scale-999" }))

    expect(screen.getByTestId("ui-scale-value").textContent).toBe("150")
    expect(localStorage.getItem(UI_SCALE_STORAGE_KEY)).toBe("150")
    expect(document.documentElement.style.getPropertyValue("--ui-scale")).toBe("150%")
  })
})
