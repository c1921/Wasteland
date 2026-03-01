import { Button } from "@/components/ui/button"
import { useGameClock } from "@/features/time/game-clock-store"
import { TIME_SPEED_OPTIONS } from "@/features/time/types"

export function TopTimeBar() {
  const { formattedDateTime, isPaused, speed, setSpeed, togglePause } = useGameClock()

  return (
    <div className="sticky top-0 z-40 shrink-0 bg-background/90 px-3 backdrop-blur supports-backdrop-filter:bg-background/75 md:px-4">
      <div className="flex h-11 items-center justify-between gap-3">
        <span className="text-sm font-medium tabular-nums">
          {formattedDateTime}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="default"
            variant={isPaused ? "secondary" : "outline"}
            aria-pressed={isPaused}
            onClick={togglePause}
          >
            {isPaused ? "继续" : "暂停"}
          </Button>
          {TIME_SPEED_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              size="default"
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
  );
}
