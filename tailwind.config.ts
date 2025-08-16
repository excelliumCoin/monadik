import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/pages/**/*.{ts,tsx}', // kullanıyorsan
  ],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [],
};
export default config;
