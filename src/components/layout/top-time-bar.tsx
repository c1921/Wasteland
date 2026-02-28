import { Button } from "@/components/ui/button"
import { useGameClock } from "@/features/time/game-clock-store"
import { TIME_SPEED_OPTIONS } from "@/features/time/types"

export function TopTimeBar() {
  const { formattedDateTime, speed, setSpeed } = useGameClock()

  return (
    <div className="border-b bg-background/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:px-4">
      <div className="flex h-11 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">时间</span>
          <span className="text-sm font-medium tabular-nums">{formattedDateTime}</span>
        </div>
        <div className="flex items-center gap-1">
          {TIME_SPEED_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              size="xs"
              variant={speed === option ? "secondary" : "outline"}
              aria-pressed={speed === option}
              onClick={() => setSpeed(option)}
            >
              {option}x
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
