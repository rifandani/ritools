# Shared Message Catalog; app-owned Translation Provider

The web app uses `initI18n` from `@/core/libs/i18n/init`. Catalogs and flat Translation Keys live in `apps/web/src/core/libs/i18n`. The React Translation Provider stays separate because locale discovery is app-specific.

## Considered Options

- Per-app catalogs — rejected; one catalog avoids drift
- Lift Translation Provider into core — rejected; locale discovery is app-specific
- A second i18n stack in the app — rejected; one stack in the monorepo
