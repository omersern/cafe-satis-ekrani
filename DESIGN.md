# Webbek WPOS Cafe Design System

## Direction

Webbek WPOS Cafe is a calm, technical operations workspace. It uses beUI's spatial-continuity principles—compact navigation, morphing surfaces, purposeful motion, command access, drawers and clear execution states—without copying beUI's visual identity.

## Foundations

- `src/styles/beui.css` is the final design layer and owns shared design tokens.
- Light and dark themes are balanced separately through the `--edge-*` token family.
- Surfaces use low-contrast borders, restrained elevation and generous whitespace.
- The accent color is reserved for selection, focus and primary actions.
- Controls use 40 px minimum height; frequently touched surfaces target 44 px or more.

## Layout

- Desktop uses a 252 px navigation rail, a 72 px collapsed rail and a flexible workspace.
- The content area caps readable dashboard pages at 1480 px while sales and remote-screen workflows can use full width.
- Sidebar location preferences remain supported on every edge.
- At 900 px and below navigation becomes a focusable drawer. At 640 px and below modals become bottom sheets where the existing component structure allows it.

## Components

- Navigation links, profile menu and command palette share the same compact menu language.
- Cards are used for grouped information, not as decoration around every section.
- Buttons, inputs, selects, tabs, tables, modals, toasts and status surfaces share one radius, spacing and focus system.
- Sales, reservations, day management, settings, PIN login, remote screen and messenger surfaces inherit the same tokens.
- Tables use quiet headers, sticky column labels and row hover feedback.
- Modal headers and footers remain stable while the body scrolls.

## Motion

- Quick hover and press feedback uses 140 ms.
- Layout, modal and drawer changes use 220 ms with a smooth spring-like easing curve.
- Modal and menu entrances combine small translation with opacity; distance stays below 10 px.
- `prefers-reduced-motion` reduces all animation and transition durations to effectively zero.

## Accessibility

- All interactive elements receive a visible focus ring.
- Sidebar and profile controls support keyboard activation.
- The command palette opens with Ctrl/Cmd+K and closes with Escape.
- Existing Escape, Enter and Space behavior in operational modals remains intact.
- Color is never the sole focus indicator; selected elements also use surface, outline or inset indicators.

## Engineering Rules

- Keep business logic, API calls, authentication and routes outside the design layer.
- Add new UI through the existing shared classes before introducing one-off styles.
- Use semantic `--edge-*` tokens rather than hardcoded theme colors for new components.
- Do not add a UI dependency unless native React and CSS cannot meet the requirement.
- Build artifacts are created only when explicitly requested.
