import { useEffect, useState } from "react"
import { ThemeProviderContext } from "./theme-context"
import type { BaseColor, Theme } from "./theme-context"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  defaultBaseColor?: BaseColor
  baseColorStorageKey?: string
}

const themes: Theme[] = ["light", "dark", "system"]
const baseColors: BaseColor[] = ["gray", "neutral", "slate", "stone", "zinc"]

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  defaultBaseColor = "stone",
  baseColorStorageKey = "vite-ui-base-color",
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

  const value = {
    theme,
    baseColor,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    setBaseColor: (baseColor: BaseColor) => {
      localStorage.setItem(baseColorStorageKey, baseColor)
      setBaseColor(baseColor)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
