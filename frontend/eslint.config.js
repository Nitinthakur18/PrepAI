import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Standard "fetch data on mount" / "read from localStorage on mount"
      // patterns used throughout this app trigger this rule; it's safe here.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Context files intentionally export both the Provider component and
    // its companion hook (e.g. useAuth) from the same file - a standard,
    // valid pattern that this rule doesn't need to flag.
    files: ['**/context/**/*.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
