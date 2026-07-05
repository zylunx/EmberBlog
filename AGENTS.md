# Repository Guidelines

## Project Structure & Module Organization

This is an Astro blog project with Svelte components and TypeScript utilities. Main code lives in `src/`: `pages/` defines routes, `layouts/` wraps page shells, `components/` contains UI, `content/` stores posts and special pages, `config/` and `types/` hold typed site configuration, and `utils/` contains shared helpers. Styling is in `src/styles/`; static files are in `public/`. Build scripts live in `scripts/`. Generated output goes to `dist/` and should not be edited manually.

## Build, Test, and Development Commands

Use pnpm; `preinstall` enforces it.

- `pnpm dev` or `pnpm start`: run the local Astro dev server.
- `pnpm check`: run Astro checks.
- `pnpm type-check`: run TypeScript with `tsc --noEmit --isolatedDeclarations`.
- `pnpm build`: generate AI summaries, icons, LQIPs, build Astro, subset fonts, and create the Pagefind index.
- `pnpm preview`: preview the production build locally.
- `pnpm new-post`: create a new post through `scripts/new-post.js`.
- `pnpm format`: format `src/` with Biome.
- `pnpm lint`: run Biome checks and safe writes on `src/`.

## Coding Style & Naming Conventions

Biome is the source of truth for formatting and linting. It uses tab indentation and double quotes for JavaScript/TypeScript. Prefer typed config objects in `src/config/` paired with interfaces in `src/types/`. Use PascalCase for components such as `PostCard.astro`, camelCase for utility exports, and kebab-case for route and style filenames where established. Keep generated files such as `src/constants/icons.ts` and `src/constants/lqips.json` script-managed.

## Testing Guidelines

There is no dedicated unit test suite in this repository. Treat `pnpm check`, `pnpm type-check`, `pnpm lint`, and `pnpm build` as the required validation path before submitting changes. For content-only edits, at least run `pnpm check`; for UI, config, plugin, or script changes, run the full build and inspect the affected route with `pnpm dev` or `pnpm preview`.

## Commit & Pull Request Guidelines

Follow Conventional Commits when possible, for example `feat: add gallery filter` or `fix: correct RSS date handling`. Recent history also uses Chinese summaries, which is acceptable when clear and scoped. Keep each PR focused on one purpose, describe the user-visible impact, list validation commands run, and include screenshots for visual changes. Link related issues or discussions for major features or design changes.

## Security & Configuration Tips

Do not commit secrets from `.env`; use `.env.example` for documented variables. Review `wrangler.jsonc`, `vercel.json`, and `astro.config.mjs` carefully when changing deployment behavior.
