import { GameSessionProvider } from "@/engine/session/game-session-context"
import { GameShell } from "@/components/layout/game-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { GameClockProvider } from "@/features/time/game-clock-context"

export default function App() {
  return (
    <ThemeProvider
      defaultTheme="dark"
      storageKey="vite-ui-theme"
      defaultBaseColor="neutral"
      baseColorStorageKey="vite-ui-base-color"
    >
      <GameSessionProvider>
        <GameClockProvider>
          <GameShell />
        </GameClockProvider>
      </GameSessionProvider>
    </ThemeProvider>
  )
}
