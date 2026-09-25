/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'var(--app-bg)',
          fg: 'var(--app-fg)',
          muted: 'var(--app-muted)',
          border: 'var(--app-border)',
          card: 'var(--app-card-bg)',
          accent: 'var(--app-accent)',
          hover: 'var(--app-hover)',
        },
        cafe: {
          online: '#107c10',
          offline: '#605e5c',
          busy: '#ca5010',
          locked: '#c42b1c',
        },
      },
      boxShadow: {
        soft: 'var(--app-shadow)',
      },
    },
  },
  plugins: [],
};
