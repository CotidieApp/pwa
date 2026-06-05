import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'coverage/**',
    'node_modules/**',
    '.gradle-user-home/**',
    'android/.gradle/**',
    'android/build/**',
    'android/app/build/**',
    'android/app/src/main/assets/**',
    'tmp/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
  {
    files: [
      'src/components/ThemeManager.tsx',
      'src/components/Timer.tsx',
    ],
    rules: {
      'react-hooks/rules-of-hooks': 'warn',
    },
  },
  {
    files: [
      'src/components/main/MainApp.tsx',
    ],
    rules: {
      'react-hooks/immutability': 'warn',
    },
  },
])