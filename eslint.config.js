// eslint.config.js
//
// PINNED: eslint@^9 (NOT 10) — @react-native/eslint-config@0.86.2 only
// declares support for eslint ^8||^9. Verified via:
//   npm view @react-native/eslint-config@0.86.2 peerDependencies
// Re-check this pin when bumping @react-native/eslint-config.
//
// ft-flow/* disabled — this project is TypeScript, not Flow. The rule
// crashes under ESLint 9 (removed context.getAllComments API,
// see eslint/eslint#18826) when it activates on any .js file.

const reactNativeConfig = require('@react-native/eslint-config/flat');
const importX = require('eslint-plugin-import-x');
const { createTypeScriptImportResolver } = require('eslint-import-resolver-typescript');

module.exports = [
  ...reactNativeConfig,
  importX.flatConfigs.recommended,
  { ignores: ['node_modules/**', 'android/**', 'ios/**', 'coverage/**'] },
  {
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ project: './tsconfig.json', alwaysTryTypes: true }),
      ],
    },
    rules: {
      'import-x/namespace': 'off',
      'import-x/named': 'off',
      'ft-flow/define-flow-type': 'off',
      'ft-flow/use-flow-type': 'off',
    },
  },
];