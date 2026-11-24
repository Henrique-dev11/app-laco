# Repository Guidelines

## Project Structure & Module Organization

Laço contains three separately managed applications:

- `api/`: NestJS and Prisma backend. Domain modules live in `src/`, database schema and migrations in `prisma/`, and integration tests in `test/`.
- `mobile/`: Expo/React Native application. `src/screens/` contains screens; shared components, services, themes, accessibility helpers, and motion utilities have dedicated directories. Images and fonts live in `assets/`; tests live in `test/`.
- `web/`: Native JavaScript administrative panel and public site, with `admin/assets/`, `site/`, a development server in `scripts/`, and `test/`.
- `docs/`: Installation, configuration, development, and troubleshooting guides. Root `compose.yaml` provisions PostgreSQL 17.

## Build, Test, and Development Commands

Use Node `24.21.0` (`.nvmrc`) and npm `11.19.0`. There is no root npm workspace. Run `npm ci` separately in `api/` and `mobile/`; `web/` needs no dependency installation.

- `docker compose up -d --wait db`: Start the development database.
- `npm --prefix api run db:generate` / `run db:migrate`: Generate Prisma Client or apply committed migrations.
- `npm --prefix api run start:dev`: Start the API on port 3000; `run build` compiles it.
- `npm --prefix mobile start`: Start Expo; `run web` launches the web target.
- `npm --prefix web run dev`: Serve the site and `/admin` on port 5173.

## Coding Style & Naming Conventions

Follow existing two-space indentation, single quotes, and semicolons. API Prettier enables trailing commas; use `npm run format` and `npm run lint` (Oxlint) within `api/`. Mobile uses Expo ESLint. Use PascalCase for React components, camelCase for functions, and Nest filenames such as `usuario.service.ts`. Reuse mobile theme, accessibility, and component primitives. Install mobile dependencies with `npx expo install`.

## Testing Guidelines

API tests use Vitest: `*.spec.ts` and `test/*.e2e-spec.ts`. Run `npm test`, `npm run test:cov`, or `npm run test:e2e` within `api/`. No coverage threshold is configured. E2E requires PostgreSQL permissions to create temporary `laco_test_*` databases. Mobile and web use Node’s test runner with `test/*.test.mjs`; run `npm test` in each. Run affected tests, API build/lint, mobile lint/typecheck, and web `npm run check`, as applicable.

## Commit & Pull Request Guidelines

History includes `feat:` messages and concise Portuguese summaries. PRs should describe behavior changes, link relevant issues, list validation, and include screenshots for UI changes.

## Security & Configuration

Keep secrets in local `.env` files; document new variables in `.env.example`. Commit migrations and lockfiles, not generated Prisma output. Never reset an existing database to apply updates. Read `mobile/AGENTS.md` before mobile work.
