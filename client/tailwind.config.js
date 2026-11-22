/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Urbanist', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: 'var(--bg)',
        'bg-subtle': 'var(--bg-subtle)',
        surface: 'var(--surface)',
        tile: 'var(--tile)',
        border: 'var(--border)',
        line: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--on-primary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--on-accent)',
        },
        star: 'var(--star)',
        'dark-band': {
          DEFAULT: 'var(--dark-band-bg)',
          text: 'var(--dark-band-text)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      borderRadius: {
        sm: '8px',
        md: '16px',
        lg: '24px',
        pill: '999px',
      },
      maxWidth: {
        container: '1200px',
        reading: '720px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
};
