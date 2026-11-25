import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dist-itch', 'release', 'node_modules', 'qa-output', 'public'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['tools/**/*', 'tests/**/*'],
    rules: { 'no-console': 'off' },
  },
  {
    // QA scripts mix Node with code that runs inside the browser page.
    files: ['**/*.mjs'],
    rules: { 'no-undef': 'off' },
  },
);
