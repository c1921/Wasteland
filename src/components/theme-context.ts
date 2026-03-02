import { createContext, useContext } from "react"

export type Theme = "dark" | "light" | "system"
export type BaseColor = "gray" | "neutral" | "slate" | "stone" | "zinc"

export type ThemeProviderState = {
  theme: Theme
  baseColor: BaseColor
  uiScale: number
  setTheme: (theme: Theme) => void
  setBaseColor: (baseColor: BaseColor) => void
  setUiScale: (uiScale: number) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  baseColor: "neutral",
  uiScale: 100,
  setTheme: () => null,
  setBaseColor: () => null,
  setUiScale: () => null,
}

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
