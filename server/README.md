# Server Conventions

## Layers

- **routes.ts** — Validate input, call services, return status codes. No business logic.
- **services/** — Each file owns its domain end-to-end.
- **core/** — Infrastructure that rarely changes.

## Error Handling

Errors bubble to Express error middleware via `asyncHandler`. No try/catch in routes or services.

- Failed creates → `throw new Error(...)`
- Missing entity → return `undefined`, route returns 404
- Failed delete → return `false`, route returns 404
- Bad input → Zod `safeParse`, route returns 400
- try/catch only where failure is expected (filesystem, external APIs)

## Naming

**Services**: `get*`, `create*`, `update*`, `delete*`, `ensure*` (create-if-not-exists), `calculate*` (pure computation)

**Hooks**: `use` + noun for queries (`useHabitsSummary`), `use` + verb + noun for mutations (`useCreateTask`)
