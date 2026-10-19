/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Identité J'aime le Foot — lime / noir, issue du logo.
        // Les valeurs vivent dans globals.css pour que le thème clair/sombre
        // bascule sans recompiler les classes.
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        line: 'var(--line)',
        txt: 'var(--txt)',
        txt2: 'var(--txt2)',
        lime: 'var(--lime)',
        // Encres posées sur les fonds vifs
        ink: '#12140f',
        'ink-gold': '#2a2410',
        live: '#FF3B30',
      },
      fontFamily: {
        display: ['var(--font-chakra)', 'sans-serif'],
        sans: ['var(--font-barlow)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        gold: 'linear-gradient(150deg,#E8C46A 0%,#F6E7B6 30%,#D9B45A 52%,#C99B3B 78%,#F2DFA8 100%)',
        'gold-flat': 'linear-gradient(140deg,#E8C46A,#C99B3B)',
        silver: 'linear-gradient(140deg,#D8DCD6,#9BA298)',
        'lime-fade': 'linear-gradient(140deg,#C6FF00,#7d9c12)',
      },
      animation: {
        shine: 'jlfShine 5s ease-in-out infinite',
        rise: 'jlfRise .35s ease both',
        blip: 'jlfPulse 1.6s infinite',
        bar: 'jlfBar .6s ease both',
      },
      keyframes: {
        jlfShine: {
          '0%': { transform: 'translateX(-120%) rotate(18deg)' },
          '55%,100%': { transform: 'translateX(240%) rotate(18deg)' },
        },
        jlfRise: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'none' },
        },
        jlfPulse: {
          '0%,100%': { opacity: '.35' },
          '50%': { opacity: '1' },
        },
        jlfBar: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
    },
  },
  plugins: [],
}
