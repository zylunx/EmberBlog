# Pagination Page Jump Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a desktop pagination control that expands from `>>` into a numeric page input and navigates to the requested valid static page.

**Architecture:** Put input normalization in a browser-safe utility, tested with the repository's existing `tsx` plus `node:assert` convention. Keep markup, CSS, and browser events in `Pagination.astro`; do not change mobile pagination.

**Tech Stack:** Astro, TypeScript, plain CSS, Node `assert`, pnpm, tsx.

---

## File Structure

- Create: `src/utils/pagination-utils.ts` - normalize user-provided page input.
- Create: `scripts/test-pagination-page-jump.ts` - focused assertions.
- Modify: `src/components/common/Pagination.astro` - desktop jump UI and navigation.

### Task 1: Page Input Normalization

**Files:**
- Create: `scripts/test-pagination-page-jump.ts`
- Create: `src/utils/pagination-utils.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-pagination-page-jump.ts`:

```ts
import assert from "node:assert/strict";
import { normalizePageInput } from "../src/utils/pagination-utils";

assert.deepEqual(normalizePageInput("12abc03", 99), { value: "99", page: 99 });
assert.deepEqual(normalizePageInput("0008", 10), { value: "8", page: 8 });
assert.deepEqual(normalizePageInput("000", 10), { value: "", page: null });
assert.deepEqual(normalizePageInput("15", 8), { value: "8", page: 8 });
```

- [ ] **Step 2: Run the test to verify it fails**

Run `pnpm exec tsx scripts/test-pagination-page-jump.ts`.

Expected: it fails because the utility and export do not exist.

- [ ] **Step 3: Write the minimal implementation**

Create `src/utils/pagination-utils.ts`:

```ts
export interface NormalizedPageInput {
	value: string;
	page: number | null;
}

export function normalizePageInput(value: string, lastPage: number): NormalizedPageInput {
	const normalizedValue = value.replace(/\D/g, "").replace(/^0+/, "");
	if (!normalizedValue) return { value: "", page: null };

	const page = Math.min(Number.parseInt(normalizedValue, 10), lastPage);
	return { value: String(page), page };
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run `pnpm exec tsx scripts/test-pagination-page-jump.ts`.

Expected: exits with status `0` and no assertion output.

- [ ] **Step 5: Commit the tested utility**

Run `git add src/utils/pagination-utils.ts scripts/test-pagination-page-jump.ts`, then commit with `feat: add pagination page input normalization`.

### Task 2: Desktop Jump Control

**Files:**
- Modify: `src/components/common/Pagination.astro`
- Test: `scripts/test-pagination-page-jump.ts`

- [ ] **Step 1: Add a failing component expectation**

Append to `scripts/test-pagination-page-jump.ts`:

```ts
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/common/Pagination.astro", "utf8");
assert.match(source, /class="page-jump-control"/);
assert.match(source, /normalizePageInput/);
assert.match(source, /inputmode="numeric"/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run `pnpm exec tsx scripts/test-pagination-page-jump.ts`.

Expected: it fails because `Pagination.astro` has no jump control.

- [ ] **Step 3: Implement the desktop control and browser behavior**

In `src/components/common/Pagination.astro`, import `normalizePageInput` from `@/utils/pagination-utils`. After the desktop next-page link, render this control using `url(getPageUrl(1))` and `url("/__PAGE__/")` as route templates:

```astro
<div
  class="page-jump-control"
  data-first-page-url={url(getPageUrl(1))}
  data-page-url-template={url("/__PAGE__/")}
  data-last-page={page.lastPage}
>
  <span class="page-jump-control__label" aria-hidden="true">&gt;&gt;</span>
  <input class="page-jump-control__input" type="text" inputmode="numeric" pattern="[0-9]*" aria-label="跳转页码" />
</div>
```

Add scoped CSS with a collapsed width of `2.75rem`, an expanded width of `8rem` on `:hover` and `:focus-within`, and a width transition. The input is hidden and non-interactive until expansion. Its changing width remains in the existing desktop flex row, moving preceding items left while consuming free space to the right.

Add a module script initialized on `astro:page-load`. On `input`, use `normalizePageInput` and write back `value`, including the maximum page number when the input exceeds it. On Enter, use its `page`; do nothing for `null`, otherwise assign `window.location.href` to the first-page URL for page `1`, or replace `__PAGE__` in the page URL template.

- [ ] **Step 4: Run the focused test to verify it passes**

Run `pnpm exec tsx scripts/test-pagination-page-jump.ts`.

Expected: exits with status `0` and verifies value normalization plus component markers.

- [ ] **Step 5: Run project validation and formatting**

Run `pnpm check`, then `pnpm format`, then `pnpm check` again.

Expected: both checks exit with status `0`; formatter changes only files under `src`.

- [ ] **Step 6: Inspect the scoped diff and commit**

Inspect `src/components/common/Pagination.astro`, `src/utils/pagination-utils.ts`, and `scripts/test-pagination-page-jump.ts`; add only those files, then commit with `feat: add pagination page jump control`.
