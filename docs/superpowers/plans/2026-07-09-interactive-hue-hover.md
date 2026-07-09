# Interactive Hue Hover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update shared interactive hover styles to use hue-colored pill backgrounds with white foregrounds and a small layout push effect.

**Architecture:** Keep the implementation centralized in existing root CSS utilities. `src/styles/main.css` owns reusable interactive styles, while `src/styles/navbar.css` must stop forcing navbar hover backgrounds to transparent.

**Tech Stack:** Astro, Tailwind CSS v4, plain CSS, pnpm.

---

## File Structure

- Modify `src/styles/main.css`: add root interaction variables and update shared interactive utilities/classes.
- Modify `src/styles/navbar.css`: remove the navbar-specific transparent hover override so shared styles apply.

### Task 1: Shared Interactive Hover CSS

**Files:**
- Modify: `src/styles/main.css`

- [ ] **Step 1: Add shared interaction variables**

Add this near the existing global `html` rule in `src/styles/main.css`:

```css
:root {
    --interactive-hue-bg: oklch(0.68 0.18 var(--hue));
    --interactive-hue-bg-active: oklch(0.60 0.18 var(--hue));
    --interactive-pill-radius: 9999px;
    --interactive-hover-gap: 0.125rem;
}
```

- [ ] **Step 2: Update `expand-animation`**

Replace the existing `@utility expand-animation` block in `src/styles/main.css` with:

```css
@utility expand-animation {
  position: relative;
  z-index: 0;
  transition:
    color 0.18s ease-out,
    margin 0.18s ease-out,
    border-radius 0.18s ease-out;
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--interactive-pill-radius);
    scale: 0.85;
    z-index: -10;
    transition: all 0.15s ease-out;
  }
  &:hover {
    color: white;
    border-radius: var(--interactive-pill-radius);
    margin-inline: var(--interactive-hover-gap);
  }
  &:hover::before {
    background-color: var(--interactive-hue-bg);
    scale: 1;
  }
  &:active::before {
    background-color: var(--interactive-hue-bg-active);
  }
  &:active {
    background: none;
  }
}
```

- [ ] **Step 3: Update shared button classes**

In `@layer components`, replace the `.btn-card`, `.btn-plain`, `.current-theme-btn`, `.btn-regular`, and `.dropdown-item` style blocks with:

```css
    .btn-card {
        @apply transition-all duration-150 flex items-center justify-center bg-(--card-bg)
        active:bg-(--interactive-hue-bg-active);
        &:hover {
            background-color: var(--interactive-hue-bg);
            border-radius: var(--interactive-pill-radius);
            color: white;
            margin-inline: var(--interactive-hover-gap);
        }
    }
    .btn-card.disabled {
        @apply pointer-events-none text-black/10 dark:text-white/10
    }
    .btn-plain {
        @apply transition-all duration-150 relative flex items-center justify-center bg-none
        text-black/75 dark:text-white/75;
        &:hover {
            color: white;
            border-radius: var(--interactive-pill-radius);
            margin-inline: var(--interactive-hover-gap);
        }
        &:not(.scale-animation) {
            &:hover {
                background-color: var(--interactive-hue-bg);
            }
            &:active {
                background-color: var(--interactive-hue-bg-active);
            }
        }
        &.scale-animation {
            @apply expand-animation;
        }
    }
    .current-theme-btn {
        @apply text-white;
        background-color: var(--interactive-hue-bg);
        border-radius: var(--interactive-pill-radius);
    }
    .btn-regular {
        @apply transition-all duration-150 flex items-center justify-center bg-(--btn-regular-bg)
        active:bg-(--interactive-hue-bg-active) text-(--btn-content) dark:text-white/75;
        &:hover {
            background-color: var(--interactive-hue-bg);
            border-radius: var(--interactive-pill-radius);
            color: white;
            margin-inline: var(--interactive-hover-gap);
        }
    }
```

Replace the existing `.dropdown-item` block with:

```css
    .dropdown-item {
        @apply flex items-center justify-between px-4 py-2.5 text-black/75 dark:text-white/75 transition-all duration-150 font-medium;
        &:hover {
            background-color: var(--interactive-hue-bg);
            border-radius: var(--interactive-pill-radius);
            color: white;
            margin-inline: var(--interactive-hover-gap);
        }
    }
```

- [ ] **Step 4: Run CSS validation**

Run:

```bash
pnpm check
```

Expected: command completes with no Astro or CSS errors.

### Task 2: Navbar Override Cleanup

**Files:**
- Modify: `src/styles/navbar.css`

- [ ] **Step 1: Remove transparent navbar hover override**

Delete this block from the end of `src/styles/navbar.css`:

```css
#navbar .btn-plain:hover,
#navbar .btn-plain:active {
    background: transparent !important;
}
```

- [ ] **Step 2: Run project check**

Run:

```bash
pnpm check
```

Expected: command completes with no errors.

- [ ] **Step 3: Inspect git diff**

Run:

```bash
git diff -- src/styles/main.css src/styles/navbar.css
```

Expected: diff only changes shared interactive styles and removes the navbar hover override.
