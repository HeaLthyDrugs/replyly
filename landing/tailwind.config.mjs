/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FAFAF8',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F4F0',
          subtle: '#EDECE7',
          dark: '#141413',
          darker: '#0C0C0B',
        },
        border: {
          subtle: '#EAE9E4',
          DEFAULT: '#DFDED8',
          strong: '#C8C7C0',
          dark: '#262624',
        },
        ink: {
          DEFAULT: '#121210',
          secondary: '#484742',
          muted: '#73726B',
          faint: '#9E9D95',
          inverse: '#FAFAF8',
        },
        brand: {
          coral: '#D65A3C',
          terracotta: '#F4A261',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"Geist Mono"',
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.025em',
        snug: '-0.015em',
      },
      lineHeight: {
        display: '1.08',
      },
    },
  },
  plugins: [],
};
