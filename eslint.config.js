import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  prettier,
  {
    rules: {
      // Audio state lives outside React by design: fresh-closure refs and the
      // per-instance `m.ext` bag. The compiler rules cannot see that boundary.
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
    },
  },
);
