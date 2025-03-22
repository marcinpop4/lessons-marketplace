# Styling System

This directory contains the core styling system for the application, structured to provide a clean separation between theme variables and component styling.

## Files

- `theme.css`: Contains theme-specific CSS variables for colors, shadows, border radiuses and other design tokens
- `components.css`: Contains reusable component styles that will be applied consistently across the application

## Theme System

The application uses a theme system with three main themes:

1. **Default Theme**: A cool teal color palette
2. **Dark Theme**: An inverted dark mode version of the default theme
3. **Warm Theme**: A warm, pink-based color palette

### How Theming Works

1. Theme definitions are in `frontend/theme/index.ts` with color palettes
2. `ThemeContext.tsx` handles theme switching and applies CSS variables to the root
3. The body `data-theme` attribute is set to the current theme name (e.g., `data-theme="dark"`)
4. Component styles use CSS variables and utility classes based on these themes

### CSS Organization

- **Base styles**: Defined in `index.css`
- **Theme variables**: Defined in `theme.css`
- **Component styles**: Will be added to `components.css`

## Usage

To style components:

1. Use CSS variables like `var(--color-primary-500)` for themable properties
2. Use the attribute selector `[data-theme="dark"]` for theme-specific overrides
3. Use utility classes from Tailwind that reference these CSS variables 