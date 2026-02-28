import { createContext, useContext } from "react"

export type Theme = "dark" | "light" | "system"
export type BaseColor = "gray" | "neutral" | "slate" | "stone" | "zinc"

export type ThemeProviderState = {
  theme: Theme
  baseColor: BaseColor
  setTheme: (theme: Theme) => void
  setBaseColor: (baseColor: BaseColor) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  baseColor: "neutral",
  setTheme: () => null,
  setBaseColor: () => null,
}

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
