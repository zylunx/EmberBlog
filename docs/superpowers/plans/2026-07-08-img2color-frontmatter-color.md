# Img2Color Frontmatter Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill empty post frontmatter `color` values at build time by calling the img2color API for remote `http`/`https` cover images.

**Architecture:** Add a focused build pre-script that scans Markdown posts, skips posts with a non-empty `color`, skips local images with a warning, calls the configured img2color API for remote images, and writes the returned dominant color back to frontmatter. Keep API URL and parameters in a dedicated config file exported through the existing config barrel.

**Tech Stack:** Astro, TypeScript, pnpm, `tsx`, `glob`, `gray-matter`, Node `fetch`.

---

### Task 1: Config Surface

**Files:**
- Create: `src/types/img2color.ts`
- Create: `src/config/img2colorConfig.ts`
- Modify: `src/types/config.ts`
- Modify: `src/config/index.ts`

- [ ] **Step 1: Add config type**

Create `src/types/img2color.ts`:

```ts
export type Img2ColorAlgorithm = "mediancut" | "kmeans";
export type Img2ColorFormat = "hex" | "rgb" | "hsl" | "cmyk";

export type Img2ColorConfig = {
	enable: boolean;
	apiUrl: string;
	params: {
		format?: Img2ColorFormat;
		colors?: number;
		maxWidth?: number;
		skipBackground?: boolean;
		algorithm?: Img2ColorAlgorithm;
	};
	timeoutMs: number;
	concurrency: number;
};
```

- [ ] **Step 2: Add default config**

Create `src/config/img2colorConfig.ts`:

```ts
import type { Img2ColorConfig } from "../types/config";

export const img2colorConfig: Img2ColorConfig = {
	enable: true,
	apiUrl: "https://img2color-go-jade.vercel.app/api",
	params: {
		format: "hex",
		colors: 1,
		maxWidth: 400,
		skipBackground: false,
		algorithm: "mediancut",
	},
	timeoutMs: 15000,
	concurrency: 3,
};
```

- [ ] **Step 3: Export type and config**

Add `export type { Img2ColorConfig } from "./img2color";` to `src/types/config.ts`.
Add `export { img2colorConfig } from "./img2colorConfig";` to `src/config/index.ts`.

### Task 2: Build Script

**Files:**
- Create: `scripts/fill-post-colors.ts`
- Modify: `package.json`

- [ ] **Step 1: Implement scanner and API caller**

Create `scripts/fill-post-colors.ts` with these behaviors:
- Scan `src/content/posts/**/*.{md,mdx}`.
- Use `gray-matter` to read and write frontmatter.
- Treat missing `color`, `null`, and blank strings as empty.
- Only process `image` values that are strings starting with `http://` or `https://`.
- Skip local or missing images with a warning.
- Build the API URL with configured params plus `img`.
- Read `data.dominant` from the JSON response.
- Validate the dominant color as a non-empty string.
- Continue on per-file errors and fail the process only if configuration is invalid.

- [ ] **Step 2: Wire into build**

Update `package.json` build command from:

```json
"build": "node scripts/generate-ai-summary.js && node scripts/generate-icons.js && npx tsx scripts/generate-lqips.ts && astro build && npx tsx scripts/subset-fonts.ts && pagefind --site dist"
```

to:

```json
"build": "node scripts/generate-ai-summary.js && node scripts/generate-icons.js && npx tsx scripts/generate-lqips.ts && npx tsx scripts/fill-post-colors.ts && astro build && npx tsx scripts/subset-fonts.ts && pagefind --site dist"
```

### Task 3: Verification

**Files:**
- Verify: `scripts/fill-post-colors.ts`
- Verify: `src/config/img2colorConfig.ts`
- Verify: `src/types/img2color.ts`

- [ ] **Step 1: Run static checks**

Run: `pnpm check`
Expected: `0 errors`, `0 warnings`, `0 hints`.

- [ ] **Step 2: Run formatter**

Run: `pnpm format`
Expected: no unrelated fixes; if formatting changes only touched files, keep them.

- [ ] **Step 3: Inspect diff**

Run: `git diff -- package.json scripts/fill-post-colors.ts src/config/img2colorConfig.ts src/config/index.ts src/types/config.ts src/types/img2color.ts`
Expected: changes only implement the build color fill feature.
