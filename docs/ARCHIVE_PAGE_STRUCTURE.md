# Archive Page Structure Overview

This document describes the architecture and rendering flow of the **Archive** page in the `my‑blog` project (`src/pages/archive.astro`).  It is intended for developers who need to understand or modify the archive view.

---

## 1. Entry point – `src/pages/archive.astro`

```astro
---
import ArchivePanel from "@components/controls/ArchivePanel.svelte";
import ArchiveHeatmap from "@components/widget/ArchiveHeatmap.astro";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import MainGridLayout from "@layouts/MainGridLayout.astro";
import PageTitle from "@/components/common/PageTitle.astro";
import { getSortedPostsList } from "@/utils/content-utils";

const sortedPostsList = await getSortedPostsList();
const title = i18n(I18nKey.archive);
---

<MainGridLayout title={title}>
  <div class="flex w-full rounded-(--radius-large) overflow-hidden relative min-h-32">
    <div class="card-base z-10 px-4 py-6 md:px-9 relative w-full">
      <div class="mb-8">
        <PageTitle title={title} eyebrow="Archive" variant="stacked" />
      </div>
      <ArchiveHeatmap posts={sortedPostsList} />
      <ArchivePanel sortedPosts={sortedPostsList} client:load />
    </div>
  </div>
</MainGridLayout>
```

### Key points
* **Layout** – The page is wrapped by `MainGridLayout`, which provides the common header/nav/footer and the page‑wide CSS grid.
* **Data** – `getSortedPostsList()` (from `src/utils/content-utils.ts`) fetches every post, sorts it by date, and is passed to both the heat‑map widget and the archive panel.
* **Components**
  * `ArchiveHeatmap` – a visual heat‑map widget rendered server‑side (`.astro`).
  * `ArchivePanel` – the interactive, client‑side Svelte component that renders the year/month hierarchy and the post list.
* **Styling** – The container uses Tailwind‑like utility classes that map to the project's design tokens (e.g., `--radius-large`).

---

## 2. `ArchivePanel.svelte`

### 2.1 Public Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tags` | `string[]` | `[]` | Tag filters taken from URL query string.
| `categories` | `string[]` | `[]` | Category filters taken from URL query string.
| `sortedPosts` | `Post[]` | `[]` | The full list of posts (already sorted by date).

### 2.2 Internal State
* `yearGroups: YearGroup[]` – hierarchical data grouped by **year → month → posts**.
* `activeFilters`, `primaryFilter`, `secondaryFilters` – UI filter state derived from URL parameters.
* `filteredPostCount` – number of posts after applying filters.
* `categoryColors: Map<string, string>` – deterministic colour mapping for each post category (uses `categoryColorPalette`).
* Hover/highlight helpers: `hoveredPostId`, `highlightedYear`, `highlightedMonth`, `highlightPathD` (SVG path string).
* DOM references: `panelEl`, `yearBlockRefs`, `monthBlockRefs`, `postRowRefs` (used for geometry calculations).

### 2.3 Core Functions
* **`initializeCategoryColors(posts)`** – populates `categoryColors` based on distinct categories.
* **`groupByYearMonth(posts)`** – builds `YearGroup` hierarchy used for rendering.
* **`computeHighlight(postId)`** – after a hover, calculates an SVG path that draws a curved line from the year node → month node → post node.
* **`onPostEnter / onPostLeave`** – update hover state and trigger `computeHighlight`.
* **`formatDate`, `formatMonth`, `formatFilterValues`, `formatFilterSummary`** – UI helpers for localisation.

### 2.4 Lifecycle (`onMount`)
1. Parse URL query params (`tag`, `category`, `uncategorized`).
2. Build `activeFilters` and decide `primaryFilter` / `secondaryFilters`.
3. Apply the filters to `sortedPosts` → `filtered`.
4. Sort filtered posts by descending publish date.
5. Initialise colour map, compute `yearGroups` via `groupByYearMonth`.
6. Store the resulting `filteredPostCount` for UI summary.

