import type { Config } from 'tailwindcss'

// Toutes les couleurs pointent vers des variables CSS (src/styles/tokens.css) : le thème change sans toucher aux composants.
const v = (name: string) => `var(--${name})`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), 'surface-2': v('surface-2'), line: v('line'), 'line-strong': v('line-strong'),
        ink: v('ink'), 'ink-2': v('ink-2'), 'ink-3': v('ink-3'),
        accent: v('accent'), 'accent-strong': v('accent-strong'), 'accent-soft': v('accent-soft'), 'on-accent': v('on-accent'),
        indigo: v('indigo'), violet: v('violet'), cyan: v('cyan'),
        success: v('success'), 'success-soft': v('success-soft'), warning: v('warning'), 'warning-soft': v('warning-soft'),
        danger: v('danger'), 'danger-soft': v('danger-soft'),
      },
      fontFamily: { sans: ['var(--font-sans)'], display: ['var(--font-display)'] },
      borderRadius: { control: 'var(--r-control)', panel: 'var(--r-panel)', sheet: 'var(--r-sheet)' },
      boxShadow: { panel: 'var(--shadow-panel)', float: 'var(--shadow-float)' },
      transitionTimingFunction: { enter: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    },
  },
  plugins: [],
} satisfies Config
