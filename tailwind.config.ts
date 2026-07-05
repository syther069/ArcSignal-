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
        "surface-container": "#201f1f",
        "surface-container-highest": "#353534",
        "outline-variant": "#4d4354",
        "inverse-on-surface": "#313030",
        "on-error-container": "#ffdad6",
        "primary-container": "#b76dff",
        "border-subtle": "#1e293b",
        "tertiary-fixed": "#71f8e4",
        "on-primary-fixed-variant": "#6900b3",
        "secondary-container": "#3131c0",
        "on-secondary-fixed-variant": "#2f2ebe",
        "on-primary-fixed": "#2c0051",
        "on-primary": "#490080",
        "on-secondary-container": "#b0b2ff",
        "inverse-primary": "#842bd2",
        "on-primary-container": "#400071",
        "surface-dim": "#131313",
        "text-muted": "#94a3b8",
        "secondary-fixed-dim": "#c0c1ff",
        "on-secondary": "#1000a9",
        "error-container": "#93000a",
        "surface-charcoal": "#0f172a",
        "surface-container-high": "#2a2a2a",
        "primary-fixed-dim": "#ddb7ff",
        "tertiary-container": "#00a392",
        "on-surface": "#e5e2e1",
        "on-tertiary": "#003731",
        "surface": "#131313",
        "on-tertiary-fixed": "#00201c",
        "tertiary-fixed-dim": "#4fdbc8",
        "surface-container-lowest": "#0e0e0e",
        "background": "#131313",
        "outline": "#988d9f",
        "secondary": "#c0c1ff",
        "on-secondary-fixed": "#07006c",
        "inverse-surface": "#e5e2e1",
        "surface-variant": "#353534",
        "primary-fixed": "#f0dbff",
        "surface-container-low": "#1c1b1b",
        "on-error": "#690005",
        "secondary-fixed": "#e1e0ff",
        "on-background": "#e5e2e1",
        "error": "#ffb4ab",
        "background-deep": "#020617",
        "on-surface-variant": "#cfc2d6",
        "surface-bright": "#3a3939",
        "on-tertiary-container": "#00302a",
        "surface-tint": "#ddb7ff",
        "on-tertiary-fixed-variant": "#005048",
        "primary": "#ddb7ff",
        "text-vibrant": "#ffffff",
        "code-highlight": "#e879f9",
        "tertiary": "#4fdbc8"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "gutter": "24px",
        "container-max": "1280px",
        "base": "4px",
        "margin-desktop": "64px",
        "margin-mobile": "16px"
      },
      fontFamily: {
        "body-md": ["var(--font-inter)"],
        "label-caps": ["var(--font-jetbrains-mono)"],
        "headline-xl": ["var(--font-hanken)"],
        "code-sm": ["var(--font-jetbrains-mono)"],
        "headline-lg": ["var(--font-hanken)"],
        "headline-md": ["var(--font-hanken)"],
        "body-lg": ["var(--font-inter)"]
      },
      fontSize: {
        "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
        "label-caps": ["12px", {"lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600"}],
        "headline-xl": ["48px", {"lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
        "code-sm": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
        "headline-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "600"}],
        "headline-md": ["24px", {"lineHeight": "32px", "fontWeight": "600"}],
        "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}]
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
      },
      animation: {
        marquee:    'marquee 40s linear infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
