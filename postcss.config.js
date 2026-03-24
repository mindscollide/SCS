/**
 * PostCSS Configuration
 * ---------------------
 * PostCSS is a CSS transformation tool. Vite runs PostCSS automatically
 * on every CSS file. We only need two plugins here:
 *
 *  1. tailwindcss  — generates utility classes from your HTML/JSX
 *  2. autoprefixer — adds vendor prefixes (-webkit-, -moz-, etc.) for
 *                    cross-browser support
 *
 * No extra configuration needed for a standard Tailwind + Vite project.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
