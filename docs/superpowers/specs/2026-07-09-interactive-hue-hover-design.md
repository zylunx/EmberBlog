# Interactive Hue Hover Design

## Goal

Update rounded rectangular interactive elements so their hover state uses the configured hue color, becomes a pill shape, turns text and icons white, and gently pushes nearby elements away.

## Scope

Apply the effect to shared interactive styles:

- `.btn-plain`
- `.btn-card`
- `.btn-regular`
- `.dropdown-item`
- `expand-animation` pseudo-background used by scale animation buttons

Do not apply the effect to non-button surfaces such as cards, inputs, progress bars, active pagination indicators, or decorative backgrounds.

## Current Context

The project centralizes most reusable interaction styles in `src/styles/main.css`. Navigation buttons already use `.btn-plain scale-animation rounded-lg`, but `src/styles/navbar.css` currently overrides navbar button hover and active states to transparent backgrounds. That override blocks the requested visible hue hover.

## Design

Add root-level interaction variables in `src/styles/main.css`:

- `--interactive-hue-bg`: hue-based hover background
- `--interactive-hue-bg-active`: hue-based active background
- `--interactive-pill-radius`: pill radius
- `--interactive-hover-gap`: small layout expansion amount

Update shared button classes so hover states use these variables. Hovered items should:

- Use the hue background.
- Use `border-radius: 9999px`.
- Set foreground color to white so text and icon components inherit white.
- Add slight horizontal margin so neighboring inline or flex items move away.

Keep active states visually related but slightly darker. Preserve existing active scale behavior where components already define it.

For `.btn-plain.scale-animation`, update `expand-animation::before` so the pseudo-background uses the same hue and pill radius. This keeps the existing animation model and avoids rewriting navigation components.

In `src/styles/navbar.css`, remove or replace the transparent navbar hover override so navbar buttons can inherit the shared interaction behavior.

## Testing

Run:

```bash
pnpm check
```

Manually inspect the navigation bar and at least one dropdown/pagination/button area if a dev server is already running or practical to start.

## Risks

The hover gap changes layout by design. The gap should stay small to avoid noticeable navigation jitter or wrapping on narrow widths.
