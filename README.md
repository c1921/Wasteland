# Wasteland

Wasteland is a React + TypeScript + Vite project for a post-apocalyptic control panel experience with a PixiJS-driven world map, in-game time simulation, and modular feature panels.

## Development

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev       # start Vite dev server
npm run lint      # run ESLint
npm run test      # run Vitest in watch mode
npm run test:run  # run Vitest once
npm run build     # type-check + production build
npm run preview   # preview production build
```

## Architecture

`src/features/*` contains domain logic and feature UIs.
`src/components/*` contains layout primitives, generic UI wrappers, and non-feature-specific panels.

Current key modules:

- `src/features/map`: map data, pathfinding, NPC movement, Pixi scene rendering.
- `src/features/time`: game clock state, persistence, context/provider.
- `src/features/character`: character generation and static datasets.

## Map Module Boundaries

- Use explicit imports from `@/features/map/*` paths.
- Do not import map code from legacy `@/components/panels/map*` paths.
- `createPixiMapScene` is the map rendering entrypoint; internal scene code is split into camera/draw/interaction/runtime helpers under `src/features/map/render/scene`.

## Quality Gates

Before submitting changes:

```bash
npm run lint
npm run test:run
npm run build
```
