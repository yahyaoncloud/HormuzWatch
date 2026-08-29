// Tailwind CSS v4 — configuration is CSS-first via @theme in globals.css
// This file is kept for editor tooling compatibility only.
// All design tokens (colors, fonts, spacing, etc.) live in src/styles/globals.css
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,mdx}', './.storybook/**/*.{js,ts,jsx,tsx}'],
} satisfies Config;