### 2.5 Render Tree (high‑level)
```html
<div class="archive-panel" bind:this={panelEl}>
  <!-- Filter summary (if any) -->
  {#if primaryFilter} … {/if}

  <!-- Year groups -->
  {#each yearGroups as yearGroup}
    <div class="ap-year-block" use:registerYearBlock={yearGroup.year}>
      <div class="ap-year-header"> … </div>
      <div class="ap-months-area">
        {#each yearGroup.months as monthGroup}
          <div class="ap-month-block" use:registerMonthBlock={{year:yearGroup.year, month: monthGroup.month}}>
            <div class="ap-month-header"> … </div>
            <div class="ap-posts-area">
              <ul class="ap-post-list">
                {#each monthGroup.posts as post}
                  <li class="ap-post-row" use:registerPostRow={post.id}>
                    <div class="ap-col">… nodes …</div>
                    <a class="ap-post-link" href={getPostUrlBySlug(post.id)}
                       on:mouseenter={() => onPostEnter(post.id)}
                       on:mouseleave={onPostLeave}>
                      <span class="ap-date">{formatDate(post.data.published)}</span>
                      <span class="ap-post-content">
                        <span class="ap-title">{post.data.title}</span>
                        <span class="ap-meta">…category / tags…</span>
                      </span>
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}

  <!-- Highlight SVG (visible on hover) -->
  {#if highlightPathD}
    <svg class="ap-highlight-svg"><path d={highlightPathD} …/></svg>
  {/if}
</div>
```

### 2.6 Styling Highlights
* Custom CSS variables (`--tw`, `--lc`, `--lh`, etc.) drive spacing and colour.
* Dashed vertical lines for years/months are generated with `::before` pseudo‑elements.
* SVG highlighting draws a smooth curved line with three arc segments (`A r r …`).
* Responsive adjustments hide the timeline SVG on narrow screens (≤ 768 px) to simplify the mobile UI.

---

## 3. `ArchiveHeatmap.astro`
* Not examined in depth here, but it receives the same `sortedPosts` array and renders a heat‑map of post frequency.  The component lives under `src/components/widget/ArchiveHeatmap.astro` and is rendered server‑side during the Astro build.

---

## 4. Interaction Flow (user → DOM)
1. **Page load** – Astro static HTML is streamed.  `ArchivePanel` is hydrated client‑side (`client:load`).
2. **URL filters** – query string (`?tag=...&category=...`) drives the filter state within `onMount`.
3. **Hover** – moving the mouse over a post row triggers `onPostEnter`, which calls `computeHighlight`.  Geometry is read from the DOM refs, and an SVG path is injected to draw the highlight line.
4. **Responsive** – on mobile, the timeline pseudo‑elements and SVG are hidden; the list collapses to a simple vertical stack.

---

## 5. Extensibility Checklist
| Area | What to check before changing |
|------|--------------------------------|
| **Data source** | `getSortedPostsList` – ensure any new fields are added to the sort or filter logic. |
| **Filters** | URL‑parameter parsing (lines 308‑324). Add new filter keys consistently. |
| **Color palette** | `categoryColorPalette` (lines 64‑82). Extending the palette should keep the modulo mapping (`i % palette.length`). |
| **Highlight geometry** | The `computeHighlight` algorithm assumes a fixed node radius (`r = 4`). Changing layout dimensions may require adjusting the calculations. |
| **Responsive breakpoints** | Mobile styles are guarded by `@media (max-width: 768px)`. Add new breakpoints carefully to avoid duplicating pseudo‑element removal. |
| **Accessibility** | All interactive `<a>` elements have `aria-label` set to the post title – keep this when refactoring. |

---

## 6. Summary
* The **Archive page** is a thin Astro wrapper that composes two widgets:
  * `ArchiveHeatmap` – visual density chart.
  * `ArchivePanel` – a rich Svelte component that renders a hierarchical timeline (year → month → post) with filter support and hover‑highlight SVG.
* The component is highly data‑driven; the only runtime dependency is the pre‑computed list of posts.
* Styling relies heavily on Tailwind‑style utility classes and a handful of CSS variables that are defined globally in the site theme.
* Hover interaction is performed entirely in the browser via DOM measurement, so any layout changes must keep element dimensions predictable.

---

*Document created on 2026‑07‑03.*
