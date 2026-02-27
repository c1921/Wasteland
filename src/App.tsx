import { GameShell } from "@/components/layout/game-shell"
import { ThemeProvider } from "@/components/theme-provider"

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <GameShell />
    </ThemeProvider>
  )
}
