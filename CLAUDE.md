# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Ember is a static blog built on Astro 7 + Svelte 5, derived from the Firefly and Fuwari themes. A sibling `AGENTS.md` documents repository conventions in more detail; this file focuses on architecture and the commands that matter most.

## Commands

Use **pnpm** — `preinstall` runs `only-allow pnpm` and will reject npm/yarn.

- `pnpm dev` — local Astro dev server (drafts are visible; only `PROD` hides `draft: true`).
- `pnpm check` — Astro type/diagnostics check. Minimum bar for content-only edits.
- `pnpm type-check` — `tsc --noEmit --isolatedDeclarations`.
- `pnpm lint` — Biome check with safe autofixes on `src/`.
- `pnpm format` — Biome format on `src/`.
- `pnpm build` — full pipeline (see below). Run this for UI/config/plugin/script changes.
- `pnpm preview` — serve the production build.
- `pnpm new-post -- <filename>` — scaffold a post in `src/content/posts/` (nested paths allowed; `.md` appended if no extension).
- Regenerate build artifacts individually: `pnpm icons`, `pnpm lqips`, `pnpm ai-summary` (add `-- --force` to regenerate all, `-- --dry-run` to preview).

There is **no unit test suite**. The validation path is `pnpm check` → `pnpm type-check` → `pnpm lint` → `pnpm build`, plus visual inspection via `pnpm dev`/`pnpm preview`.

### Build pipeline
`pnpm build` runs, in order: `generate-ai-summary.js` → `generate-icons.js` → `generate-lqips.ts` → `astro build` → `subset-fonts.ts` → `pagefind --site dist`. Each pre-step writes generated artifacts consumed by the Astro build, so a bare `astro build` can produce stale output.

## Architecture

### Config-driven design
The entire site is customized through typed config objects in `src/config/`, each paired with an interface in `src/types/`. `src/config/index.ts` is the single barrel — import config from `@/config`, never from individual files. `siteConfig.ts` holds core settings (title, URL, theme hue, page toggles); other files cover comments, gallery, nav bar, sidebar layout, fonts, effects, etc. Adding a feature usually means: define the type in `src/types/`, add the config file, re-export it from `index.ts`, then consume it in components.

Page visibility is gated by `siteConfig.pages.*` flags, which are also honored by the sitemap `filter` in `astro.config.mjs` — toggling a page off there must stay consistent with the route existing.

### Content collections
Defined in `src/content.config.ts`: `posts` (glob of `src/content/posts/**/*.{md,mdx}`, richly typed frontmatter) and `spec` (special pages, schema-less). The post schema includes non-standard fields worth knowing:
- `ai`: `string | boolean` — AI summary text, or `false` to disable summarization.
- `password` / `passwordHint` — post-level password protection.
- `pinned` — sorts above unpinned posts.
- `prevTitle`/`prevSlug`/`nextTitle`/`nextSlug` — **internal only**, populated at runtime by `getSortedPosts()`, not authored in frontmatter.

### Data access layer
`src/utils/content-utils.ts` is the canonical way to read posts — `getSortedPosts()` (pins-first, then date; also wires prev/next navigation), `getSortedPostsList()` (metadata only, drops body), `getTagList()`, category helpers, and tag-graph data. Prefer these over calling `getCollection` directly so sorting and draft-filtering stay consistent.

### Markdown/MDX processing
`astro.config.mjs` configures a custom `unified` processor with a large remark→rehype chain. Custom plugins live in `src/plugins/` and cover Mermaid, PlantUML, image grids, GitHub cards, email obfuscation, excerpts, reading time, external-link handling, and figures. Code blocks use Expressive Code (dual light/dark themes, collapsible sections, line numbers, language badges), configured from `expressiveCodeConfig`.

### Deployment targets & adapter switching
The Astro adapter is chosen at config time by env: `CF_WORKERS` set → `@astrojs/cloudflare` adapter (`wrangler.jsonc`); otherwise no adapter (static, e.g. Vercel via `vercel.json`). `src/utils/build-platform.ts` auto-detects the CI/host (Cloudflare, Vercel, EdgeOne, ESA…) and can be overridden with the `EMBER_BUILD_PLATFORM` env var.

### Path aliases
`@components/*`, `@assets/*`, `@constants/*`, `@utils/*`, `@i18n/*`, `@layouts/*`, and `@/*` → `src/*` (see `tsconfig.json`). Config uses `@/config`.

### i18n
`src/i18n/` holds `i18nKey.ts` (enum of keys), `translation.ts` (the `i18n()` lookup), and per-language tables in `languages/` (`zh_CN`, `zh_TW`, `en`, `ja`, `ru`). Site language is set via `SITE_LANG` in `siteConfig.ts`. UI strings referenced in components go through `i18n(I18nKey.x)`.

### Search & navigation
Pagefind indexes `dist` at the end of the build (`pagefind.yml` excludes KaTeX and `[data-pagefind-ignore]` nodes). Page transitions use Swup with a fixed set of persisted containers listed in `astro.config.mjs` — new persistent layout regions must be added to that `containers` array.

## Conventions

- Biome is the source of truth for style: **tab indentation**, **double quotes**. `.astro`/`.svelte`/`.vue` files relax some correctness/style rules (see `biome.json` overrides). Generated files (`src/constants/icons.ts`, `src/constants/lqips.json`) are Biome-ignored and script-managed — never hand-edit them.
- Naming: PascalCase components (`PostCard.astro`), camelCase util exports, kebab-case route/style filenames.
- Commits follow Conventional Commits; Chinese summaries are common and acceptable. Per `.trae/rules/git-commit-message.md`, prose in commit messages should be grammatical Chinese, split into one item per line.
- Never commit secrets from `.env` (AI summary keys). Document new variables in `.env.example`.
