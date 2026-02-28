# Architecture Guide

This repository follows a feature-first layout. Keep business logic and feature UIs inside `src/features/*`.

## Layers

- `src/app/*`: Application assembly only (providers, navigation registry, app shell wiring).
- `src/features/<domain>/*`: Domain code and feature-facing UI.
- `src/shared/*`: Reusable primitives without domain ownership.
- `src/engine/*`: Runtime abstractions and renderer adapters.

## Feature module shape

Each feature should keep this structure where relevant:

- `ui`: Feature UI containers and panels.
- `lib`: Pure domain logic and algorithms.
- `data`: Static seeds, mock data, or adapters.
- `types.ts`: Domain types local to the feature.

## Boundary rules

- Do not import feature code from `src/components/panels/*`.
- Map renderer consumers use `src/engine/runtime/*` contracts, not Pixi internals.
- Shared modules must not depend on feature modules.

## Navigation

- Navigation metadata lives in `src/app/navigation/nav-config.ts`.
- Panel registration lives in `src/app/navigation/panel-registry.tsx`.
- Layout components should read from these modules, not inline panel imports.
