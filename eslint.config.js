import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    /*
     * The context modules deliberately export a Provider component alongside
     * the hook that reads it — AuthProvider with useAuthContext, and so on.
     *
     * only-export-components objects because Fast Refresh cannot hot-reload a
     * module that exports both; it does a full reload instead. Satisfying it
     * means splitting each context into two files, one holding the context
     * object and hook and one holding the Provider, and updating every import.
     * That is a real cost paid for a development-time refresh convenience, on
     * a pairing that is the ordinary way to write a context.
     *
     * So this is off here, and only here. It stays on for every other file,
     * where exporting a non-component from a component module usually is an
     * accident.
     */
    files: ['src/contexts/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  }
);
