# Dark Mode Design

## Context

The extension currently uses light colors across its user-facing UI. The popup already defines some CSS variables, but the drawer, viewer, history panel, JSON compare page, and standalone JSON window still rely on many hard-coded light backgrounds and text colors. `ReactJson` is also fixed to the light `rjv-default` theme.

This design adds complete dark mode support for all user-visible extension surfaces while preserving the current layout and interaction model.

## Goals

- Add a theme setting with three modes: system, light, and dark.
- Default to system.
- Apply the selected theme consistently across popup, JSON drawer, JSON viewer/editor, history UI, standalone JSON window, and JSON compare page.
- Keep the existing visual hierarchy, controls, and layout.
- Avoid leaking extension theme styles into host web pages.

## Non-Goals

- No theme preview UI.
- No multiple dark palettes.
- No layout redesign.
- No changes to JSON parsing, history behavior, site filtering, keyboard shortcuts, or viewer mode logic.

## Architecture

Add a small shared theme boundary in `src/utils/theme.ts`.

The module will define:

- `ThemeMode`: `system | light | dark`
- `ResolvedTheme`: `light | dark`
- default theme mode: `system`
- storage read/write helpers
- theme resolution from user setting plus `prefers-color-scheme`
- DOM application helper that sets `document.documentElement.dataset.theme`
- initializer that listens to storage and system theme changes and returns a cleanup function

All extension entry points will use the same module:

- `popup.tsx`
- content script or drawer initialization path
- `json-window.tsx`
- `json-compare.tsx`

The DOM contract is:

```html
<html data-theme="light">
<html data-theme="dark">
```

CSS should use variables wherever practical. Existing variables in `main.css` can be expanded and mirrored for other surfaces.

## Components And Data Flow

The popup settings panel will expose a theme select with:

- Follow system
- Light
- Dark

When the user changes the select:

1. `popup.tsx` updates local React state.
2. The selected `ThemeMode` is saved to `chrome.storage.local`.
3. Open extension pages receive `chrome.storage.onChanged`.
4. Each page resolves the effective theme and updates `data-theme`.
5. If the setting is `system`, pages also react to `prefers-color-scheme` changes.

Required code touch points:

- `src/config/storageKeys.ts`: add a theme storage key.
- `src/utils/i18n.ts`: add English and Chinese labels for the theme setting and options.
- `src/popup/SettingsPanel.tsx`: add the theme select.
- `src/popup.tsx`: load, save, and apply theme mode.
- `src/components/jsonViewer/JsonViewerShell.tsx`: choose a light or dark `ReactJson` theme based on the resolved theme.
- `src/components/JsonEditorWrapper.tsx`: ensure `vanilla-jsoneditor` inherits or receives dark styling.
- CSS files for popup, drawer, viewer, history, compare, and standalone window: replace hard-coded light colors with theme tokens or scoped dark overrides.

## Styling Strategy

Dark mode will preserve the current design language. It will change color tokens, not structure.

Core tokens should cover:

- page background
- surface background
- soft surface background
- elevated surface background
- primary text
- muted text
- border
- primary action
- hover states
- danger, success, and warning states
- focus ring
- shadows
- scrollbars

The popup will continue to use its existing variable names where possible, with dark values under `[data-theme="dark"]`.

The drawer and viewer styles will be scoped to extension classes such as `.json-drawer`, `.json-viewer-container`, `.history-container`, and `.json-tree-container`. Host page generic selectors should be avoided.

`ReactJson` should use `rjv-default` in light mode and a readable dark theme such as `monokai` or `ocean` in dark mode. The final choice can be adjusted during implementation based on visual quality.

`vanilla-jsoneditor` should be handled with scoped theme overrides if its default styles do not fully inherit the extension tokens.

The compare page needs dark-safe diff colors:

- additions: muted green background with readable green text
- deletions: muted red background with readable red text
- modifications: muted yellow background with readable amber text

## Error Handling And Compatibility

The theme module should be defensive:

- If `chrome.storage` is unavailable, fall back to `system`.
- If `matchMedia` is unavailable, resolve `system` as `light`.
- If storage contains an invalid value, fall back to `system`.
- Listener setup should return cleanup functions to avoid duplicate listeners in React-mounted pages.

Theme changes must not affect existing stored values for hover detection, display mode, default viewer mode, site filters, or JSON history.

Content-script styles must remain scoped to extension UI and JSON highlight classes. The theme system should not set broad global styles on host pages.

## Testing

Automated verification:

- Run `npm run build`.

Manual verification:

- Popup shows the theme selector with all three options.
- Selected theme persists after closing and reopening the popup.
- `system` follows OS/browser color scheme.
- `light` forces light styling even when the system is dark.
- `dark` forces dark styling even when the system is light.
- Already-open extension surfaces update after theme changes.
- JSON drawer, viewer tree, editor mode, history UI, standalone JSON window, and compare page are readable in dark mode.
- Existing light mode still looks close to the current UI.

## Implementation Boundaries

This feature is a single implementation unit. It should not be split into separate specs because the theme setting and the UI surfaces need a shared storage key, shared resolution logic, and consistent CSS tokens.

Implementation should avoid unrelated refactors. Only touch files needed for theme state, theme application, i18n, and color styling.
