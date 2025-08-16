// eslint.config.mjs — Flat Config
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Next.js varsayılan kurallar (flat-compat ile)
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // Tüm TS/TSX dosyaları için parser + plugin ve "any=error"
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        // type-aware kurallar gerekirse aç:
        // project: ['./tsconfig.json'],
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // UI bileşenleri: TSX içinde "any" derlemeyi durdurmasın (warn) + hooks warn
  {
    files: ['src/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // API route’ları: sıkı tut → "any=error"
  {
    files: ['src/app/**/route.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
