module.exports = {
  presets: ['module:@react-native/babel-preset'],

  plugins: [
    '@babel/plugin-transform-export-namespace-from',

    [
      'module-resolver',
      {
        root: ['./'],
        extensions: [
          '.ios.js',
          '.android.js',
          '.js',
          '.jsx',
          '.ios.ts',
          '.android.ts',
          '.ts',
          '.ios.tsx',
          '.android.tsx',
          '.tsx',
          '.json',
        ],
        alias: {
          '@': './src',
          '@app': './src/app',
          '@config': './src/config',
          '@constants': './src/constants',
          '@theme': './src/theme',
          '@assets': './src/assets',
          '@shared': './src/features/shared',
          '@api': './src/api',
          '@services': './src/services',
          '@store': './src/store',
          '@rbac': './src/rbac',
          '@navigation': './src/navigation',
          '@app-types': './src/types',
          '@features': './src/features',
          '@components': './src/components',
          '@mocks': './src/mocks',
        },
      },
    ],

    'react-native-worklets/plugin',
  ],
};