import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, jsxA11y.flatConfigs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['@supabase/*'], message: 'Data and auth go through the Go API (src/lib/api, src/lib/auth). Supabase is not used.' }],
      }],
    },
  },
  {
    // Vendored shadcn/ui kit and its hooks: kept as upstream ships them.
    // Our own code (features, app, lib) keeps every rule enabled.
    files: ['src/components/ui/**', 'src/hooks/use-mobile.ts', 'src/hooks/use-toast.ts'],
    rules: {
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'jsx-a11y/heading-has-content': 'off',
      'jsx-a11y/anchor-has-content': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
)
