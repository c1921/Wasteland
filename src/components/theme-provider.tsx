import { useEffect, useState } from "react"
import { ThemeProviderContext } from "./theme-context"
import type { BaseColor, Theme } from "./theme-context"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  defaultBaseColor?: BaseColor
  baseColorStorageKey?: string
  defaultUiScale?: number
  uiScaleStorageKey?: string
}

const themes: Theme[] = ["light", "dark", "system"]
const baseColors: BaseColor[] = ["gray", "neutral", "slate", "stone", "zinc"]
const UI_SCALE_MIN = 75
const UI_SCALE_MAX = 150

function clampUiScale(uiScale: number) {
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, uiScale))
}

function parseStoredUiScale(uiScale: string | null) {
  if (uiScale === null) {
    return null
  }

  const parsedUiScale = Number(uiScale)

  if (!Number.isInteger(parsedUiScale)) {
    return null
  }

  if (parsedUiScale < UI_SCALE_MIN || parsedUiScale > UI_SCALE_MAX) {
    return null
  }

  return parsedUiScale
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  defaultBaseColor = "neutral",
  baseColorStorageKey = "vite-ui-base-color",
  defaultUiScale = 100,
  uiScaleStorageKey = "vite-ui-scale",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => {
      const savedTheme = localStorage.getItem(storageKey)

      if (savedTheme && themes.includes(savedTheme as Theme)) {
        return savedTheme as Theme
      }

      return defaultTheme
    }
  )
  const [baseColor, setBaseColor] = useState<BaseColor>(
    () => {
      const savedBaseColor = localStorage.getItem(baseColorStorageKey)

      if (savedBaseColor && baseColors.includes(savedBaseColor as BaseColor)) {
        return savedBaseColor as BaseColor
      }

      return defaultBaseColor
    }
  )
  const [uiScale, setUiScaleState] = useState<number>(
    () => {
      const savedUiScale = parseStoredUiScale(localStorage.getItem(uiScaleStorageKey))

      if (savedUiScale !== null) {
        return savedUiScale
      }

      return clampUiScale(Math.round(defaultUiScale))
    }
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    root.dataset.baseColor = baseColor
  }, [baseColor])

  useEffect(() => {
    const root = window.document.documentElement
    root.style.setProperty("--ui-scale", `${uiScale}%`)
  }, [uiScale])

  const value = {
    theme,
    baseColor,
    uiScale,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    setBaseColor: (baseColor: BaseColor) => {
      localStorage.setItem(baseColorStorageKey, baseColor)
      setBaseColor(baseColor)
    },
    setUiScale: (uiScale: number) => {
      const normalizedUiScale = clampUiScale(Math.round(uiScale))
      localStorage.setItem(uiScaleStorageKey, String(normalizedUiScale))
      setUiScaleState(normalizedUiScale)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
