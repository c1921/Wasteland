import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useTheme } from "@/components/theme-context"
import { ThemeProvider } from "@/components/theme-provider"

const THEME_STORAGE_KEY = "test-ui-theme"
const BASE_COLOR_STORAGE_KEY = "test-ui-base-color"

function ThemeHarness() {
  const {
    theme,
    baseColor,
    setTheme,
    setBaseColor,
  } = useTheme()

  return (
    <div>
      <p data-testid="theme-value">{theme}</p>
      <p data-testid="base-color-value">{baseColor}</p>
      <button type="button" onClick={() => setTheme("dark")}>
        set-dark
      </button>
      <button type="button" onClick={() => setBaseColor("gray")}>
        set-gray
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

  it("uses the default base color when storage is empty", () => {
    render(
      <ThemeProvider
        defaultTheme="light"
        storageKey={THEME_STORAGE_KEY}
        defaultBaseColor="stone"
        baseColorStorageKey={BASE_COLOR_STORAGE_KEY}
      >
        <ThemeHarness />
      </ThemeProvider>
    )

    expect(screen.getByTestId("base-color-value").textContent).toBe("stone")
    expect(document.documentElement.getAttribute("data-base-color")).toBe("stone")
  })

  it("hydrates theme and base color from localStorage", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark")
    localStorage.setItem(BASE_COLOR_STORAGE_KEY, "slate")

    render(
      <ThemeProvider
        defaultTheme="light"
        storageKey={THEME_STORAGE_KEY}
        defaultBaseColor="stone"
        baseColorStorageKey={BASE_COLOR_STORAGE_KEY}
      >
        <ThemeHarness />
      </ThemeProvider>
    )

    expect(screen.getByTestId("theme-value").textContent).toBe("dark")
    expect(screen.getByTestId("base-color-value").textContent).toBe("slate")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.getAttribute("data-base-color")).toBe("slate")
  })

  it("falls back to default base color when storage has invalid value", () => {
    localStorage.setItem(BASE_COLOR_STORAGE_KEY, "purple")

    render(
      <ThemeProvider
        defaultTheme="light"
        storageKey={THEME_STORAGE_KEY}
        defaultBaseColor="stone"
        baseColorStorageKey={BASE_COLOR_STORAGE_KEY}
      >
        <ThemeHarness />
      </ThemeProvider>
    )

    expect(screen.getByTestId("base-color-value").textContent).toBe("stone")
    expect(document.documentElement.getAttribute("data-base-color")).toBe("stone")
  })

  it("updates DOM and storage when theme and base color are changed", () => {
    render(
      <ThemeProvider
        defaultTheme="light"
        storageKey={THEME_STORAGE_KEY}
        defaultBaseColor="stone"
        baseColorStorageKey={BASE_COLOR_STORAGE_KEY}
      >
        <ThemeHarness />
      </ThemeProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "set-dark" }))
    fireEvent.click(screen.getByRole("button", { name: "set-gray" }))

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")
    expect(localStorage.getItem(BASE_COLOR_STORAGE_KEY)).toBe("gray")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.getAttribute("data-base-color")).toBe("gray")
  })
})
