# Time Sync Audit

## Scope

This audit records the timing-related modules after the `500ms = 1 in-game hour` clock migration and marks whether each item is synchronized with game speed and pause state.

## Results

| Module | Timing Item | Bound to Game Clock Ratio | Affected by `speed` | Affected by Pause | Notes |
| --- | --- | --- | --- | --- | --- |
| `features/time` | Global in-game datetime (`advanceGameTime`) | Yes | Yes | Yes | Uses `GAME_MS_PER_REAL_MS = 7200`. |
| `features/map` | Player movement (`advancePathMover`) | Indirect | Yes | Yes | Time scale from clock controls, pause -> `0`. |
| `features/map` | NPC movement (`advancePathMover` in `tickNpcSquad`) | Indirect | Yes | Yes | Time scale from clock controls, pause -> `0`. |
| `features/map` | NPC idle countdown (`idleRemainingMs`) | Indirect | Yes | Yes | Countdown now decrements by `deltaMs * timeScale`. |
| `features/battle` | Auto battle tick accumulator | Indirect | Yes | Yes | Tick loop uses `deltaRealMs * speed`, paused blocks progression. |
| `features/battle` | Battle duration display | Yes | Yes | Yes | `elapsedSec` is formatted into in-game duration with clock conversion. |
| `features/map` | Interaction log timestamp (`createdAt`) | No | No | No | Uses wall-clock `Date.now()`, kept as UI/session trace metadata. |
| `features/map` | Encounter start timestamp (`startedAt`) | No | No | No | Uses wall-clock `Date.now()`, kept for real-time traceability. |
| `features/map/render` | Long-press detect timer | No | No | No | UI gesture timeout; intentionally wall-clock based. |
| `features/map/hooks` | Status toast timeout | No | No | No | UI message lifetime; intentionally wall-clock based. |

## Summary

- Gameplay progression timing (clock, movement, battle, NPC idle) is synchronized with speed and pause.
- UI interaction timers and trace timestamps intentionally remain wall-clock based.
