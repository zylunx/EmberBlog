# Pagination Page Jump Design

## Goal

Add a desktop page-jump control after the final pagination button. It opens into a numeric page input on hover or keyboard focus and navigates to the requested static page.

## Scope

- Modify only `src/components/common/Pagination.astro`.
- Show the control in the desktop pagination layout, after the existing next-page button.
- Do not change the mobile pagination layout, routing convention, dependencies, or unrelated styles.

## Interaction

1. The collapsed control displays `>>`.
2. Hovering the control or focusing it with the keyboard expands it symmetrically into an input field. Its width transition occurs in the existing flex row, moving prior pagination items left and consuming available space to the right.
3. The input accepts only decimal digits. Typing or pasting non-digits removes them from the displayed value. Leading zeroes are removed, and a value above `page.lastPage` is immediately replaced with `page.lastPage`.
4. Pressing Enter with a positive integer navigates to that page. Page `1` uses `/`; all other pages use `/<page>/`.
5. Empty input does not navigate.

## Accessibility And Responsive Behavior

- The control has an accessible label and is keyboard focusable.
- The expanded state also activates through `:focus-within`, so keyboard users can type into the input.
- The control is desktop-only because the requested behavior relies on mouse hover; the existing mobile controls remain unchanged.

## Verification

- Add focused coverage for numeric sanitization and page clamping before implementation.
- Run the focused test through its required red-green cycle.
- Run `pnpm check` and `pnpm format` after the component change.
