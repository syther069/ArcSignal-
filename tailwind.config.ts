import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#020817',
        surface: '#0a1628',
        card: '#0f1f38',
        elevated: '#162040',
        accent: '#38bdf8',
        'accent-dark': '#1d4ed8',
        follow: '#34d399',
        fade: '#f87171',
        'text-primary': '#f8fafc',
        'text-secondary': '#cbd5e1',
        'text-muted': '#64748b',
        football: '#38bdf8',
        crypto: '#818cf8',
      },
      fontFamily: {
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
