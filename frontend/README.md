> Last updated: 2026-05-10 00:00

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Design System

The frontend follows the **Claude warm-editorial design system**. Spec:
[`docs/superpowers/specs/2026-05-10-claude-design-system-restyle-design.md`](../docs/superpowers/specs/2026-05-10-claude-design-system-restyle-design.md).

- **Tokens** live in `src/styles/tokens.css` as CSS custom properties
  (`:root` for light, `.dark` for dark) and are exposed to Tailwind v4
  via `@theme` in `src/index.css`.
- **Fonts**: Fraunces (display, peso 400 + opsz axis) for headings,
  Inter (400/500/600) for body and UI. Loaded from Google Fonts
  with `display=swap` and preconnect.
- **Primitives** in `src/components/ui/`: `Button`, `Badge`, `CalloutCard`,
  `SurfacePanel`, `PageHeader`, `ScreenHeader`, `PillTabs`, `NavButton`,
  `StatCard`, `FilterSelect`, plus state primitives.
- **Palette**: `bg-canvas` (#faf9f5) + `bg-primary` (coral, #cc785c) +
  `bg-surface-dark` (navy, #181715) form the trinity. Coral is reserved
  for primary CTAs, `Badge variant="coral"`, and `CalloutCard` (max one
  per page).
- **Out of scope**: gradient surfaces, indigo/purple/blue palettes,
  dramatic shadows, serif weights >400, glassmorphism, hover effects
  beyond background darkening on the primary button.

Last updated: 2026-05-10
