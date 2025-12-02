import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import eslint from '@eslint/js';
import jestPlugin from 'eslint-plugin-jest';
import globals from 'globals';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: importPlugin,
      jest: jestPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      '@typescript-eslint': typescriptPlugin,
    },
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.jest,
        React: 'readonly'
      },
    },
    rules: {
      // 'no-undef': 'off', // Disable no-undef for TypeScript files

      // React rules
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,

      // Accessibility rules
      ...jsxA11yPlugin.configs.recommended.rules,

      // Import rules
      ...importPlugin.configs.recommended.rules,

      // TypeScript rules
      ...typescriptPlugin.configs.recommended.rules,

      // React-specific rules
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react-hooks/rules-of-hooks': 'error', // Enforce Hooks rules
      'react-hooks/exhaustive-deps': 'warn', // Warn about missing dependencies in useEffect

      // Formatting rules
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1, maxBOF: 0 }],
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'only-multiline'],
      'object-curly-spacing': ['error', 'always'],
      // 'arrow-parens': ['error', 'always'],
      'max-len': ['warn', { code: 200 }],
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      // 'padding-line-between-statements': [
      //     'error',
      //     { blankLine: 'always', prev: 'interface', next: 'class' }, // Require a blank line between interface and class
      //     { blankLine: 'never', prev: 'interface', next: 'interface' }, // Disallow multiple blank lines between interfaces
      // ],
    },
    settings: {
      'import/resolver': {
        typescript: createTypeScriptImportResolver({
          project: './tsconfig.json',
          alwaysTryTypes: true,
        }),
      },
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.{test,spec}.{js,jsx,ts,tsx}, setupTests.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      }
    },
  }
];
